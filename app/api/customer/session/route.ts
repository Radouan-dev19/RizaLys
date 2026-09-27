import {
  CustomerAuthConfigurationError,
  CustomerAuthError,
  getAuthenticatedCustomer,
  requestHasSameOrigin,
  requestCustomerPasswordReset,
  resetCustomerPassword,
  signInCustomer,
  signOutCustomer,
  signUpCustomer,
} from "@/lib/customer-auth";

const attempts = new Map<string, { count: number; resetAt: number }>();
const ATTEMPT_WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function requestIdentifier(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";
}

function validEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null;
}

function loginPassword(value: unknown) {
  return typeof value === "string" && value.length >= 1 && value.length <= 72 ? value : null;
}

function strongPassword(value: unknown) {
  if (typeof value !== "string" || value.length < 12 || value.length > 72) return null;
  if (!/[a-zà-ÿ]/.test(value) || !/[A-ZÀ-Þ]/.test(value) || !/\d/.test(value) || !/[^A-Za-zÀ-ÿ\d\s]/.test(value)) return null;
  return value;
}

function validName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length >= 2 && name.length <= 80 ? name : null;
}

function serviceError(error: unknown) {
  if (error instanceof CustomerAuthConfigurationError) {
    return Response.json({ error: "L’espace client n’est pas encore configuré." }, { status: 503 });
  }
  if (error instanceof CustomerAuthError) {
    return Response.json({ error: error.message }, { status: error.status >= 500 ? 502 : error.status });
  }
  console.error("Customer authentication failed", error);
  return Response.json({ error: "Le service de connexion est temporairement indisponible." }, { status: 503 });
}

export async function GET() {
  try {
    const user = await getAuthenticatedCustomer();
    return Response.json(
      { authenticated: Boolean(user), user },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return serviceError(error);
  }
}

export async function POST(request: Request) {
  if (!requestHasSameOrigin(request)) {
    return Response.json({ error: "Requête refusée." }, { status: 403 });
  }

  const identifier = requestIdentifier(request);
  const now = Date.now();
  const attempt = attempts.get(identifier);
  if (attempt && attempt.resetAt > now && attempt.count >= MAX_ATTEMPTS) {
    return Response.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const action = body.action;
    const email = validEmail(body.email);
    if (action === "forgot") {
      if (!email) return Response.json({ error: "Saisissez une adresse e-mail valide." }, { status: 400 });
      await requestCustomerPasswordReset(email, new URL("/reinitialiser-mot-de-passe", request.url).toString());
      attempts.delete(identifier);
      return Response.json({ sent: true }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (action === "reset") {
      const password = strongPassword(body.password);
      const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";
      if (!password || !accessToken) return Response.json({ error: "Le nouveau mot de passe ne respecte pas les critères de sécurité." }, { status: 400 });
      await resetCustomerPassword(accessToken, password);
      attempts.delete(identifier);
      return Response.json({ reset: true }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (action !== "login" && action !== "register") {
      return Response.json({ error: "Action d’authentification invalide." }, { status: 400 });
    }
    const password = action === "register" ? strongPassword(body.password) : loginPassword(body.password);
    if (!email || !password) {
      return Response.json({ error: action === "register" ? "Utilisez au moins 12 caractères avec majuscule, minuscule, chiffre et symbole." : "Vérifiez l’adresse e-mail et le mot de passe." }, { status: 400 });
    }

    if (action === "login") {
      const user = await signInCustomer(email, password);
      attempts.delete(identifier);
      return Response.json({ authenticated: true, user }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const firstName = validName(body.firstName);
    const lastName = validName(body.lastName);
    if (!firstName || !lastName) {
      return Response.json({ error: "Le prénom et le nom doivent contenir au moins 2 caractères." }, { status: 400 });
    }

    const result = await signUpCustomer({
      email,
      password,
      firstName,
      lastName,
      redirectTo: new URL("/mon-compte?confirmed=1", request.url).toString(),
    });
    attempts.delete(identifier);
    return Response.json({
      authenticated: !result.confirmationRequired,
      confirmationRequired: result.confirmationRequired,
      user: result.user,
    }, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const current = attempts.get(identifier);
    attempts.set(identifier, current && current.resetAt > now
      ? { count: current.count + 1, resetAt: current.resetAt }
      : { count: 1, resetAt: now + ATTEMPT_WINDOW });
    return serviceError(error);
  }
}

export async function DELETE(request: Request) {
  if (!requestHasSameOrigin(request)) {
    return Response.json({ error: "Requête refusée." }, { status: 403 });
  }
  try {
    await signOutCustomer();
    return Response.json({ authenticated: false }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return serviceError(error);
  }
}
