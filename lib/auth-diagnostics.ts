export async function inspectAccountConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { available: false };
  try {
    const response = await fetch(new URL("/auth/v1/settings", url), { headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return { available: false, configured: true, keyAccepted: false, reason: "Nao foi possivel validar a chave publica do Supabase." };
    const settings = await response.json();
    const emailEnabled = settings.external?.email === true;
    return { available: emailEnabled, configured: true, keyAccepted: true, emailEnabled, signupEnabled: settings.disable_signup !== true };
  } catch { return { available: false, configured: true, keyAccepted: false, reason: "Nao foi possivel conectar ao Supabase agora." }; }
}

export function accountEmailError(error: { code?: string; status?: number }, fallback: string) {
  if (error.status === 429 || ["over_email_send_rate_limit", "over_request_rate_limit"].includes(error.code ?? "")) return "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
  if (error.code === "email_address_not_authorized") return "O envio de e-mail para novos destinatarios ainda nao foi liberado. Solicite ajuda ao responsavel pelo aplicativo.";
  if (error.code === "signup_disabled" || error.code === "email_provider_disabled") return "O cadastro por e-mail esta desativado no momento. Solicite ajuda ao responsavel pelo aplicativo.";
  return fallback;
}
