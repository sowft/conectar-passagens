function httpsOrigin(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    // This setting is for a public deployment, never the local development server.
    if (url.protocol !== "https:" || url.username || url.password || !host.includes(".") || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.includes(":")) return null;
    const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4) {
      const first = Number(ipv4[1]); const second = Number(ipv4[2]);
      if (first === 0 || first === 10 || first === 127 || (first === 169 && second === 254) || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168)) return null;
    }
    return url.origin;
  } catch { return null; }
}

export function publicAppUrl(env: Record<string, string | undefined> = process.env) {
  // An explicitly supplied URL takes priority. Invalid explicit values remain a
  // configuration error instead of being silently hidden by the platform fallback.
  if (env.PUBLIC_APP_URL?.trim()) return httpsOrigin(env.PUBLIC_APP_URL.trim());
  for (const name of ["VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"] as const) {
    const host = env[name]?.trim();
    if (!host) continue;
    const origin = httpsOrigin(`https://${host}`);
    if (origin) return origin;
  }
  return null;
}
