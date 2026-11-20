import { readAttribution } from "@/lib/attribution";
import { database } from "@/lib/server-db";
import { purchaseUrl } from "@/lib/leads";

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const token = form?.get("v");
  const attribution = readAttribution(token);
  if (token && !attribution) return new Response("Link expirado ou invalido. Abra novamente o link da campanha.", { status: 400 });
  if (attribution) {
    try {
      const { error } = await database().from("purchase_clicks").upsert({ visit_id: attribution.visit_id }, { onConflict: "visit_id", ignoreDuplicates: true });
      if (error) throw error;
    } catch {
      return new Response("Nao foi possivel registrar o encaminhamento. Tente novamente.", { status: 503 });
    }
  }
  return new Response(null, { status: 303, headers: { Location: purchaseUrl, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
