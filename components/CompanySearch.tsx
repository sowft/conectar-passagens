"use client";
import { useState } from "react";
type Place = { id: string; displayName?: { text: string }; formattedAddress?: string; nationalPhoneNumber?: string; websiteUri?: string; googleMapsUri?: string; attributions?: { provider: string; providerUri: string }[] };
function safeUrl(value?: string) { return value && /^https?:\/\//i.test(value) ? value : undefined; }
export default function CompanySearch() {
  const [segmento, setSegmento] = useState("empresas de construcao civil");
  const [regiao, setRegiao] = useState("Vitoria, ES");
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  async function search(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setPlaces([]); setSearched(false);
    try {
      const response = await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ segmento, regiao }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPlaces(data.places); setSearched(true);
    } catch (error) { setError(error instanceof Error ? error.message : "Falha ao pesquisar."); }
    finally { setBusy(false); }
  }
  return <section className="rounded-lg border bg-white p-5 shadow-sm">
    <h2 className="text-xl font-black">Encontrar empresas</h2>
    <p className="mt-2 text-sm text-zinc-600">Busque empresas com potencial para viagens de equipes ou parcerias. Um resultado de busca ainda precisa ser qualificado pela equipe.</p>
    <form onSubmit={search} className="mt-4 grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-bold">Segmento<input required maxLength={100} value={segmento} onChange={event => setSegmento(event.target.value)} className="rounded border p-3" /></label><label className="grid gap-1 text-sm font-bold">Cidade ou regiao<input required maxLength={100} value={regiao} onChange={event => setRegiao(event.target.value)} className="rounded border p-3" /></label><button disabled={busy} className="rounded-lg bg-[#9d1f16] p-3 font-bold text-white disabled:opacity-50">{busy ? "Pesquisando..." : "Buscar empresas"}</button><a href={`https://www.google.com/maps/search/${encodeURIComponent(`${segmento} em ${regiao}`)}`} target="_blank" rel="noreferrer" className="p-3 text-center font-bold">Abrir pesquisa no Google Maps</a></form>
    {error && <p role="alert" className="mt-4 rounded bg-amber-50 p-3 text-amber-900">{error}</p>}
    {searched && <div className="mt-5 rounded-lg border p-4"><p translate="no" style={{ fontFamily: "Arial, sans-serif", fontWeight: 400, color: "#5e5e5e", fontSize: 14, whiteSpace: "nowrap" }}>Google Maps</p>{places.length === 0 && <p className="mt-3">Nenhuma empresa encontrada. Tente outro segmento ou regiao.</p>}<div className="mt-3 grid gap-3">{places.map(place => <article key={place.id} className="rounded border p-4"><h3 className="font-black">{place.displayName?.text}</h3><p className="mt-1 text-sm">{place.formattedAddress}</p>{place.nationalPhoneNumber && <p className="mt-2 text-sm">Telefone comercial: {place.nationalPhoneNumber}</p>}<div className="mt-3 flex gap-4">{safeUrl(place.websiteUri) && <a className="font-bold text-[#9d1f16]" href={safeUrl(place.websiteUri)} target="_blank" rel="noreferrer">Site da empresa</a>}{safeUrl(place.googleMapsUri) && <a className="font-bold" href={safeUrl(place.googleMapsUri)} target="_blank" rel="noreferrer">Ver no Google Maps</a>}</div>{place.attributions?.map((attribution, index) => <a key={index} className="mt-2 block text-xs" href={safeUrl(attribution.providerUri)} target="_blank" rel="noreferrer">{attribution.provider}</a>)}</article>)}</div></div>}
    <p className="mt-4 text-sm text-zinc-600">Apos identificar uma oportunidade, converse com a empresa e compartilhe um link da campanha para registrar o interesse e acompanhar no funil.</p>
  </section>;
}
