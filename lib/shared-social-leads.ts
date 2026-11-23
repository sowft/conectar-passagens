import { database } from "@/lib/server-db";
import { Lead } from "@/lib/leads";
import { leadPostUrl } from "@/lib/social-leads";

// Only the administrator's ownerless public-post collection is shared.
// Never return private phones, statuses, notes, consent or campaign records.
export async function sharedSocialLeads(): Promise<Lead[]> {
  const { data, error } = await database().from("leads")
    .select("id::text,nome,origem,destino,fonte,created_at,observacoes")
    .is("campaign_id", null)
    .is("consentimento_em", null)
    .in("fonte", ["Facebook - pedido publico", "Instagram - pedido publico"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).flatMap(row => {
    const url = leadPostUrl(row.observacoes);
    if (!url) return [];
    return [{
      id: row.id, nome: row.nome, origem: row.origem, destino: row.destino,
      fonte: row.fonte, created_at: row.created_at,
      telefone: "", data_viagem: null, status: "novo" as const,
      observacoes: `Publicacao: ${url}\nPedido publico compartilhado. Interesse atual nao confirmado.`,
      somente_leitura: true,
    }];
  });
}

export function mergeVisibleLeads(own: Lead[], shared: Lead[]) {
  const records = new Map(shared.map(lead => [lead.id, lead]));
  for (const lead of own) records.set(lead.id, lead);
  return [...records.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}
