import { isAuthenticated } from "@/lib/session";
export async function GET() {
  return Response.json({ authenticated: await isAuthenticated() });
}
