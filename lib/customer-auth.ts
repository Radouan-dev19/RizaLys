import { cookies } from "next/headers";

export const CUSTOMER_ACCESS_COOKIE = "rizalys_customer_access";
export const CUSTOMER_REFRESH_COOKIE = "rizalys_customer_refresh";

export class CustomerAuthConfigurationError extends Error {}

export class CustomerAuthError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export type CustomerUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

type AuthUserResponse = {
  id?: unknown;
  email?: unknown;
  user_metadata?: unknown;
};

type AuthSessionResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  user?: AuthUserResponse | null;
};

type CustomerSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: CustomerUser;
};

function getAuthConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new CustomerAuthConfigurationError("L’espace client n’est pas configuré.");
  }
  return { url: url.replace(/\/$/, ""), publishableKey };
}

function authHeaders(accessToken?: string) {
  const { publishableKey } = getAuthConfig();
  const headers = new Headers({ apikey: publishableKey, "Content-Type": "application/json" });
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return headers;
}

function normalizeUser(user: AuthUserResponse | null | undefined): CustomerUser | null {
  if (!user || typeof user.id !== "string" || typeof user.email !== "string") return null;
  const metadata = typeof user.user_metadata === "object" && user.user_metadata !== null
    ? user.user_metadata as Record<string, unknown>
    : {};
  return {
    id: user.id,
    email: user.email,
    firstName: typeof metadata.first_name === "string" ? metadata.first_name : "",
    lastName: typeof metadata.last_name === "string" ? metadata.last_name : "",
  };
}

function normalizeSession(data: AuthSessionResponse): CustomerSession | null {
  const user = normalizeUser(data.user);
  if (typeof data.access_token !== "string" || typeof data.refresh_token !== "string" || !user) return null;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : 3600,
    user,
  };
}

async function responseMessage(response: Response, fallback: string) {
  try {
    const body = await response.json() as { msg?: unknown; message?: unknown; error_description?: unknown };
    const message = body.msg ?? body.message ?? body.error_description;
    return typeof message === "string" ? message : fallback;
  } catch {
    return fallback;
  }
}

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  priority: "high" as const,
};

async function storeCustomerSession(session: CustomerSession) {
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_ACCESS_COOKIE, session.accessToken, {
    ...baseCookieOptions,
    maxAge: Math.max(60, session.expiresIn),
  });
  cookieStore.set(CUSTOMER_REFRESH_COOKIE, session.refreshToken, {
    ...baseCookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_ACCESS_COOKIE, "", { ...baseCookieOptions, maxAge: 0 });
  cookieStore.set(CUSTOMER_REFRESH_COOKIE, "", { ...baseCookieOptions, maxAge: 0 });
}

export async function signInCustomer(email: string, password: string) {
  const { url } = getAuthConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!response.ok) {
    const providerMessage = await responseMessage(response, "Connexion impossible.");
    if (/confirm|verified/i.test(providerMessage)) {
      throw new CustomerAuthError("Confirmez d’abord votre adresse e-mail depuis le message envoyé par RizaLys.", 403);
    }
    if (response.status === 429) {
      throw new CustomerAuthError("Trop de tentatives. Réessayez dans quelques minutes.", 429);
    }
    throw new CustomerAuthError("Adresse e-mail ou mot de passe incorrect.", response.status);
  }
  const session = normalizeSession(await response.json() as AuthSessionResponse);
  if (!session) throw new CustomerAuthError("La session reçue est invalide.", 502);
  await storeCustomerSession(session);
  return session.user;
}

export async function signUpCustomer(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  redirectTo: string;
}) {
  const { url } = getAuthConfig();
  const response = await fetch(`${url}/auth/v1/signup?redirect_to=${encodeURIComponent(input.redirectTo)}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      data: { first_name: input.firstName, last_name: input.lastName },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const providerMessage = await responseMessage(response, "Impossible de créer ce compte.");
    const alreadyExists = /already|registered|exists/i.test(providerMessage);
    throw new CustomerAuthError(alreadyExists ? "Un compte existe déjà avec cette adresse e-mail." : "Impossible de créer ce compte.", response.status);
  }

  const data = await response.json() as AuthSessionResponse;
  const session = normalizeSession(data);
  if (session) {
    await storeCustomerSession(session);
    return { user: session.user, confirmationRequired: false };
  }
  const user = normalizeUser(data.user);
  return { user, confirmationRequired: true };
}

export async function requestCustomerPasswordReset(email: string, redirectTo: string) {
  const { url } = getAuthConfig();
  const response = await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email }),
    cache: "no-store",
  });
  if (!response.ok && response.status !== 429) {
    throw new CustomerAuthError("Impossible d’envoyer l’e-mail de réinitialisation.", response.status);
  }
  if (response.status === 429) throw new CustomerAuthError("Trop de demandes. Réessayez dans quelques minutes.", 429);
}

export async function resetCustomerPassword(accessToken: string, password: string) {
  const { url } = getAuthConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    method: "PUT",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ password }),
    cache: "no-store",
  });
  if (!response.ok) throw new CustomerAuthError("Ce lien est invalide ou a expiré. Demandez un nouvel e-mail.", 400);
}

async function verifyAccessToken(accessToken: string) {
  const { url } = getAuthConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (!response.ok) return null;
  return normalizeUser(await response.json() as AuthUserResponse);
}

async function refreshCustomerSession(refreshToken: string) {
  const { url } = getAuthConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  return normalizeSession(await response.json() as AuthSessionResponse);
}

export async function getAuthenticatedCustomer() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(CUSTOMER_ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(CUSTOMER_REFRESH_COOKIE)?.value;

  if (accessToken) {
    const user = await verifyAccessToken(accessToken);
    if (user) return user;
  }

  if (refreshToken) {
    const session = await refreshCustomerSession(refreshToken);
    if (session) {
      await storeCustomerSession(session);
      return session.user;
    }
  }

  if (accessToken || refreshToken) await clearCustomerSession();
  return null;
}

export async function signOutCustomer() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(CUSTOMER_ACCESS_COOKIE)?.value;
  if (accessToken) {
    try {
      const { url } = getAuthConfig();
      await fetch(`${url}/auth/v1/logout`, {
        method: "POST",
        headers: authHeaders(accessToken),
        cache: "no-store",
      });
    } catch {
      // The local session must still be cleared if Supabase is temporarily unavailable.
    }
  }
  await clearCustomerSession();
}

export function requestHasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
