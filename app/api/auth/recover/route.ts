import { recoveryConfiguration, recoveryMessage, requestPasswordRecovery, sameOriginJson } from "@/lib/password-recovery";
import { accountAuth, accountAuthConfigured, appOrigin, sameOriginAccountRequest } from "@/lib/account-auth";

const headers = { "Cache-Control": "no-store" };
export async function GET() {
  return Response.json({ available: accountAuthConfigured() }, { headers });
}
export async function POST(request: Request) {
  if (!sameOriginAccountRequest(request)) return Response.json({ error: "Solicitacao invalida. Abra a recuperacao pelo aplicativo." }, { status: 403, headers });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) return Response.json({ error: "Informe um e-mail valido." }, { status: 400, headers });
  if (body.mode !== "admin") {
    if (!accountAuthConfigured()) return Response.json({ error: "O envio de recuperacao esta temporariamente indisponivel. Tente novamente mais tarde." }, { status: 503, headers });
    try {
      const client = await accountAuth();
      const { error } = await client.auth.resetPasswordForEmail(body.email.trim().toLowerCase(), { redirectTo: `${appOrigin(request)}/auth/callback?next=/redefinir-senha` });
      if (error) return Response.json({ error: error.status === 429 || error.code === "over_email_send_rate_limit" ? "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." : "Nao foi possivel enviar agora. Tente novamente mais tarde." }, { status: 503, headers });
      return Response.json({ message: "Se houver uma conta com esse e-mail, voce recebera um link para redefinir sua senha. Confira tambem a caixa de spam." }, { headers });
    } catch { return Response.json({ error: "Nao foi possivel enviar agora. Tente novamente mais tarde." }, { status: 503, headers }); }
  }
  if (!sameOriginJson(request) || !recoveryConfiguration()) return Response.json({ error: "Recuperacao administrativa indisponivel." }, { status: 503, headers });
  try {
    await requestPasswordRecovery(body.email);
    return Response.json({ message: recoveryMessage }, { headers });
  } catch {
    // Same response for operational failure and unknown address: do not disclose accounts.
    console.error("Nao foi possivel concluir uma solicitacao de recuperacao. Verifique banco e provedor de e-mail.");
    return Response.json({ message: recoveryMessage }, { headers });
  }
}
