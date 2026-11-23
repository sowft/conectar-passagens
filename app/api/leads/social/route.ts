import { isAuthenticated, isAdminAuthenticated } from "@/lib/session";
import { sessionDatabase } from "@/lib/session-database";
import { database } from "@/lib/server-db";
import { sameOriginAccountRequest } from "@/lib/account-auth";
import { socialPostUrl } from "@/lib/social-leads";

export async function POST(request: Request) {
  if (!await isAuthenticated()) return Response.json({ error: "Entre para continuar." }, { status: 401 });
  if (!sameOriginAccountRequest(request)) return Response.json({ error: "Origem invalida." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const url = socialPostUrl(body?.url);
  if (!body || !url || typeof body.nome !== "string" || !body.nome.trim() || body.nome.length > 160 ||
      ["origem", "destino", "data_publicacao", "resumo"].some(key => body[key] !== undefined && (typeof body[key] !== "string" || body[key].length > (key === "resumo" ? 800 : 160))) ||
      (body.campaign_id && (typeof body.campaign_id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.campaign_id)))) {
    return Response.json({ error: "Informe nome e link de um post do grupo no Facebook ou de uma publicacao do Instagram." }, { status: 400 });
  }
  try {
    const admin = await isAdminAuthenticated();
    const campaignId = body.campaign_id || null;
    if (!admin && !campaignId) return Response.json({ error: "Selecione uma das suas campanhas." }, { status: 400 });
    const scoped = await sessionDatabase();
    if (campaignId) {
      // Verify access with the user's JWT/RLS before using the server writer.
      const { data, error } = await scoped.from("campaigns").select("id").eq("id", campaignId).maybeSingle();
      if (error || !data) return Response.json({ error: "Campanha indisponivel para sua conta." }, { status: 403 });
    }
    const query = scoped.from("leads").select("id::text,observacoes");
    const scopedQuery = campaignId ? query.eq("campaign_id", campaignId) : query.is("campaign_id", null);
    const escapedUrl = url.replace(/[\\%_]/g, "\\$&");
    const { data: existing, error: readError } = await scopedQuery.like("observacoes", `%Publicacao: ${escapedUrl}\n%`).limit(1);
    if (readError) throw readError;
    if (existing?.length) return Response.json({ ok: true, existing: true });
    const notes = `Publicacao: ${url}\nData da publicacao: ${body.data_publicacao?.trim() || "Nao informada"}\nInteresse publicado; disponibilidade atual e autorizacao de contato nao confirmadas.\n${body.resumo?.trim() || ""}`;
    const { error } = await database().from("leads").insert({
      nome: body.nome.trim(), telefone: "", origem: body.origem?.trim() || "Nao informada",
      destino: body.destino?.trim() || "Nao informado", data_viagem: null,
      fonte: url.includes("www.facebook.com/") ? "Facebook - pedido publico" : "Instagram - pedido publico",
      campaign_id: campaignId, status: "novo", observacoes: notes, consentimento_em: null,
    });
    if (error) throw error;
    return Response.json({ ok: true }, { status: 201 });
  } catch { return Response.json({ error: "Nao foi possivel salvar o pedido. Tente novamente." }, { status: 503 }); }
}
