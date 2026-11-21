import { accountAuth, accountRedirect, appOrigin, clearAccountCookies, setAccountPreference } from "@/lib/account-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = appOrigin(request);
  const code = url.searchParams.get("code");
  const recovery = url.searchParams.get("next") === "/redefinir-senha";
  if (code) {
    try {
      const client = await accountAuth();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) {
        await setAccountPreference(false);
        if (recovery) return accountRedirect(`${origin}/redefinir-senha?conta=1`);
        await client.auth.signOut({ scope: "local" });
        await clearAccountCookies();
        return accountRedirect(`${origin}/?confirmado=1`);
      }
    } catch { /* Fall through to a safe same-origin error page. */ }
  }
  return accountRedirect(`${origin}/recuperar-senha?erro=link`);
}
