import { sessionCookie } from "@/lib/session";
import { hasAdminPassword } from "@/lib/admin-password";
import { verifyCurrentAdminPassword } from "@/lib/admin-access";
import { accountAuth, accountAuthConfigured, clearAccountCookies, sameOriginAccountRequest, setAccountPreference } from "@/lib/account-auth";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store, private" };
  const body = await request.json().catch(() => null);
  if (!body || typeof body.password !== "string" || body.password.length > 256 || (body.email !== undefined && typeof body.email !== "string")) return Response.json({ error: "Informe e-mail e senha." }, { status: 400, headers });
  const email = (body.email ?? "").trim().toLowerCase();
  if (email) {
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Informe um e-mail valido." }, { status: 400, headers });
    if (!sameOriginAccountRequest(request)) return Response.json({ error: "Solicitacao invalida." }, { status: 403, headers });
    if (!accountAuthConfigured()) return Response.json({ error: "O acesso por e-mail esta temporariamente indisponivel." }, { status: 503, headers });
    try {
      const client = await accountAuth(Boolean(body.remember));
      const { error } = await client.auth.signInWithPassword({ email, password: body.password });
      if (error) return Response.json({ error: error.code === "email_not_confirmed" ? "Confirme seu cadastro pelo link recebido no e-mail antes de entrar." : "E-mail ou senha invalidos. Se necessario, use Esqueci minha senha." }, { status: 401, headers });
      await setAccountPreference(Boolean(body.remember));
      return Response.json({ ok: true }, { headers });
    } catch { return Response.json({ error: "Acesso indisponivel no momento." }, { status: 503, headers }); }
  }
  // The original owner can still use the administrative password with email empty.
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || !hasAdminPassword()) return Response.json({ error: "O acesso administrativo ainda nao foi configurado." }, { status: 503, headers });
  try {
    const admin = await verifyCurrentAdminPassword(body.password);
    if (!admin.valid) return Response.json({ error: "Senha invalida." }, { status: 401, headers });
    await clearAccountCookies();
    return Response.json({ ok: true }, { headers: { ...headers, "Set-Cookie": sessionCookie(Boolean(body.remember), admin.version) } });
  } catch { return Response.json({ error: "Acesso temporariamente indisponivel. Tente novamente mais tarde." }, { status: 503, headers }); }
}
