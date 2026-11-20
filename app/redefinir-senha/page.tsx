"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const value = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
      setToken(/^[a-f0-9]{64}$/.test(value) ? value : "");
      // Keep it in memory only, away from history and subsequent referrers.
      window.history.replaceState(null, "", window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (password !== confirmation) { setError("As senhas precisam ser iguais."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Nao foi possivel redefinir a senha.");
      setDone(true); setToken(""); setPassword(""); setConfirmation("");
    } catch (error) { setError(error instanceof Error ? error.message : "Falha de conexao. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-[#fafaf7] px-4 py-10 text-zinc-950">
    <section className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <Link href="/" className="font-bold text-[#9d1f16]">Conectar Passagens</Link>
      <h1 className="mt-6 text-2xl font-black">Definir nova senha</h1>
      {done ? <div role="status"><p className="mt-4 leading-7">Senha atualizada. Entre novamente com a nova senha, deixando o e-mail vazio. As sessoes anteriores foram encerradas.</p><Link href="/" className="mt-6 inline-block rounded-lg bg-[#9d1f16] px-5 py-3 font-bold text-white">Entrar</Link></div> : token === null ? <p className="mt-5">Verificando link...</p> : !token ? <p className="mt-5 leading-7">Abra o link completo recebido por e-mail ou <Link href="/recuperar-senha" className="font-bold text-[#9d1f16]">solicite outro link</Link>.</p> : <form onSubmit={submit} className="mt-6 grid gap-4">
        <label className="grid gap-2 font-bold">Nova senha<input type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={password} onChange={event => setPassword(event.target.value)} className="rounded-lg border border-zinc-300 px-4 py-3 font-normal" /></label>
        <p className="text-sm text-zinc-600">Use pelo menos 12 caracteres.</p>
        <label className="grid gap-2 font-bold">Confirmar nova senha<input type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={confirmation} onChange={event => setConfirmation(event.target.value)} className="rounded-lg border border-zinc-300 px-4 py-3 font-normal" /></label>
        <button disabled={busy} className="rounded-lg bg-[#9d1f16] px-5 py-3 font-bold text-white disabled:opacity-60">{busy ? "Salvando..." : "Salvar nova senha"}</button>
      </form>}
      {error && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-4 text-amber-950">{error}</p>}
    </section>
  </main>;
}
