"use client";
import { useEffect, useState } from "react";

type Check = { name: string; ok: boolean; detail: string };
type Operation = { captureReady: boolean; checks: Check[]; optional: { name: string; detail: string }[] };
async function fetchOperation(): Promise<Operation> {
  const response = await fetch("/api/operation");
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

export default function OperationStatus() {
  const [data, setData] = useState<Operation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function refresh() {
    setLoading(true); setError("");
    try {
      setData(await fetchOperation());
    } catch (error) { setError(error instanceof Error ? error.message : "Nao foi possivel verificar a operacao."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    fetchOperation().then(result => { if (active) setData(result); })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : "Falha ao verificar a operacao."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">Ativacao da operacao</h2><button disabled={loading} onClick={refresh} className="font-bold text-[#9d1f16] disabled:opacity-50">{loading ? "Verificando..." : "Verificar novamente"}</button></div>
    {error && <p role="alert" className="mt-3 text-red-800">{error}</p>}
    {!loading && !error && data && <><p className="mt-3 font-bold">{data.captureReady ? "Verificacoes tecnicas de captacao aprovadas. Valide o fluxo publico antes de divulgar." : "Existem pendencias para ativar a captacao publica."}</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{data.checks.map(check => <div key={check.name} className="rounded border p-3"><p className="font-bold">{check.ok ? "OK" : "Pendente"} · {check.name}</p><p className="mt-1 text-sm text-zinc-600">{check.detail}</p></div>)}</div><details className="mt-4"><summary className="cursor-pointer font-bold">Canais e fechamento de vendas</summary>{data.optional.map(item => <p key={item.name} className="mt-2 text-sm"><strong>{item.name}:</strong> {item.detail}</p>)}</details></>}
  </section>;
}
