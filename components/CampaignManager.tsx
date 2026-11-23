"use client";
import { useEffect, useState } from "react";
import type { Campaign } from "@/lib/campaigns";
import type { Lead } from "@/lib/leads";
type Metric = { campaign_id: string; fonte: string; entradas: number; encaminhamentos: number };
async function fetchMetrics(): Promise<Metric[]> {
  const response = await fetch("/api/campaigns/metrics");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data.metrics;
}

export default function CampaignManager({ leads }: { leads: Lead[] }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState("");
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [metricsError, setMetricsError] = useState("");
  const [refreshing, setRefreshing] = useState(true);
  async function refreshMetrics() {
    setRefreshing(true); setMetricsError("");
    try {
      setMetrics(await fetchMetrics());
    } catch (error) { setMetricsError(error instanceof Error ? error.message : "Falha ao atualizar metricas."); }
    finally { setRefreshing(false); }
  }
  useEffect(() => {
    fetch("/api/campaigns").then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setOrigin(window.location.origin);
      setCampaigns(data.campaigns);
    }).catch(error => setError(error.message)).finally(() => setLoading(false));
    let active = true;
    fetchMetrics().then(result => { if (active) setMetrics(result); })
      .catch(error => { if (active) setMetricsError(error instanceof Error ? error.message : "Falha ao consultar metricas."); })
      .finally(() => { if (active) setRefreshing(false); });
    return () => { active = false; };
  }, []);
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setNotice("Copiado. Pronto para divulgar no canal escolhido."); }
    catch { setError("Nao foi possivel copiar. Selecione e copie o link abaixo."); }
  }
  async function toggle(campaign: Campaign) {
    setBusy(campaign.id); setError("");
    try {
      const response = await fetch("/api/campaigns", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: campaign.id, status: campaign.status === "ativa" ? "pausada" : "ativa" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCampaigns(current => current.map(item => item.id === campaign.id ? data.campaign : item));
    } catch (error) { setError(error instanceof Error ? error.message : "Falha ao atualizar."); }
    finally { setBusy(""); }
  }
  return <div className="grid gap-6">
    <section><p className="text-sm font-bold text-[#9d1f16]">Aquisicao de clientes</p><h2 className="mt-2 text-3xl font-black">Campanhas e prospeccao</h2><p className="mt-3 text-zinc-600">Crie um plano em Prospectar, divulgue os links e acompanhe os interessados por campanha. Publicacao e atendimento sao realizados pela equipe.</p></section>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">{notice}</p>}
    <div className="rounded-lg border bg-white p-4"><button disabled={refreshing} onClick={refreshMetrics} className="font-bold text-[#9d1f16] disabled:opacity-50">{refreshing ? "Atualizando..." : "Atualizar entradas e encaminhamentos"}</button><p className="mt-2 text-sm text-zinc-600">Entradas contam acessos ao link, incluindo repeticoes e possiveis robos. Encaminhamentos contam uma vez por entrada e nao confirmam compras.</p>{metricsError && <p role="alert" className="mt-2 text-red-800">{metricsError}</p>}</div>
    {loading ? <p>Carregando campanhas...</p> : !error && campaigns.length === 0 ? <p className="rounded-lg bg-white p-5">Nenhuma campanha salva. Abra Prospectar para definir publico, regiao e canais.</p> : null}
    {campaigns.map(campaign => {
      const captured = leads.filter(lead => lead.campaign_id === campaign.id);
      const converted = captured.filter(lead => lead.status === "convertido").length;
    const query = encodeURIComponent(`${campaign.publico === "Pessoa fisica" ? "agencias de viagens" : campaign.publico} em ${campaign.regiao}`);
      return <article key={campaign.id} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-black">{campaign.nome}</h3><button disabled={busy === campaign.id} onClick={() => toggle(campaign)} className="rounded-lg border px-4 py-2 disabled:opacity-50">{campaign.status === "ativa" ? "Pausar captacao" : "Reativar captacao"}</button></div>
        <p className="mt-2 text-sm text-zinc-600">{campaign.publico} | {campaign.regiao} | {campaign.perfil} | {campaign.status}</p>
        <p className="mt-4 font-bold">{captured.length} interessados | {converted} vendas informadas pela equipe | {captured.length ? Math.round(converted / captured.length * 100) : 0}% de conversao</p>
        <div className="mt-5 grid gap-4">{campaign.canais.map(channel => {
          const link = `${origin}/r/${campaign.id}?fonte=${encodeURIComponent(channel)}`;
          const metric = metrics.find(item => item.campaign_id === campaign.id && item.fonte === channel);
          const channelLeads = captured.filter(lead => lead.fonte === channel).length;
          const text = `Planejando viajar? A Conectar Passagens ajuda voce a encontrar opcoes de ${campaign.produto.toLowerCase()}. Informe sua rota e receba atendimento: ${link}`;
          return <div key={channel} className="rounded-lg border p-4"><strong>{channel}</strong><p className="mt-2 text-sm">{metricsError ? "Entradas e encaminhamentos indisponiveis" : `${metric?.entradas ?? 0} entradas · ${metric?.encaminhamentos ?? 0} encaminhamentos para compra`} · {channelLeads} interessados</p><p className="mt-2 text-sm">{text}</p><input aria-label={`Link de ${channel}`} readOnly value={link} className="mt-3 w-full rounded border p-2 text-sm" /><div className="mt-3 flex flex-wrap gap-3"><button onClick={() => copy(link)} className="font-bold text-[#9d1f16]">Copiar link</button><button onClick={() => copy(text)} className="font-bold text-[#9d1f16]">Copiar divulgacao</button><a href={link} target="_blank" rel="noreferrer" className="font-bold">Testar link (registra entrada)</a></div></div>;
        })}</div>
        <details className="mt-5 rounded-lg bg-zinc-50 p-4"><summary className="cursor-pointer font-bold">Mapear parceiros e oportunidades na regiao</summary><p className="my-3 text-sm">Pesquise empresas e parceiros em fontes publicas. Avalie a pertinencia do contato e convide interessados a preencher o formulario. A pesquisa abre um servico externo; nenhum contato e coletado automaticamente.</p><a className="font-bold text-[#9d1f16]" href={`https://www.google.com/maps/search/${query}`} target="_blank" rel="noreferrer">Pesquisar parceiros no Google Maps</a></details>
      </article>;
    })}
    <section className="rounded-lg border bg-white p-5"><h3 className="font-black">Canais externos</h3><p className="mt-2 text-sm">Meta Ads e Google Ads ainda precisam de contas e configuracao. Os links acima podem ser usados como destino de anuncios. Uma entrada autenticada para leads externos esta disponivel em /api/integrations/leads para conectar formularios e automacoes da empresa.</p></section>
  </div>;
}
