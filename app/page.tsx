"use client";

import Link from "next/link";
import CompanySearch from "@/components/CompanySearch";
import { useCallback, useEffect, useMemo, useState } from "react";
import CampaignManager from "@/components/CampaignManager";
import OperationStatus from "@/components/OperationStatus";
import AppOpening from "@/components/AppOpening";
import {
  Lead,
  LeadStatus,
  formatDate,
  formatRelativeDate,
  statusLabels,
  statusOrder,
  whatsAppUrl,
} from "@/lib/leads";

type Aba = "inicio" | "prospectar" | "oportunidades" | "campanhas" | "funil";

type Prospecao = {
  produto: string;
  publico: string;
  regiao: string;
  perfil: string;
  canais: string[];
};

type FiltrosOportunidades = {
  busca: string;
  status: "todos" | LeadStatus;
  fonte: string;
  inicio: string;
  fim: string;
};

const canaisDisponiveis = ["Google Ads", "Google - empresas", "WhatsApp", "Instagram"];

const fontes = [
  ["Meta Ads", "Nao conectado", "Integre quando houver conta de anuncios e permissao da API."],
  ["Google Ads", "Nao conectado", "Requer conta de anuncios e configuracao externa."],
  ["Formulario", "Disponivel", "Captacao publica ativa em /captacao."],
  ["Base propria", "Disponivel", "Cadastre interessados pelo formulario publico."],
];

const abas: Array<{ id: Aba; label: string; resumo: string }> = [
  { id: "inicio", label: "Inicio", resumo: "Resumo comercial" },
  { id: "prospectar", label: "Prospectar", resumo: "Criar captacao" },
  { id: "oportunidades", label: "Oportunidades", resumo: "Leads recebidos" },
  { id: "campanhas", label: "Campanhas", resumo: "Acoes de aquisicao" },
  { id: "funil", label: "Funil", resumo: "Etapas de venda" },
];

const planoInicial: Prospecao = {
  produto: "Passagens rodoviarias",
  publico: "Pessoa fisica",
  regiao: "Espirito Santo",
  perfil: "Viagem urgente",
  canais: ["Google - empresas", "Google Ads"],
};

const filtrosIniciais: FiltrosOportunidades = {
  busca: "",
  status: "todos",
  fonte: "todas",
  inicio: "",
  fim: "",
};

export default function Home() {
  const [aba, setAba] = useState<Aba>("inicio");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoProspecao, setSalvandoProspecao] = useState(false);
  const [erro, setErro] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [aberturaConcluida, setAberturaConcluida] = useState(false);
  const [modoAcesso, setModoAcesso] = useState<"login" | "cadastro">("login");
  const [nomeCadastro, setNomeCadastro] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrarLogin, setLembrarLogin] = useState(false);
  const [erroLogin, setErroLogin] = useState("");
  const [mensagemLogin, setMensagemLogin] = useState("");
  const [enviandoAcesso, setEnviandoAcesso] = useState(false);
  const [prospecao, setProspecao] = useState<Prospecao>(planoInicial);
  const [prospecaoAtiva, setProspecaoAtiva] = useState<Prospecao>(planoInicial);
  const [filtros, setFiltros] = useState<FiltrosOportunidades>(filtrosIniciais);
  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null);
  const [modoNoturno, setModoNoturno] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setAberturaConcluida(true), 1600);
    return () => window.clearTimeout(timer);
  }, []);

  function alternarTema() {
    aplicarTema(!modoNoturno);
  }

  function aplicarTema(novoValor: boolean) {
    setModoNoturno(novoValor);
    window.localStorage.setItem("conectar-tema", novoValor ? "noturno" : "claro");
    document.documentElement.classList.toggle("night-mode", novoValor);
  }

  const carregarLeads = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
    const response = await fetch("/api/leads");
    const data = (await response.json()) as { leads?: Lead[]; error?: string };

    if (!response.ok) {
      setErro(data.error ?? "Nao foi possivel carregar os leads.");
      setLeads([]);
    } else {
      setLeads(data.leads ?? []);
    }

    } catch { setErro("Falha de conexao ao carregar os leads."); }
    finally { setCarregando(false); }
  }, []);

  const verificarSessao = useCallback(async () => {
    try {
    const response = await fetch("/api/auth/me", { signal: AbortSignal.timeout(8000) });
    const data = (await response.json()) as { authenticated?: boolean };
    setAutenticado(Boolean(data.authenticated));
    setCarregandoSessao(false);
    if (data.authenticated) {
      carregarLeads();
    } else {
      setCarregando(false);
    }
    } catch { setAutenticado(false); setCarregandoSessao(false); setErroLogin("Falha ao verificar acesso. Tente entrar novamente."); }
  }, [carregarLeads]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      aplicarTema(window.localStorage.getItem("conectar-tema") === "noturno");
      const deveManterLogin = window.localStorage.getItem("conectar-lembrar-login") === "sim";

      setLembrarLogin(deveManterLogin);
      setEmail(window.localStorage.getItem("conectar-email-login") ?? "");
      const params = new URLSearchParams(window.location.search);
      if (params.get("cadastro") === "1") setModoAcesso("cadastro");
      if (params.get("confirmado") === "1") setMensagemLogin("E-mail confirmado. Entre com seu e-mail e senha.");

      void (async () => {
        try {
          if (!deveManterLogin) {
            window.localStorage.removeItem("conectar-auth-local");
            const response = await fetch("/api/auth/logout", { method: "POST", signal: AbortSignal.timeout(5000) });
            if (!response.ok) throw new Error("LOGOUT_UNAVAILABLE");
          }
          await verificarSessao();
        } catch {
          // A failed logout must not leave the opening screen stuck forever.
          setAutenticado(false);
          setCarregandoSessao(false);
          setErroLogin("Falha ao preparar o acesso. Tente entrar novamente.");
        }
      })();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [verificarSessao]);

  useEffect(() => {
    function limparSessao() {
      if (window.localStorage.getItem("conectar-lembrar-login") !== "sim") {
        navigator.sendBeacon("/api/auth/logout");
      }
    }

    window.addEventListener("pagehide", limparSessao);
    return () => window.removeEventListener("pagehide", limparSessao);
  }, []);

  async function entrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviandoAcesso) return;
    setEnviandoAcesso(true);
    setErroLogin("");
    setMensagemLogin("");
    try {

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email || undefined,
        password: senha,
        remember: lembrarLogin,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      setErroLogin(data.error ?? "Nao foi possivel entrar.");
      return;
    }

    if (lembrarLogin) {
      window.localStorage.setItem("conectar-lembrar-login", "sim");
      if (email) window.localStorage.setItem("conectar-email-login", email);
    } else {
      window.localStorage.removeItem("conectar-lembrar-login");
      window.localStorage.removeItem("conectar-auth-local");
      window.localStorage.removeItem("conectar-email-login");
    }

    setSenha("");
    if (!lembrarLogin) setEmail("");
    setAutenticado(true);
    carregarLeads();
    } catch { setErroLogin("Falha de conexao. Tente entrar novamente."); }
    finally { setEnviandoAcesso(false); }
  }

  async function cadastrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviandoAcesso) return;
    setEnviandoAcesso(true);
    setErroLogin("");
    setMensagemLogin("");
    try {

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nomeCadastro,
        email,
        password: senha,
        remember: lembrarLogin,
      }),
    });

    const data = (await response.json()) as { error?: string; requiresConfirmation?: boolean; message?: string };

    if (!response.ok) {
      setErroLogin(data.error ?? "Nao foi possivel criar a conta.");
      return;
    }

    if (data.requiresConfirmation) {
      setMensagemLogin(data.message ?? "Confira seu e-mail para confirmar o cadastro.");
      setModoAcesso("login");
      setSenha("");
      return;
    }

    if (lembrarLogin) {
      window.localStorage.setItem("conectar-lembrar-login", "sim");
      window.localStorage.setItem("conectar-email-login", email);
    } else {
      window.localStorage.removeItem("conectar-lembrar-login");
      window.localStorage.removeItem("conectar-auth-local");
      window.localStorage.removeItem("conectar-email-login");
    }

    setNomeCadastro("");
    if (!lembrarLogin) setEmail("");
    setSenha("");
    setAutenticado(true);
    carregarLeads();
    } catch { setErroLogin("Falha de conexao. Tente cadastrar novamente."); }
    finally { setEnviandoAcesso(false); }
  }

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAutenticado(false);
    setLeads([]);
    window.localStorage.removeItem("conectar-lembrar-login");
    window.localStorage.removeItem("conectar-auth-local");
    window.localStorage.removeItem("conectar-email-login");
    setAba("inicio");
  }

  async function atualizarStatus(id: string, status: LeadStatus) {
    atualizarLead(id, { status });
  }

  async function atualizarLead(id: string, updates: Partial<Pick<Lead, "status" | "observacoes">>) {
    const anterior = leads;
    setLeads((atuais) =>
      atuais.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead)),
    );
    setLeadSelecionado((atual) =>
      atual?.id === id ? { ...atual, ...updates } : atual,
    );

    const response = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });

    if (!response.ok) {
      setLeads(anterior);
      setLeadSelecionado(anterior.find((lead) => lead.id === id) ?? null);
      setErro("Nao foi possivel salvar a alteracao.");
    }
  }

  async function criarProspecao() {
    if (salvandoProspecao) return;
    setSalvandoProspecao(true);
    setErro("");
    try {
      const response = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prospecao) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProspecaoAtiva(prospecao);
      setAba("campanhas");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Nao foi possivel salvar a prospeccao.");
    } finally { setSalvandoProspecao(false); }
  }

  function alternarCanal(canal: string) {
    setProspecao((atual) => {
      const existe = atual.canais.includes(canal);
      return {
        ...atual,
        canais: existe
          ? atual.canais.filter((item) => item !== canal)
          : [...atual.canais, canal],
      };
    });
  }

  const metricas = useMemo(
    () => ({
      novos: leads.filter((lead) => lead.status === "novo").length,
      qualificados: leads.filter((lead) => lead.status === "qualificado").length,
      contatados: leads.filter((lead) => lead.status === "contatado").length,
      convertidos: leads.filter((lead) => lead.status === "convertido").length,
    }),
    [leads],
  );

  const leadsFiltrados = useMemo(() => {
    const termo = filtros.busca.trim().toLowerCase();
    const inicio = filtros.inicio ? new Date(`${filtros.inicio}T00:00:00`).getTime() : null;
    const fim = filtros.fim ? new Date(`${filtros.fim}T23:59:59`).getTime() : null;

    return leads.filter((lead) => {
      const texto = [
        lead.nome,
        lead.telefone,
        lead.origem,
        lead.destino,
        lead.fonte,
        statusLabels[lead.status],
      ]
        .join(" ")
        .toLowerCase();
      const createdAt = new Date(lead.created_at).getTime();

      return (
        (!termo || texto.includes(termo)) &&
        (filtros.status === "todos" || lead.status === filtros.status) &&
        (filtros.fonte === "todas" || lead.fonte === filtros.fonte) &&
        (!inicio || createdAt >= inicio) &&
        (!fim || createdAt <= fim)
      );
    });
  }, [filtros, leads]);

  const fontesCaptadas = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.fonte))).sort(),
    [leads],
  );

  const fontesResumo = useMemo(() => {
    return fontesCaptadas
      .map((fonte) => ({
        fonte,
        total: leads.filter((lead) => lead.fonte === fonte).length,
      }))
      .sort((a, b) => b.total - a.total);
  }, [fontesCaptadas, leads]);

  const taxaConversao = leads.length
    ? Math.round((metricas.convertidos / leads.length) * 100)
    : 0;

  if (carregandoSessao || !aberturaConcluida) return <AppOpening />;

  if (!autenticado) {
    return (
      <main className={`grid min-h-screen place-items-center bg-[#fafaf7] px-4 text-zinc-950 ${modoNoturno ? "night-mode" : ""}`}>
        <form onSubmit={modoAcesso === "login" ? entrar : cadastrar} className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9d1f16]">
                Area interna
              </p>
              <h1 className="mt-2 text-2xl font-black">
                {modoAcesso === "login" ? "Entrar" : "Criar conta"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {modoAcesso === "login"
                  ? "Entre para ver oportunidades, funil e campanhas."
                  : "Cadastre seu acesso para usar a area comercial."}
              </p>
            </div>
            <button
              type="button"
              onClick={alternarTema}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black text-zinc-700"
            >
              {modoNoturno ? "Claro" : "Noturno"}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-zinc-50 p-1">
            {(["login", "cadastro"] as const).map((modo) => (
              <button
                key={modo}
                type="button"
                onClick={() => {
                  setModoAcesso(modo);
                  setErroLogin("");
                  setMensagemLogin("");
                }}
                className={`rounded-md px-3 py-2 text-sm font-black ${
                  modoAcesso === modo
                    ? "bg-white text-[#9d1f16] shadow-sm"
                    : "text-zinc-600"
                }`}
              >
                {modo === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {modoAcesso === "cadastro" ? (
            <label className="mt-5 grid gap-1.5 text-sm font-black text-zinc-800">
              Nome
              <input
                value={nomeCadastro}
                onChange={(event) => setNomeCadastro(event.target.value)}
                className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold outline-none focus:border-[#9d1f16] focus:ring-2 focus:ring-[#f3c400]/40"
                placeholder="Seu nome"
                required
              />
            </label>
          ) : null}

          <label className="mt-5 grid gap-1.5 text-sm font-black text-zinc-800">
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold outline-none focus:border-[#9d1f16] focus:ring-2 focus:ring-[#f3c400]/40"
              placeholder="voce@email.com"
              required={modoAcesso === "cadastro"}
            />
          </label>
          {modoAcesso === "login" && <p className="mt-2 text-xs text-zinc-500">Para o acesso administrativo original, deixe o e-mail vazio.</p>}

          <label className="mt-5 grid gap-1.5 text-sm font-black text-zinc-800">
            Senha de acesso
            <input
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold outline-none focus:border-[#9d1f16] focus:ring-2 focus:ring-[#f3c400]/40"
              placeholder={modoAcesso === "login" ? "Digite a senha" : "Minimo 12 caracteres"}
              minLength={modoAcesso === "cadastro" ? 12 : undefined}
              maxLength={256}
              autoComplete={modoAcesso === "cadastro" ? "new-password" : "current-password"}
              required
            />
          </label>

          <label className="mt-4 flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-700">
            <input
              type="checkbox"
              checked={lembrarLogin}
              onChange={(event) => setLembrarLogin(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#9d1f16]"
            />
            <span>
              Manter conectado
              <span className="mt-1 block text-xs font-semibold text-zinc-500">
                Quando desmarcado, volta para o login ao atualizar ou fechar.
              </span>
            </span>
          </label>

          {erroLogin ? (
            <p className="mt-4 rounded-lg bg-[#fff8cc] px-4 py-3 text-sm font-bold text-[#5a180f]">
              {erroLogin}
            </p>
          ) : null}

          {mensagemLogin && <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">{mensagemLogin}</p>}

          <button disabled={enviandoAcesso} className="mt-5 w-full rounded-lg bg-[#9d1f16] px-5 py-3 text-sm font-black text-white disabled:opacity-60">
            {enviandoAcesso ? "Aguarde..." : modoAcesso === "login" ? "Entrar" : "Criar conta"}
          </button>

          <Link href="/captacao" className="mt-4 block text-center text-sm font-black text-[#9d1f16]">
            Abrir formulario publico
          </Link>
          <Link href="/recuperar-senha" className="mt-4 block text-center text-sm font-bold text-[#9d1f16]">Esqueci minha senha</Link>
          <Link href="/instalar" className="mt-4 block text-center text-sm font-bold text-[#9d1f16]">Instalar aplicativo</Link>
          {process.env.NODE_ENV === "development" && <Link href="/configurar" className="mt-4 block text-center text-sm font-bold text-[#9d1f16]">Primeiro acesso? Configurar acesso local</Link>}
        </form>
      </main>
    );
  }

  return (
    <main className={`min-h-screen bg-[#fafaf7] text-zinc-950 ${modoNoturno ? "night-mode" : ""}`}>
      <div className="mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-[320px_1fr]">
        <aside className="border-r border-zinc-200 bg-white px-5 pb-6 pt-6 text-zinc-950 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto lg:px-6">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-[#9d1f16]">Central comercial</p>
            <button
              type="button"
              onClick={alternarTema}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black text-zinc-700 transition hover:border-[#9d1f16] hover:text-[#9d1f16]"
            >
              {modoNoturno ? "Claro" : "Noturno"}
            </button>
          </div>
          <h1 className="mt-2 text-3xl font-black leading-tight lg:text-4xl">
            Conectar Passagens
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Prospecao, captacao e acompanhamento de oportunidades reais para venda de passagens.
          </p>
          <Link href="/instalar" className="mt-4 inline-block text-sm font-bold text-[#9d1f16]">Instalar aplicativo neste aparelho</Link>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Card numero={leads.length} texto="leads captados" />
            <Card numero={metricas.convertidos} texto="convertidos" />
          </div>

          <nav className="mt-6 hidden gap-2 lg:grid">
            {abas.map((item) => (
              <NavButton
                key={item.id}
                ativo={aba === item.id}
                label={item.label}
                resumo={item.resumo}
                onClick={() => setAba(item.id)}
              />
            ))}
          </nav>

          <Link
            href="/captacao"
            className="mt-6 hidden rounded-lg bg-[#9d1f16] px-4 py-3 text-center text-sm font-black text-white transition hover:bg-[#82170f] lg:block"
          >
            Abrir formulario publico
          </Link>

          <button
            type="button"
            onClick={sair}
            className="mt-3 hidden rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-black text-zinc-700 transition hover:border-[#9d1f16] hover:text-[#9d1f16] lg:block"
          >
            Sair
          </button>
        </aside>

        <section className="min-w-0 px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-8">
          {erro ? (
            <div className="mb-5 rounded-lg border border-[#9d1f16]/25 bg-[#fff8cc] px-4 py-3 text-sm font-bold text-[#5a180f]">
              {erro}
            </div>
          ) : null}

          {aba === "inicio" ? (
            <><OperationStatus /><InicioView
              leads={leads}
              carregando={carregando}
              metricas={metricas}
              fontesResumo={fontesResumo}
              taxaConversao={taxaConversao}
              prospecaoAtiva={prospecaoAtiva}
              setAba={setAba}
            /></>
          ) : aba === "prospectar" ? (
            <><CompanySearch /><ProspectarView
              prospecao={prospecao}
              alternarCanal={alternarCanal}
              salvando={salvandoProspecao}
              criarProspecao={criarProspecao}
              setProspecao={setProspecao}
            /></>
          ) : aba === "oportunidades" ? (
            <OportunidadesView
              leads={leads}
              leadsFiltrados={leadsFiltrados}
              filtros={filtros}
              fontesCaptadas={fontesCaptadas}
              carregando={carregando}
              atualizarStatus={atualizarStatus}
              abrirLead={setLeadSelecionado}
              recarregar={carregarLeads}
              limparFiltros={() => setFiltros(filtrosIniciais)}
              setFiltros={setFiltros}
            />
          ) : aba === "campanhas" ? (
            <CampaignManager leads={leads} />
          ) : (
            <FunilView leads={leads} atualizarStatus={atualizarStatus} />
          )}
        </section>
      </div>

      {leadSelecionado ? (
        <LeadDetailsModal
          lead={leadSelecionado}
          fechar={() => setLeadSelecionado(null)}
          salvarObservacoes={(observacoes) =>
            atualizarLead(leadSelecionado.id, { observacoes })
          }
          atualizarStatus={(status) => atualizarLead(leadSelecionado.id, { status })}
        />
      ) : null}

      <nav className="fixed bottom-0 left-0 grid w-full grid-cols-5 border-t border-zinc-200 bg-white px-1 py-2 text-xs font-bold shadow-lg lg:hidden">
        {abas.map((item) => (
          <button
            key={item.id}
            onClick={() => setAba(item.id)}
            className={`rounded-lg px-1 py-2 ${
              aba === item.id ? "bg-[#9d1f16] text-white" : "text-zinc-600"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </main>
  );
}

function InicioView({
  leads,
  carregando,
  metricas,
  fontesResumo,
  taxaConversao,
  prospecaoAtiva,
  setAba,
}: {
  leads: Lead[];
  carregando: boolean;
  metricas: { novos: number; qualificados: number; contatados: number; convertidos: number };
  fontesResumo: Array<{ fonte: string; total: number }>;
  taxaConversao: number;
  prospecaoAtiva: Prospecao;
  setAba: (aba: Aba) => void;
}) {
  const recentes = leads.slice(0, 3);
  const total = Math.max(leads.length, 1);

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[1fr_320px]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9d1f16]">
              Central de prospeccao
            </p>
            <h2 className="mt-3 max-w-3xl text-2xl font-black leading-tight sm:text-3xl">
              Transforme campanhas em contatos acompanhados ate a venda.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
              Acompanhe a captacao, priorize os contatos recentes e use o funil para nao perder oportunidades.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setAba("prospectar")}
                className="rounded-lg bg-[#9d1f16] px-5 py-3 text-sm font-black text-white"
              >
                Criar prospeccao
              </button>
              <Link
                href="/captacao?fonte=Instagram"
                className="rounded-lg border border-zinc-300 px-5 py-3 text-center text-sm font-black text-zinc-700 transition hover:border-[#9d1f16] hover:text-[#9d1f16]"
              >
                Ver campanha
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-[#fafaf7] p-5">
            <p className="text-sm font-bold text-zinc-600">Conversao geral</p>
            <strong className="mt-2 block text-4xl font-black text-[#9d1f16]">{taxaConversao}%</strong>
            <div className="mt-4 h-3 rounded-full bg-zinc-200">
              <div className="h-3 rounded-full bg-[#f3c400]" style={{ width: `${taxaConversao}%` }} />
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              {metricas.convertidos} vendas informadas pela equipe a partir de {leads.length} leads captados.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard titulo="Novos leads" valor={metricas.novos} detalhe="aguardando primeira acao" />
        <MetricCard titulo="Qualificados" valor={metricas.qualificados} detalhe="com potencial confirmado" />
        <MetricCard titulo="Contatados" valor={metricas.contatados} detalhe="abordagem iniciada" />
        <MetricCard titulo="Convertidos" valor={metricas.convertidos} detalhe="vendas informadas pela equipe" destaque />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9d1f16]">
                Plano de prospeccao
              </p>
              <h2 className="mt-2 text-2xl font-black">{prospecaoAtiva.produto}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {prospecaoAtiva.regiao} ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {prospecaoAtiva.publico} ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {prospecaoAtiva.perfil}
              </p>
            </div>
            <button
              onClick={() => setAba("prospectar")}
              className="rounded-lg bg-[#9d1f16] px-4 py-2.5 text-sm font-black text-white"
            >
              Ajustar prospeccao
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {fontes.map(([nome, status, descricao]) => (
              <div key={nome} className="rounded-lg border border-zinc-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm">{nome}</strong>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black ${
                      status === "Disponivel"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{descricao}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#9d1f16]">Ultimas oportunidades</p>
              <p className="mt-1 text-sm text-zinc-600">Entradas reais vindas do formulario.</p>
            </div>
            <button onClick={() => setAba("oportunidades")} className="text-sm font-black text-[#9d1f16]">
              Ver todas
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {carregando ? (
              <p className="rounded-lg bg-[#fafaf7] p-4 text-sm text-zinc-600">Carregando leads...</p>
            ) : recentes.length === 0 ? (
              <p className="rounded-lg bg-[#fafaf7] p-4 text-sm leading-6 text-zinc-600">
                Nenhum lead recebido ainda. Divulgue o link /captacao para iniciar a primeira entrada.
              </p>
            ) : (
              recentes.map((lead) => (
                <LeadMiniCard key={lead.id} lead={lead} dark />
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-[#9d1f16]">Progresso do funil</p>
          <div className="mt-5 grid gap-4">
            {statusOrder.map((status) => (
              <FunnelBar
                key={status}
                label={statusLabels[status]}
                value={metricas[status === "novo" ? "novos" : status === "qualificado" ? "qualificados" : status === "contatado" ? "contatados" : "convertidos"]}
                total={total}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-[#9d1f16]">Fontes que estao captando</p>
          <div className="mt-5 grid gap-3">
            {fontesResumo.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm leading-6 text-zinc-600">
                Quando os formularios forem enviados com links rastreaveis, os canais aparecem aqui.
              </p>
            ) : (
              fontesResumo.map((item) => (
                <SourceBar key={item.fonte} fonte={item.fonte} total={item.total} max={fontesResumo[0]?.total ?? 1} />
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProspectarView({
  salvando,
  prospecao,
  setProspecao,
  alternarCanal,
  criarProspecao,
}: {
  salvando: boolean;
  prospecao: Prospecao;
  setProspecao: (valor: Prospecao) => void;
  alternarCanal: (canal: string) => void;
  criarProspecao: () => void;
}) {
  return (
    <div className="grid gap-6">
      <PageTitle
        eyebrow="Nova prospeccao"
        title="Defina quem a Conectar quer captar agora."
        description="Esta tela configura a estrategia. As fontes conectadas depois trarao leads para a area de oportunidades."
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="O que deseja divulgar?"
              value={prospecao.produto}
              options={["Passagens rodoviarias", "Viagens corporativas", "Grupos e excursao"]}
              onChange={(produto) => setProspecao({ ...prospecao, produto })}
            />
            <SelectField
              label="Publico que deseja alcancar"
              value={prospecao.publico}
              options={["Pessoa fisica", "Empresas", "Grupos", "Agencias"]}
              onChange={(publico) => setProspecao({ ...prospecao, publico })}
            />
            <SelectField
              label="Regiao"
              value={prospecao.regiao}
              options={["Espirito Santo", "Rio de Janeiro", "Sao Paulo", "Brasil"]}
              onChange={(regiao) => setProspecao({ ...prospecao, regiao })}
            />
            <SelectField
              label="Perfil"
              value={prospecao.perfil}
              options={["Viagem urgente", "Pesquisa de preco", "Viagem familiar", "Recorrencia corporativa"]}
              onChange={(perfil) => setProspecao({ ...prospecao, perfil })}
            />
          </div>

          <div className="mt-5">
            <p className="text-sm font-black text-zinc-800">Canais de aquisicao</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {canaisDisponiveis.map((canal) => (
                <label key={canal} className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={prospecao.canais.includes(canal)}
                    onChange={() => alternarCanal(canal)}
                    className="h-4 w-4 accent-[#9d1f16]"
                  />
                  {canal}
                </label>
              ))}
            </div>
          </div>

          <button
            disabled={salvando}
            onClick={criarProspecao}
            className="mt-5 rounded-lg bg-[#9d1f16] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#82170f]"
          >
            {salvando ? "Salvando..." : "Salvar campanha de prospeccao"}
          </button>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#9d1f16]">Resumo do plano</p>
          <h3 className="mt-2 text-2xl font-black">{prospecao.produto}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {prospecao.regiao} ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {prospecao.publico} ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {prospecao.perfil}
          </p>
          <p className="mt-5 text-sm text-zinc-600">Salvar cria uma campanha com links de captacao. A divulgacao nos canais deve ser realizada pela equipe. Consulte os resultados na aba Campanhas.</p>
          <div className="mt-5 grid gap-2 text-sm text-zinc-600">
            {fontes.map(([nome, status]) => (
              <div key={nome} className="flex items-center justify-between border-b border-zinc-100 py-2">
                <span>{nome}</span>
                <strong className={status === "Disponivel" ? "text-emerald-700" : "text-zinc-500"}>
                  {status}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function OportunidadesView({
  leads,
  leadsFiltrados,
  filtros,
  fontesCaptadas,
  carregando,
  atualizarStatus,
  abrirLead,
  recarregar,
  limparFiltros,
  setFiltros,
}: {
  leads: Lead[];
  leadsFiltrados: Lead[];
  filtros: FiltrosOportunidades;
  fontesCaptadas: string[];
  carregando: boolean;
  atualizarStatus: (id: string, status: LeadStatus) => void;
  abrirLead: (lead: Lead) => void;
  recarregar: () => void;
  limparFiltros: () => void;
  setFiltros: (filtros: FiltrosOportunidades) => void;
}) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle
          eyebrow="Oportunidades"
          title="Leads captados pelas fontes disponiveis."
          description="Aqui entram pessoas que demonstraram interesse real no formulario publico ou em futuras integracoes."
        />
        <button onClick={recarregar} className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-black">
          Atualizar
        </button>
      </div>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr] xl:grid-cols-[1.4fr_0.75fr_0.75fr_0.75fr_0.75fr_auto]">
          <input
            value={filtros.busca}
            onChange={(event) => setFiltros({ ...filtros, busca: event.target.value })}
            placeholder="Buscar por nome, telefone, rota ou fonte"
            className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold outline-none focus:border-[#9d1f16] focus:ring-2 focus:ring-[#f3c400]/40"
          />
          <select
            value={filtros.status}
            onChange={(event) =>
              setFiltros({ ...filtros, status: event.target.value as FiltrosOportunidades["status"] })
            }
            className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold outline-none focus:border-[#9d1f16] focus:ring-2 focus:ring-[#f3c400]/40"
          >
            <option value="todos">Todos os status</option>
            {statusOrder.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
          <select
            value={filtros.fonte}
            onChange={(event) => setFiltros({ ...filtros, fonte: event.target.value })}
            className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold outline-none focus:border-[#9d1f16] focus:ring-2 focus:ring-[#f3c400]/40"
          >
            <option value="todas">Todas as fontes</option>
            {fontesCaptadas.map((fonte) => (
              <option key={fonte} value={fonte}>
                {fonte}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filtros.inicio}
            onChange={(event) => setFiltros({ ...filtros, inicio: event.target.value })}
            className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold outline-none focus:border-[#9d1f16] focus:ring-2 focus:ring-[#f3c400]/40"
          />
          <input
            type="date"
            value={filtros.fim}
            onChange={(event) => setFiltros({ ...filtros, fim: event.target.value })}
            className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold outline-none focus:border-[#9d1f16] focus:ring-2 focus:ring-[#f3c400]/40"
          />
          <button
            onClick={limparFiltros}
            className="rounded-lg bg-zinc-950 px-4 py-3 text-sm font-black text-[#f3c400]"
          >
            Limpar
          </button>
        </div>
        <p className="mt-3 text-sm font-bold text-zinc-600">
          Mostrando {leadsFiltrados.length} de {leads.length} oportunidades.
        </p>
      </section>

      {carregando ? (
        <p className="rounded-lg bg-white p-5 text-sm font-bold text-zinc-600 shadow-sm">Carregando oportunidades...</p>
      ) : leads.length === 0 ? (
        <EmptyLeads />
      ) : leadsFiltrados.length === 0 ? (
        <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black">Nenhuma oportunidade encontrada.</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Ajuste os filtros para ampliar a busca ou atualize a lista.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {leadsFiltrados.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              atualizarStatus={atualizarStatus}
              abrirLead={abrirLead}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function FunilView({
  leads,
  atualizarStatus,
}: {
  leads: Lead[];
  atualizarStatus: (id: string, status: LeadStatus) => void;
}) {
  return (
    <div className="grid gap-6">
      <PageTitle
        eyebrow="Funil"
        title="Acompanhe encontrado, interessado, contato e venda."
        description="Mova cada oportunidade conforme a equipe qualifica, conversa e converte o interessado."
      />

      <section className="grid gap-4 xl:grid-cols-4">
        {statusOrder.map((status) => {
          const itens = leads.filter((lead) => lead.status === status);
          return (
            <div key={status} className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black">{statusLabels[status]}</h3>
                <span className="rounded-full bg-[#f3c400] px-2.5 py-1 text-xs font-black">
                  {itens.length}
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {itens.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-300 p-3 text-sm text-zinc-500">
                    Sem leads nesta etapa.
                  </p>
                ) : (
                  itens.map((lead) => (
                    <LeadMiniCard
                      key={lead.id}
                      lead={lead}
                      nextStatus={statusOrder[statusOrder.indexOf(status) + 1]}
                      atualizarStatus={atualizarStatus}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function LeadCard({
  lead,
  atualizarStatus,
  abrirLead,
}: {
  lead: Lead;
  atualizarStatus: (id: string, status: LeadStatus) => void;
  abrirLead: (lead: Lead) => void;
}) {
  return (
    <article className="rounded-lg border border-white bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9d1f16]">
            {lead.fonte}
          </p>
          <h3 className="mt-2 text-xl font-black">{lead.nome}</h3>
          <p className="mt-1 text-sm font-semibold text-zinc-700">
            {lead.origem} ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ {lead.destino}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(lead.status)}`}>
          {statusLabels[lead.status]}
        </span>
      </div>

      <div className="mt-4 grid gap-1 text-sm text-zinc-600">
        <p>Viagem: {formatDate(lead.data_viagem)}</p>
        <p>WhatsApp: {lead.telefone}</p>
        <p>Recebido: {formatRelativeDate(lead.created_at)}</p>
        <p>Observacoes: {lead.observacoes ? "registradas" : "nenhuma"}</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <a href={whatsAppUrl(lead)} target="_blank" rel="noreferrer" className="rounded-lg bg-zinc-950 px-3 py-2.5 text-center text-sm font-black text-[#f3c400] transition hover:bg-[#9d1f16] hover:text-white">
          WhatsApp
        </a>
        <select
          value={lead.status}
          onChange={(e) => atualizarStatus(lead.id, e.target.value as LeadStatus)}
          className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm font-bold outline-none"
        >
          {statusOrder.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => abrirLead(lead)}
          className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm font-black text-zinc-700 transition hover:border-[#9d1f16] hover:text-[#9d1f16]"
        >
          Detalhes
        </button>
      </div>
    </article>
  );
}

function statusClass(status: LeadStatus) {
  const classes: Record<LeadStatus, string> = {
    novo: "bg-[#fff8cc] text-[#5a180f]",
    qualificado: "bg-blue-100 text-blue-800",
    contatado: "bg-purple-100 text-purple-800",
    convertido: "bg-emerald-100 text-emerald-800",
  };

  return classes[status];
}

function LeadDetailsModal({
  lead,
  fechar,
  salvarObservacoes,
  atualizarStatus,
}: {
  lead: Lead;
  fechar: () => void;
  salvarObservacoes: (observacoes: string) => void;
  atualizarStatus: (status: LeadStatus) => void;
}) {
  const [observacoes, setObservacoes] = useState(lead.observacoes ?? "");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6">
      <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-200 bg-white p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9d1f16]">
              Detalhe do lead
            </p>
            <h2 className="mt-2 text-2xl font-black">{lead.nome}</h2>
            <p className="mt-1 text-sm font-semibold text-zinc-700">
              {lead.origem} ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ {lead.destino}
            </p>
          </div>
          <button
            type="button"
            onClick={fechar}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-black text-zinc-700"
          >
            Fechar
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <InfoItem label="WhatsApp" value={lead.telefone} />
          <InfoItem label="Fonte" value={lead.fonte} />
          <InfoItem label="Viagem" value={formatDate(lead.data_viagem)} />
          <InfoItem label="Recebido" value={formatRelativeDate(lead.created_at)} />
        </div>

        <label className="mt-5 grid gap-1.5 text-sm font-black text-zinc-800">
          Status
          <select
            value={lead.status}
            onChange={(event) => atualizarStatus(event.target.value as LeadStatus)}
            className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold outline-none focus:border-[#9d1f16] focus:ring-2 focus:ring-[#f3c400]/40"
          >
            {statusOrder.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-5 grid gap-1.5 text-sm font-black text-zinc-800">
          Observacoes internas
          <textarea
            value={observacoes}
            onChange={(event) => setObservacoes(event.target.value)}
            rows={6}
            className="resize-none rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold outline-none focus:border-[#9d1f16] focus:ring-2 focus:ring-[#f3c400]/40"
            placeholder="Ex.: preferiu viajar de noite, pediu desconto, retornar amanha..."
          />
        </label>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href={whatsAppUrl(lead)}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-zinc-950 px-5 py-3 text-center text-sm font-black text-[#f3c400]"
          >
            Chamar no WhatsApp
          </a>
          <button
            type="button"
            onClick={() => salvarObservacoes(observacoes)}
            className="rounded-lg bg-[#9d1f16] px-5 py-3 text-sm font-black text-white"
          >
            Salvar observacoes
          </button>
        </div>
      </section>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-[#fafaf7] p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-zinc-800">{value}</p>
    </div>
  );
}

function LeadMiniCard({
  lead,
  dark,
  nextStatus,
  atualizarStatus,
}: {
  lead: Lead;
  dark?: boolean;
  nextStatus?: LeadStatus;
  atualizarStatus?: (id: string, status: LeadStatus) => void;
}) {
  return (
    <article className={`rounded-lg p-4 ${dark ? "border border-zinc-200 bg-[#fafaf7] text-zinc-950" : "border border-zinc-200 bg-[#fafaf7]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black">{lead.nome}</h3>
          <p className="mt-1 text-sm font-semibold text-zinc-700">
            {lead.origem} ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ {lead.destino}
          </p>
        </div>
        <span className="text-xs font-black text-[#9d1f16]">{formatRelativeDate(lead.created_at)}</span>
      </div>
      <p className="mt-2 text-sm text-zinc-600">Viagem: {formatDate(lead.data_viagem)}</p>
      {nextStatus && atualizarStatus ? (
        <button
          onClick={() => atualizarStatus(lead.id, nextStatus)}
            className="mt-3 w-full rounded-lg border border-[#9d1f16]/25 bg-white px-3 py-2 text-xs font-black text-[#9d1f16] transition hover:bg-[#9d1f16] hover:text-white"
        >
          Mover para {statusLabels[nextStatus]}
        </button>
      ) : null}
    </article>
  );
}

function EmptyLeads() {
  return (
    <section className="rounded-lg border border-dashed border-[#9d1f16]/35 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Nenhum lead real ainda.</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
        Divulgue o formulario publico para captar o primeiro interessado. Quando alguem preencher,
        ele aparecera automaticamente nesta tela.
      </p>
      <Link href="/captacao" className="mt-5 inline-block rounded-lg bg-[#9d1f16] px-5 py-3 text-sm font-black text-white">
        Abrir formulario de captacao
      </Link>
    </section>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-black text-zinc-800">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-zinc-300 px-4 py-3 text-sm font-semibold outline-none focus:border-[#9d1f16] focus:ring-2 focus:ring-[#f3c400]/40"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function MetricCard({
  titulo,
  valor,
  detalhe,
  destaque,
}: {
  titulo: string;
  valor: number;
  detalhe: string;
  destaque?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-5 shadow-sm ${destaque ? "border-[#9d1f16]/20 bg-[#fff8cc]" : "border-zinc-200 bg-white"}`}>
      <strong className="block text-3xl font-black text-[#9d1f16]">
        {valor}
      </strong>
      <span className="mt-1 block text-sm font-black text-zinc-800">
        {titulo}
      </span>
      <span className="mt-2 block text-xs font-semibold text-zinc-500">
        {detalhe}
      </span>
    </div>
  );
}

function FunnelBar({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage = Math.round((value / total) * 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold">
        <span>{label}</span>
        <span className="text-zinc-500">{value} ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {percentage}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-zinc-200">
        <div className="h-full rounded-full bg-[#9d1f16]" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function SourceBar({
  fonte,
  total,
  max,
}: {
  fonte: string;
  total: number;
  max: number;
}) {
  const percentage = Math.max(8, Math.round((total / Math.max(max, 1)) * 100));

  return (
    <div className="rounded-lg border border-zinc-200 p-4">
      <div className="flex items-center justify-between gap-3 text-sm font-bold">
        <span>{fonte}</span>
        <span className="text-[#9d1f16]">{total}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
        <div className="h-full rounded-full bg-[#f3c400]" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function PageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9d1f16]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
        {title}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 sm:text-base">
        {description}
      </p>
    </section>
  );
}

function NavButton({
  ativo,
  label,
  resumo,
  onClick,
}: {
  ativo: boolean;
  label: string;
  resumo: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-3 text-left transition ${
        ativo
          ? "bg-[#fff8cc] text-[#5a180f]"
          : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      <strong className="block text-sm font-black">{label}</strong>
      <span className="mt-1 block text-xs font-semibold opacity-80">{resumo}</span>
    </button>
  );
}


function Card({ numero, texto }: { numero: number; texto: string }) {
  return <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"><strong className="block text-2xl font-black text-[#9d1f16]">{numero}</strong><span className="text-xs font-semibold text-zinc-600">{texto}</span></div>;
}
