"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function RecoverPasswordPage() {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/auth/recover", { cache: "no-store" }).then(response => response.json()).then(data => {
      if (active) setAvailable(data.available === true);
    }).catch(() => { if (active) setAvailable(false); });
    return () => { active = false; };
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Nao foi possivel solicitar a recuperacao.");
      setMessage(data.message);
    } catch (error) { setError(error instanceof Error ? error.message : "Falha de conexao. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-[#fafaf7] px-4 py-10 text-zinc-950">
    <section className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <Link href="/" className="font-bold text-[#9d1f16]">Conectar Passagens</Link>
      <h1 className="mt-6 text-2xl font-black">Recuperar senha</h1>
      <p className="mt-3 leading-7 text-zinc-600">Informe o e-mail de recuperacao do acesso administrativo. O link vale por 30 minutos e pode ser usado uma unica vez.</p>
      {available === null ? <p className="mt-5" role="status">Verificando disponibilidade...</p> : available ? <form onSubmit={submit} className="mt-6 grid gap-4">
        <label className="grid gap-2 font-bold">E-mail de recuperacao<input type="email" autoComplete="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} className="rounded-lg border border-zinc-300 px-4 py-3 font-normal" /></label>
        <button disabled={busy} className="rounded-lg bg-[#9d1f16] px-5 py-3 font-bold text-white disabled:opacity-60">{busy ? "Solicitando..." : "Enviar link por e-mail"}</button>
      </form> : <p role="status" className="mt-6 rounded-lg bg-amber-50 p-4 leading-7 text-amber-950">A recuperacao por e-mail ainda nao foi ativada. Solicite a redefinicao ao responsavel pelo aplicativo. Nenhuma mensagem foi enviada.</p>}
      {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-4 leading-7 text-emerald-900">{message}</p>}
      {error && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-4 text-amber-950">{error}</p>}
      <p className="mt-5 text-sm leading-6 text-zinc-500">Se seu acesso e de uma conta da equipe, peca ajuda ao administrador.</p>
      <Link href="/" className="mt-6 inline-block font-bold text-[#9d1f16]">Voltar para entrar</Link>
    </section>
  </main>;
}
