import { isAuthenticated } from "@/lib/session";
import { sessionDatabase } from "@/lib/session-database";

export async function GET() {
  if (!await isAuthenticated()) return Response.json({ error: "Entre para continuar." }, { status: 401 });
  try {
    const { data, error } = await (await sessionDatabase()).rpc("campaign_metrics");
    if (error) throw error;
    return Response.json({ metrics: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Metricas indisponiveis. Confira o banco e a migracao SQL." }, { status: 503 });
  }
}
