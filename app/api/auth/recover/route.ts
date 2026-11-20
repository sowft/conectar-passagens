import { recoveryConfiguration, recoveryMessage, requestPasswordRecovery, sameOriginJson } from "@/lib/password-recovery";

const headers = { "Cache-Control": "no-store" };
export async function GET() {
  return Response.json({ available: Boolean(recoveryConfiguration()) }, { headers });
}
export async function POST(request: Request) {
  if (!sameOriginJson(request)) return Response.json({ error: "Solicitacao invalida. Abra a recuperacao pelo aplicativo." }, { status: 403, headers });
  if (!recoveryConfiguration()) return Response.json({ error: "A recuperacao por e-mail ainda nao foi ativada. Solicite ajuda ao responsavel pelo aplicativo." }, { status: 503, headers });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) return Response.json({ error: "Informe um e-mail valido." }, { status: 400, headers });
  try {
    await requestPasswordRecovery(body.email);
    return Response.json({ message: recoveryMessage }, { headers });
  } catch {
    // Same response for operational failure and unknown address: do not disclose accounts.
    console.error("Nao foi possivel concluir uma solicitacao de recuperacao. Verifique banco e provedor de e-mail.");
    return Response.json({ message: recoveryMessage }, { headers });
  }
}
