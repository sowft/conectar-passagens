import { createHmac, timingSafeEqual } from "node:crypto";

export type Attribution = { visit_id: string; campaign_id: string; fonte: string; expires: number };
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function signature(payload: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Assinatura de atribuicao indisponivel.");
  return createHmac("sha256", secret).update(`attribution:${payload}`).digest("hex");
}

export function signAttribution(value: Attribution) {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function readAttribution(token: unknown): Attribution | null {
  if (typeof token !== "string" || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !/^[a-f0-9]{64}$/.test(parts[1])) return null;
  try {
    if (!timingSafeEqual(Buffer.from(parts[1]), Buffer.from(signature(parts[0])))) return null;
    const value = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (!uuidPattern.test(value.visit_id) || !uuidPattern.test(value.campaign_id) || typeof value.fonte !== "string" || value.fonte.length > 80 || !Number.isFinite(value.expires) || value.expires <= Date.now()) return null;
    return value;
  } catch { return null; }
}
