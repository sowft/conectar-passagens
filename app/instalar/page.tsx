"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useInstallPrompt } from "@/components/RegisterServiceWorker";

export default function InstallPage() {
  const { prompt, clearPrompt } = useInstallPrompt();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const installed = () => setMessage("Aplicativo instalado. Abra pelo icone Conectar Passagens.");
    window.addEventListener("appinstalled", installed);
    return () => window.removeEventListener("appinstalled", installed);
  }, []);
  async function install() {
    if (!prompt || busy) return;
    setBusy(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(choice.outcome === "accepted" ? "Instalacao solicitada. Confirme no seu aparelho." : "Voce pode instalar depois pelo menu do navegador.");
    } catch { setMessage("Abra o menu do navegador e siga as instrucoes abaixo."); }
    finally { clearPrompt(); setBusy(false); }
  }
  return <main className="min-h-screen bg-[#fafaf7] px-5 py-12 text-zinc-950">
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="font-bold text-[#9d1f16]">Conectar Passagens</Link>
      <h1 className="mt-8 text-3xl font-black">O aplicativo no seu aparelho</h1>
      <p className="mt-4 text-lg leading-8 text-zinc-600">Instale para abrir pelo icone, em uma janela propria. Use o mesmo acesso do site e receba as atualizacoes ao se conectar.</p>
      {prompt && <button onClick={install} disabled={busy} className="mt-6 rounded-lg bg-[#9d1f16] px-6 py-3 font-bold text-white disabled:opacity-60">{busy ? "Instalando..." : "Instalar aplicativo"}</button>}
      {message && <p role="status" className="mt-5 rounded-lg bg-white p-4">{message}</p>}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["Android", "Abra este link no Chrome. No menu de tres pontos, escolha Instalar aplicativo ou Adicionar a tela inicial e confirme."],
          ["iPhone ou iPad", "Abra este link no Safari. Toque em Compartilhar, depois em Adicionar a Tela de Inicio e confirme em Adicionar."],
          ["Windows", "Abra este link no Chrome ou Edge. Use o icone de instalacao na barra de endereco ou a opcao Instalar este site como aplicativo no menu."],
        ].map(([title, detail]) => <section key={title} className="rounded-xl border border-zinc-200 bg-white p-5"><h2 className="text-xl font-black">{title}</h2><p className="mt-3 leading-7 text-zinc-600">{detail}</p></section>)}
      </div>
      <p className="mt-6 leading-7 text-zinc-600">E necessario ter internet para entrar, consultar e salvar dados. Se voce estiver no navegador do WhatsApp, abra primeiro no Chrome ou Safari. As opcoes de instalacao variam conforme o navegador.</p>
      <Link href="/" className="mt-8 inline-block rounded-lg bg-[#9d1f16] px-6 py-3 font-bold text-white">Abrir aplicativo</Link>
    </div>
  </main>;
}
