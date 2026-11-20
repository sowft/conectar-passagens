"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ConfigurarPage() {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch("/api/setup").then(async response => {
      if (!response.ok) throw new Error("Configuracao disponivel apenas no servidor local de desenvolvimento.");
      setAvailable((await response.json()).available);
    }).catch(error => setError(error.message)).finally(() => setLoading(false));
  }, []);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (password !== confirmation) { setError("As senhas precisam ser iguais."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPassword(""); setConfirmation(""); setSaved(true); setAvailable(false);
    } catch (error) { setError(error instanceof Error ? error.message : "Falha ao salvar a senha."); }
    finally { setSaving(false); }
  }
  const inputClass = "mt-2 w-full rounded-lg border border-zinc-300 p-3 text-zinc-950";
  return <main className="grid min-h-screen place-items-center bg-[#fafaf7] p-5 text-zinc-950"><section className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
    <p className="text-sm font-bold text-[#9d1f16]">Conectar Passagens</p><h1 className="mt-2 text-2xl font-black">Configurar acesso local</h1>
    {loading ? <p className="mt-4">Verificando configuracao...</p> : saved ? <p role="status" className="mt-4">Senha criada. Volte para entrar, deixe o e-mail vazio e use a senha que voce escolheu.</p> : available ? <><p className="mt-4 text-sm text-zinc-600">Crie a senha do administrador neste computador. O banco de clientes sera configurado separadamente.</p><form onSubmit={save} className="mt-5 grid gap-4"><label className="text-sm font-bold">Nova senha<input className={inputClass} type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={password} onChange={event => setPassword(event.target.value)} /></label><label className="text-sm font-bold">Confirmar senha<input className={inputClass} type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label><button disabled={saving} className="rounded-lg bg-[#9d1f16] p-3 font-bold text-white disabled:opacity-50">{saving ? "Salvando..." : "Criar senha de acesso"}</button></form></> : !error ? <p className="mt-4">O acesso ja foi configurado. Use sua senha para entrar.</p> : null}
    {error && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}<Link href="/" className="mt-5 block text-center font-bold text-[#9d1f16]">Voltar para entrar</Link>
  </section></main>;
}
