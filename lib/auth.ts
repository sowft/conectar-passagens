import { createHash } from "node:crypto";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(email: string, password: string) {
  return createHash("sha256")
    .update(`${normalizeEmail(email)}:${password}`)
    .digest("hex");
}
