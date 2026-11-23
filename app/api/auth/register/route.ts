import { accountAuth, accountAuthConfigured, appOrigin, sameOriginAccountRequest, setAccountPreference } from "@/lib/account-auth";
import { ACCOUNT_PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
import { accountEmailError } from "@/lib/auth-diagnostics";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store, private" };
  if (!sameOriginAccountRequest(request)) return Response.json({ error: "Solicitacao invalida." }, { status: 403, headers });
  if (!accountAuthConfigured()) return Response.json({ error: "O cadastro esta temporariamente indisponivel. Tente novamente mais tarde." }, { status: 503, headers });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.nome !== "string" || !body.nome.trim() || body.nome.length > 160 || typeof body.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) || typeof body.password !== "string" || body.password.length < ACCOUNT_PASSWORD_MIN_LENGTH || body.password.length > 256) return Response.json({ error: `Informe nome, e-mail valido e uma senha de pelo menos ${ACCOUNT_PASSWORD_MIN_LENGTH} caracteres.` }, { status: 400, headers });
  try {
    const client = await accountAuth(Boolean(body.remember));
    const { data, error } = await client.auth.signUp({ email: body.email.trim().toLowerCase(), password: body.password, options: { data: { nome: body.nome.trim() }, emailRedirectTo: `${appOrigin(request)}/auth/callback` } });
    if (error) return Response.json({ error: accountEmailError(error, "Nao foi possivel cadastrar agora. Confira os dados ou tente recuperar sua senha.") }, { status: 400, headers });
    if (data.session) await setAccountPreference(Boolean(body.remember));
    return Response.json({ ok: true, requiresConfirmation: !data.session, message: "Confira seu e-mail para confirmar o cadastro e depois entre com sua senha." }, { status: 201, headers });
  } catch { return Response.json({ error: "Cadastro indisponivel no momento. Tente novamente mais tarde." }, { status: 503, headers }); }
}
