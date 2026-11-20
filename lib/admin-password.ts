import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function encodeAdminPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function hasAdminPassword() {
  return Boolean(process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_HASH);
}

export function verifyAdminPassword(password: string) {
  const encoded = process.env.ADMIN_PASSWORD_HASH;
  if (encoded) {
    const [algorithm, salt, hash] = encoded.split(":");
    if (algorithm !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(hash ?? "")) return false;
    return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, "hex"));
  }
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const providedBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}
