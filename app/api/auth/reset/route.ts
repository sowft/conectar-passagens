import { resetAdminPassword, sameOriginJson } from "@/lib/password-recovery";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!sameOriginJson(request)) return Response.json({ error: "Solicitacao invalida." }, { status: 403, headers });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token) || typeof body.password !== "string" || body.password.length < 12 || body.password.length > 256) return Response.json({ error: "Use o link recebido e uma senha entre 12 e 256 caracteres." }, { status: 400, headers });
  try {
    if (!await resetAdminPassword(body.token, body.password)) return Response.json({ error: "Este link expirou ou ja foi utilizado. Solicite outro." }, { status: 400, headers });
    return Response.json({ ok: true }, { headers: { ...headers, "Set-Cookie": "conectar_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure" } });
  } catch { return Response.json({ error: "Nao foi possivel redefinir a senha agora. Tente novamente mais tarde." }, { status: 503, headers }); }
}
