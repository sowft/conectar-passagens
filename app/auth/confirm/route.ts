import { accountAuth, accountRedirect, appOrigin, clearAccountCookies, setAccountPreference } from "@/lib/account-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const origin = appOrigin(request);
  if (token_hash && token_hash.length <= 512 && (type === "recovery" || type === "signup" || type === "email")) {
    try {
      const client = await accountAuth();
      const { error } = await client.auth.verifyOtp({ token_hash, type });
      if (!error) {
        await setAccountPreference(false);
        if (type === "recovery") return accountRedirect(`${origin}/redefinir-senha?conta=1`);
        await client.auth.signOut({ scope: "local" });
        await clearAccountCookies();
        return accountRedirect(`${origin}/?confirmado=1`);
      }
    } catch { /* Never reflect tokens into the redirect. */ }
  }
  return accountRedirect(`${origin}/recuperar-senha?erro=link`);
}
