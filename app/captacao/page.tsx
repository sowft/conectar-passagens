"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LeadInsert } from "@/lib/leads";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#9d1f16] focus:ring-2 focus:ring-[#f3c400]/40";

export default function CaptacaoPage() {
  const [fonteCampanha, setFonteCampanha] = useState("Landing Page");
  const [visitToken, setVisitToken] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [dataViagem, setDataViagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [modoNoturno, setModoNoturno] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const temaSalvo = window.localStorage.getItem("conectar-tema") === "noturno";
      const fonteParam = new URLSearchParams(window.location.search)
        .get("fonte")
        ?.trim()
        .slice(0, 80);

      setFonteCampanha(fonteParam || "Landing Page");
      setVisitToken(new URLSearchParams(window.location.search).get("v") ?? "");
      aplicarTema(temaSalvo);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function aplicarTema(novoValor: boolean) {
    setModoNoturno(novoValor);
    window.localStorage.setItem("conectar-tema", novoValor ? "noturno" : "claro");
    document.documentElement.classList.toggle("night-mode", novoValor);
  }

  function alternarTema() {
    aplicarTema(!modoNoturno);
  }

  async function enviarInteresse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensagem("");
    setErro("");

    if (!nome.trim() || !telefone.trim() || !origem.trim() || !destino.trim() || !dataViagem) {
      setErro("Preencha todos os campos para receber opcoes de passagem.");
      return;
    }

    setEnviando(true);

    const lead: LeadInsert = {
      attribution_token: visitToken || null,
      campaign_id: new URLSearchParams(window.location.search).get("campanha"),
      consentimento,
      nome: nome.trim(),
      telefone: telefone.trim(),
      origem: origem.trim(),
      destino: destino.trim(),
      data_viagem: dataViagem,
      fonte: fonteCampanha,
      status: "novo",
    };

    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Nao foi possivel registrar seu interesse.");
      setMensagem("Interesse registrado. A equipe entrara em contato pelo WhatsApp.");
      setNome(""); setTelefone(""); setOrigem(""); setDestino(""); setDataViagem(""); setConsentimento(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha de conexao. Tente novamente.");
    } finally { setEnviando(false); }
  }

  const rotaPreview = origem || destino
    ? `${origem || "Origem"} para ${destino || "Destino"}`
    : "Sua rota aparece aqui";

  return (
    <main className={`min-h-screen bg-[#fafaf7] text-zinc-950 ${modoNoturno ? "night-mode" : ""}`}>
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="text-sm font-black text-[#9d1f16]">
              Conectar Passagens
            </Link>
            <button
              type="button"
              onClick={alternarTema}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 transition hover:border-[#9d1f16] hover:text-[#9d1f16]"
            >
              {modoNoturno ? "Claro" : "Noturno"}
            </button>
          </div>
          <p className="mt-4 inline-flex rounded-full bg-[#fff8cc] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#5a180f]">
            Fonte: {fonteCampanha}
          </p>
          <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
            Encontre sua passagem com atendimento humano.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600">
            Informe sua rota, data da viagem e WhatsApp. A equipe recebe seu pedido
            e retorna com opcoes de horarios, valores e disponibilidade.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {["Viagens urgentes", "Rotas interestaduais", "Atendimento pelo WhatsApp"].map((item) => (
              <div key={item} className="rounded-lg bg-white p-4 text-sm font-black text-zinc-950 shadow-sm">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-white p-4 text-zinc-950 shadow-sm lg:border-zinc-200">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9d1f16]">
              Previa do atendimento
            </p>
            <p className="mt-2 text-lg font-black">{rotaPreview}</p>
            <p className="mt-1 text-sm text-zinc-600">
              A equipe recebe esses dados e chama voce pelo WhatsApp.
            </p>
          </div>
        </div>

        <form onSubmit={enviarInteresse} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9d1f16]">
                Receber opcoes
              </p>
              <h2 className="mt-2 text-2xl font-black">Dados da viagem</h2>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
              rapido
            </span>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-1.5 text-sm font-black text-zinc-800">
              Nome
              <input
                className={inputClass}
                placeholder="Maria Souza"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                required
              />
            </label>

            <label className="grid gap-1.5 text-sm font-black text-zinc-800">
              WhatsApp
              <input
                className={inputClass}
                placeholder="(27) 99999-9999"
                value={telefone}
                onChange={(event) => setTelefone(event.target.value)}
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-black text-zinc-800">
                De onde voce vai?
                <input
                  className={inputClass}
                  placeholder="Vitoria"
                  value={origem}
                  onChange={(event) => setOrigem(event.target.value)}
                  required
                />
              </label>

              <label className="grid gap-1.5 text-sm font-black text-zinc-800">
                Para onde?
                <input
                  className={inputClass}
                  placeholder="Rio de Janeiro"
                  value={destino}
                  onChange={(event) => setDestino(event.target.value)}
                  required
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-black text-zinc-800">
              Quando pretende viajar?
              <input
                type="date"
                className={inputClass}
                value={dataViagem}
                onChange={(event) => setDataViagem(event.target.value)}
                required
              />
            </label>
          </div>

          {erro ? (
            <p className="mt-4 rounded-lg border border-[#9d1f16]/25 bg-[#fff8cc] px-4 py-3 text-sm font-bold text-[#5a180f]">
              {erro}
            </p>
          ) : null}

          {mensagem ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
              {mensagem}
            </p>
          ) : null}

          <label className="mt-4 flex gap-3 text-sm"><input type="checkbox" checked={consentimento} onChange={event => setConsentimento(event.target.checked)} required />Autorizo a Conectar Passagens a usar estes dados para entrar em contato sobre minha solicitacao.</label>
          <button
            type="submit"
            disabled={enviando}
            className="mt-5 w-full rounded-lg bg-[#9d1f16] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#82170f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? "Registrando..." : "Receber opcoes"}
          </button>

          <button type="submit" form="comprar-passagem" className="mt-5 block w-full text-center font-bold text-[#9d1f16]">Consultar e comprar na ClickBus</button>
          <p className="mt-4 text-center text-xs font-semibold text-zinc-500">
            Seus dados serao usados apenas para retornar o atendimento solicitado.
          </p>
        </form>
        <form id="comprar-passagem" action="/comprar" method="post" className="hidden"><input type="hidden" name="v" value={visitToken} /></form>
      </section>
    </main>
  );
}
