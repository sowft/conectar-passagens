import { scryptSync, timingSafeEqual } from "node:crypto";
import { database } from "@/lib/server-db";
import { verifyAdminPassword } from "@/lib/admin-password";

// Once enabled, the database is authoritative. Never restore an old environment
// password just because the database is temporarily unavailable.
export function managedAdminEnabled() {
  return Boolean(process.env.ADMIN_RECOVERY_EMAIL);
}

export async function adminAccessState() {
  if (!managedAdminEnabled()) return null;
  const { data, error } = await database().from("admin_access").select("password_hash,version").eq("id", "admin").maybeSingle();
  if (error) throw new Error("ADMIN_ACCESS_UNAVAILABLE");
  return data as { password_hash: string | null; version: string | null } | null;
}

export async function verifyCurrentAdminPassword(password: string) {
  const state = await adminAccessState();
  if (!state?.password_hash) return { valid: verifyAdminPassword(password), version: "" };
  const [algorithm, salt, hash] = state.password_hash.split(":");
  const valid = algorithm === "scrypt" && /^[a-f0-9]{32}$/.test(salt ?? "") && /^[a-f0-9]{128}$/.test(hash ?? "") && timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, "hex"));
  return { valid: Boolean(valid), version: state.version ?? "" };
}
