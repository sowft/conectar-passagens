import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("Configure SESSION_SECRET com pelo menos 32 caracteres.");
  return value;
}
export function sessionCookie(remember: boolean) {
  const expires = String(Date.now() + (remember ? 604800000 : 43200000));
  const signature = createHmac("sha256", secret()).update(expires).digest("hex");
  return `conectar_admin=${expires}.${signature}; Path=/; HttpOnly; SameSite=Lax${remember ? "; Max-Age=604800" : ""}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
export async function isAuthenticated() {
  const token = (await cookies()).get("conectar_admin")?.value ?? "";
  const [expires, signature] = token.split(".");
  if (!/^\d+$/.test(expires ?? "") || Number(expires) <= Date.now() || !/^[a-f0-9]{64}$/.test(signature ?? "")) return false;
  const expected = createHmac("sha256", secret()).update(expires).digest("hex");
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
