import { accountAuth, accountUser, clearAccountCookies } from "@/lib/account-auth";

export async function POST() {
  try {
    if (await accountUser()) await (await accountAuth()).auth.signOut({ scope: "local" });
    await clearAccountCookies();
  } catch { /* Always clear the administrative cookie too. */ }
  return Response.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store, private",
        "Set-Cookie": [
          "conectar_admin=",
          "Path=/",
          "HttpOnly",
          "SameSite=Lax",
          "Max-Age=0",
        ].join("; "),
      },
    },
  );
}
