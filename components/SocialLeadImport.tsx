"use client";

import { useState } from "react";

export default function SocialLeadImport({ onSaved }: { onSaved: () => void }) {
  const [campaigns, setCampaigns] = useState<Array<{ id: string; nome: string }>>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function loadCampaigns() {
    try {
      const response = await fetch("/api/campaigns", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCampaigns(data.campaigns ?? []);
    } catch { setMessage("Nao foi possivel carregar suas campanhas."); }
  }
  return <details className="rounded-lg border border-zinc-200 bg-white p-5" onToggle={event => { if (event.currentTarget.open) void loadCampaigns(); }}>
    <summary className="cursor-pointer font-black text-[#9d1f16]">Adicionar pedido do Facebook ou Instagram</summary>
    <p className="mt-3 text-sm text-zinc-600">Registre pedidos publicos, inclusive antigos. Guarde o link para consultar o contexto. A inclusao e manual.</p>
    <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setMessage("");
      const form = event.currentTarget;
      try {
        const response = await fetch("/api/leads/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setMessage(data.existing ? "Esse pedido ja esta nos leads desta campanha." : "Pedido adicionado aos leads.");
        form.reset(); onSaved();
      } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao salvar."); }
      finally { setBusy(false); }
    }}>
      {[["nome", "Nome publicado", true], ["url", "Link da publicacao", true], ["origem", "Origem (opcional)", false], ["destino", "Destino (opcional)", false], ["data_publicacao", "Data da publicacao (opcional)", false], ["resumo", "Resumo do pedido (opcional)", false]].map(([name, label, required]) => <label key={String(name)} className="grid gap-1 text-sm font-bold">{label}<input name={String(name)} type={name === "url" ? "url" : "text"} required={Boolean(required)} maxLength={name === "resumo" ? 800 : name === "url" ? 1000 : 160} className="rounded-lg border border-zinc-300 p-3 font-normal" /></label>)}
      <label className="grid gap-1 text-sm font-bold">Campanha<select name="campaign_id" className="rounded-lg border border-zinc-300 p-3 font-normal"><option value="">Sem campanha (administrador)</option>{campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.nome}</option>)}</select></label>
      <button disabled={busy} className="self-end rounded-lg bg-[#9d1f16] p-3 font-black text-white disabled:opacity-50">{busy ? "Salvando..." : "Adicionar aos leads"}</button>
      <p role="status" className="text-sm sm:col-span-2">{message}</p>
    </form>
  </details>;
}
