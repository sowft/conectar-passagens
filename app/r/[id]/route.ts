import { randomUUID } from "node:crypto";
import { database } from "@/lib/server-db";
import { signAttribution, uuidPattern } from "@/lib/attribution";

export async function HEAD() {
  return new Response(null, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) return new Response("Campanha invalida.", { status: 400 });
  try {
    const db = database();
    const { data: campaign, error } = await db.from("campaigns").select("id,status,canais").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!campaign || campaign.status !== "ativa") return new Response("Esta campanha nao esta recebendo solicitacoes.", { status: 410 });
    const fonte = new URL(request.url).searchParams.get("fonte") ?? "";
    if (!campaign.canais.includes(fonte)) return new Response("Canal invalido para esta campanha.", { status: 400 });
    const visit_id = randomUUID();
    const token = signAttribution({ visit_id, campaign_id: id, fonte, expires: Date.now() + 7 * 86400000 });
    const { error: writeError } = await db.from("campaign_visits").insert({ id: visit_id, campaign_id: id, fonte });
    if (writeError) throw writeError;
    const destination = new URL("/captacao", request.url);
    destination.searchParams.set("campanha", id);
    destination.searchParams.set("fonte", fonte);
    destination.searchParams.set("v", token);
    return new Response(null, { status: 302, headers: { Location: destination.toString(), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch {
    return new Response("Captacao temporariamente indisponivel. Tente novamente em instantes.", { status: 503 });
  }
}
