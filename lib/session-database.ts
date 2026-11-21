import { isAdminAuthenticated } from "@/lib/session";
import { database } from "@/lib/server-db";
import { accountAuth } from "@/lib/account-auth";

export async function sessionDatabase() {
  if (await isAdminAuthenticated()) return database();
  const client = await accountAuth();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  // The public key plus the verified user's JWT enforces per-account RLS.
  return client;
}
