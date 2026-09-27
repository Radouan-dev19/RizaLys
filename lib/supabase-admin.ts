export class SupabaseConfigurationError extends Error {}

export function getSupabaseAdminConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) {
    throw new SupabaseConfigurationError("Supabase n’est pas configuré.");
  }
  return { url: url.replace(/\/$/, ""), secretKey };
}

export async function supabaseAdminFetch(path: string, init: RequestInit = {}) {
  const { url, secretKey } = getSupabaseAdminConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", secretKey);
  if (!secretKey.startsWith("sb_secret_")) {
    headers.set("Authorization", `Bearer ${secretKey}`);
  }
  if (init.body) headers.set("Content-Type", "application/json");

  return fetch(`${url}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
