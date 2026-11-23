import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicAppUrl } from "@/lib/public-url";

export function accountAuthConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
}

export function appOrigin(request: Request) {
  return publicAppUrl() ?? new URL(process.env.PUBLIC_APP_URL || request.url).origin;
}

export function accountRedirect(url: string) {
  return new Response(null, { status: 303, headers: { Location: url, "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer" } });
}

export function sameOriginAccountRequest(request: Request) {
  return request.headers.get("origin") === appOrigin(request) && Boolean(request.headers.get("content-type")?.startsWith("application/json")) && request.headers.get("sec-fetch-site") !== "cross-site";
}

export async function accountAuth(remember?: boolean) {
  if (!accountAuthConfigured()) throw new Error("ACCOUNT_AUTH_NOT_CONFIGURED");
  const store = await cookies();
  const persistent = remember ?? store.get("conectar_account_remember")?.value === "sim";
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!, {
    cookieOptions: { name: "conectar_account", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => store.getAll(),
      setAll: values => {
        for (const { name, value, options } of values) {
          const settings = { ...options, httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
          if (value && !persistent) { delete settings.maxAge; delete settings.expires; }
          if (value && persistent) settings.maxAge = 604800;
          store.set(name, value, settings);
        }
      },
    },
  });
}

export async function accountUser() {
  if (!accountAuthConfigured()) return null;
  try {
    const store = await cookies();
    if (!store.getAll().some(cookie => cookie.name.startsWith("conectar_account") && !cookie.name.includes("code-verifier") && cookie.name !== "conectar_account_remember")) return null;
    const { data, error } = await (await accountAuth()).auth.getUser();
    return error ? null : data.user;
  } catch { return null; }
}

export async function clearAccountCookies() {
  const store = await cookies();
  for (const cookie of store.getAll()) if (cookie.name.startsWith("conectar_account")) store.set(cookie.name, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}

export async function setAccountPreference(remember: boolean) {
  const store = await cookies();
  store.set("conectar_account_remember", remember ? "sim" : "nao", { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", ...(remember ? { maxAge: 604800 } : {}) });
  store.set("conectar_admin", "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}
