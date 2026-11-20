import { database } from "@/lib/server-db";
import { readAttribution } from "@/lib/attribution";

export async function captureLead(body: unknown) {
  if (!body || typeof body !== "object") return Response.json({ error: "Dados invalidos." }, { status: 400 });
  const input = body as Record<string, unknown>;
  const attribution = readAttribution(input.attribution_token);
  if (input.attribution_token && !attribution) return Response.json({ error: "Link expirado ou invalido. Abra novamente o link da campanha." }, { status: 400 });
  const fields = ["nome", "telefone", "origem", "destino", "data_viagem"] as const;
  if (!fields.every(key => typeof input[key] === "string" && (input[key] as string).trim().length > 0 && (input[key] as string).length <= 160) || input.consentimento !== true) {
    return Response.json({ error: "Preencha os dados e autorize o contato para continuar." }, { status: 400 });
  }
  const phone = (input.telefone as string).replace(/\D/g, "");
  const date = input.data_viagem as string;
  if (phone.length < 10 || phone.length > 15 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    return Response.json({ error: "Informe um telefone e uma data validos." }, { status: 400 });
  }
  const campaignId = attribution?.campaign_id ?? (input.campaign_id || null);
  if (campaignId !== null && (typeof campaignId !== "string" || !/^[a-f0-9-]{36}$/i.test(campaignId))) return Response.json({ error: "Link de campanha invalido." }, { status: 400 });
  try {
    const db = database();
    if (campaignId) {
      const { data, error } = await db.from("campaigns").select("id, status").eq("id", campaignId).maybeSingle();
      if (error) throw error;
      if (!data || data.status !== "ativa") return Response.json({ error: "Esta campanha nao esta recebendo solicitacoes. Entre em contato com a empresa." }, { status: 409 });
    }
    const { error } = await db.from("leads").insert({
      nome: (input.nome as string).trim(), telefone: phone,
      origem: (input.origem as string).trim(), destino: (input.destino as string).trim(),
      data_viagem: date, fonte: attribution?.fonte ?? (typeof input.fonte === "string" ? input.fonte.trim().slice(0, 80) || "Landing Page" : "Landing Page"),
      visit_id: attribution?.visit_id ?? null,
      campaign_id: campaignId, consentimento_em: new Date().toISOString(), status: "novo",
    });
    if (error) throw error;
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: "Captacao indisponivel no momento. A equipe precisa verificar a configuracao do banco." }, { status: 503 });
  }
}
