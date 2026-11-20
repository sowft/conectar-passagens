import { isAuthenticated } from "@/lib/session";
import { database } from "@/lib/server-db";

export async function GET() {
  if (!await isAuthenticated()) return Response.json({ error: "Entre para continuar." }, { status: 401 });
  try {
    const { data, error } = await database().rpc("campaign_metrics");
    if (error) throw error;
    return Response.json({ metrics: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Metricas indisponiveis. Confira o banco e a migracao SQL." }, { status: 503 });
  }
}
