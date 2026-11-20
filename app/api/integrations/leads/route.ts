import { timingSafeEqual } from "node:crypto";
import { captureLead } from "@/lib/intake";

export async function POST(request: Request) {
  const secret = process.env.LEAD_INGEST_TOKEN;
  if (!secret || secret.length < 32) return Response.json({ error: "Integracao nao configurada." }, { status: 503 });
  const provided = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (Buffer.byteLength(provided) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return Response.json({ error: "Token invalido." }, { status: 401 });
  return captureLead(await request.json().catch(() => null));
}
