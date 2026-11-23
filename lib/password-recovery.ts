import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { database } from "@/lib/server-db";
import { encodeAdminPassword } from "@/lib/admin-password";
import { publicAppUrl } from "@/lib/public-url";

export const recoveryMessage = "Se o e-mail corresponder ao acesso administrativo, voce recebera as instrucoes. Confira tambem o spam. Aguarde um minuto antes de tentar novamente.";
export function recoveryConfiguration() {
  try {
    const origin = new URL(publicAppUrl() ?? "");
    const email = process.env.ADMIN_RECOVERY_EMAIL?.trim().toLowerCase();
    if (origin.protocol !== "https:" || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL || !process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) return null;
    return { origin: origin.origin, email, key: process.env.RESEND_API_KEY, from: process.env.RESEND_FROM_EMAIL };
  } catch { return null; }
}

export function digestRecoveryToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordRecovery(email: string) {
  const config = recoveryConfiguration();
  if (!config) throw new Error("RECOVERY_NOT_CONFIGURED");
  // A generic response for every syntactically valid address avoids exposing membership.
  const supplied = Buffer.from(digestRecoveryToken(email.trim().toLowerCase()));
  if (!timingSafeEqual(supplied, Buffer.from(digestRecoveryToken(config.email)))) return;
  const token = randomBytes(32).toString("hex");
  const { data, error } = await database().rpc("request_admin_recovery", { p_token_hash: digestRecoveryToken(token) });
  if (error) throw new Error("RECOVERY_DATABASE_UNAVAILABLE");
  if (data !== true) return;
  const link = new URL("/redefinir-senha", config.origin);
  link.hash = new URLSearchParams({ token }).toString();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", "Idempotency-Key": `password-recovery-${digestRecoveryToken(token)}` },
    body: JSON.stringify({ from: config.from, to: [config.email], subject: "Redefinir senha | Conectar Passagens", text: `Recebemos uma solicitacao para redefinir sua senha de acesso administrativo.\n\nAbra este link em ate 30 minutos:\n${link.href}\n\nO link funciona uma unica vez. Se voce nao solicitou, ignore esta mensagem. A senha atual continua valida ate a redefinicao.` }),
  });
  if (!response.ok) throw new Error("RECOVERY_EMAIL_UNAVAILABLE");
}

export async function resetAdminPassword(token: string, password: string) {
  if (!recoveryConfiguration()) throw new Error("RECOVERY_NOT_CONFIGURED");
  const tokenHash = digestRecoveryToken(token);
  // Avoid expensive password hashing for random or already expired tokens.
  const { data: pending, error: pendingError } = await database().from("admin_access").select("id").eq("id", "admin").eq("token_hash", tokenHash).gt("token_expires", new Date().toISOString()).maybeSingle();
  if (pendingError) throw new Error("RECOVERY_DATABASE_UNAVAILABLE");
  if (!pending) return false;
  const { data, error } = await database().rpc("consume_admin_recovery", {
    p_token_hash: tokenHash, p_password_hash: encodeAdminPassword(password),
  });
  if (error) throw new Error("RECOVERY_DATABASE_UNAVAILABLE");
  return data === true;
}

export function sameOriginJson(request: Request) {
  const origin = request.headers.get("origin");
  const configured = recoveryConfiguration();
  const allowedOrigin = configured?.origin ?? new URL(request.url).origin;
  return Boolean(origin && origin === allowedOrigin && request.headers.get("content-type")?.startsWith("application/json") && !["cross-site", "same-site"].includes(request.headers.get("sec-fetch-site") ?? ""));
}
