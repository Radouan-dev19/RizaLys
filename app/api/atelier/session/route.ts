import { cookies } from "next/headers";
import {
  BACKOFFICE_COOKIE,
  backofficeCookieOptions,
  createBackofficeSession,
  requestHasSameOrigin,
  verifyBackofficePassword,
} from "@/lib/backoffice-auth";

const attempts = new Map<string, { count: number; resetAt: number }>();
const ATTEMPT_WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function requestIdentifier(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";
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

  let password = "";
  try {
    const body = await request.json() as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!process.env.BACKOFFICE_PASSWORD_HASH || !process.env.BACKOFFICE_SESSION_SECRET) {
    return Response.json({ error: "L’accès atelier n’est pas encore configuré." }, { status: 503 });
  }

  if (!verifyBackofficePassword(password)) {
    const nextAttempt = attempt && attempt.resetAt > now
      ? { count: attempt.count + 1, resetAt: attempt.resetAt }
      : { count: 1, resetAt: now + ATTEMPT_WINDOW };
    attempts.set(identifier, nextAttempt);
    return Response.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  attempts.delete(identifier);
  const session = createBackofficeSession();
  if (!session) return Response.json({ error: "L’accès atelier n’est pas configuré." }, { status: 503 });

  (await cookies()).set(BACKOFFICE_COOKIE, session, backofficeCookieOptions);
  return Response.json({ authenticated: true });
}

export async function DELETE(request: Request) {
  if (!requestHasSameOrigin(request)) {
    return Response.json({ error: "Requête refusée." }, { status: 403 });
  }

  (await cookies()).set(BACKOFFICE_COOKIE, "", { ...backofficeCookieOptions, maxAge: 0 });
  return Response.json({ authenticated: false });
}
