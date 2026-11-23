import { resetAdminPassword, sameOriginJson } from "@/lib/password-recovery";
import { accountAuth, clearAccountCookies, sameOriginAccountRequest } from "@/lib/account-auth";
import { ACCOUNT_PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

export async function GET() {
  try {
    const { data, error } = await (await accountAuth()).auth.getUser();
    return Response.json({ authenticated: !error && Boolean(data.user) }, { headers: { "Cache-Control": "no-store, private" } });
  } catch { return Response.json({ authenticated: false }, { headers: { "Cache-Control": "no-store, private" } }); }
}

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const body = await request.json().catch(() => null);
  if (body?.mode === "account") {
    if (!sameOriginAccountRequest(request)) return Response.json({ error: "Solicitacao invalida." }, { status: 403, headers });
    if (typeof body.password !== "string" || body.password.length < ACCOUNT_PASSWORD_MIN_LENGTH || body.password.length > 256) return Response.json({ error: `Use uma senha entre ${ACCOUNT_PASSWORD_MIN_LENGTH} e 256 caracteres.` }, { status: 400, headers });
    try {
      const client = await accountAuth();
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) return Response.json({ error: "O link expirou. Solicite outro link de recuperacao." }, { status: 401, headers });
      const { error: updateError } = await client.auth.updateUser({ password: body.password });
      if (updateError) return Response.json({ error: "Nao foi possivel alterar. Escolha uma senha diferente ou solicite outro link." }, { status: 400, headers });
      await client.auth.signOut({ scope: "global" });
      await clearAccountCookies();
      return Response.json({ ok: true }, { headers });
    } catch { return Response.json({ error: "Nao foi possivel redefinir agora. Tente novamente mais tarde." }, { status: 503, headers }); }
  }
  if (!sameOriginJson(request)) return Response.json({ error: "Solicitacao invalida." }, { status: 403, headers });
  if (!body || typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token) || typeof body.password !== "string" || body.password.length < 12 || body.password.length > 256) return Response.json({ error: "Use o link recebido e uma senha entre 12 e 256 caracteres." }, { status: 400, headers });
  try {
    if (!await resetAdminPassword(body.token, body.password)) return Response.json({ error: "Este link expirou ou ja foi utilizado. Solicite outro." }, { status: 400, headers });
    return Response.json({ ok: true }, { headers: { ...headers, "Set-Cookie": "conectar_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure" } });
  } catch { return Response.json({ error: "Nao foi possivel redefinir a senha agora. Tente novamente mais tarde." }, { status: 503, headers }); }
}
