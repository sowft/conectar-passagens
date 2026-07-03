import LeadForm from "@/components/LeadForm";

const leads = [
  {
    nome: "Ana Paula",
    rota: "Vitoria -> Rio de Janeiro",
    perfil: "Compra urgente",
    canal: "WhatsApp ativo",
    prioridade: "Alta",
  },
  {
    nome: "Grupo Sol Nascente",
    rota: "Colatina -> Sao Paulo",
    perfil: "Empresa recorrente",
    canal: "Proposta comercial",
    prioridade: "Alta",
  },
  {
    nome: "Carlos Mendes",
    rota: "Cachoeiro -> Belo Horizonte",
    perfil: "Pesquisa de preco",
    canal: "Remarketing",
    prioridade: "Media",
  },
];

const canais = [
  {
    titulo: "Cliente urgente",
    descricao: "Mensagem direta no WhatsApp com disponibilidade, horario e preco.",
    acao: "Converter em ate 15 min",
  },
  {
    titulo: "Empresa",
    descricao: "Oferta recorrente, relatorio de economia e atendimento dedicado.",
    acao: "Enviar proposta",
  },
  {
    titulo: "Planejamento familiar",
    descricao: "Campanha com conforto, seguranca e comparativo de datas.",
    acao: "Nutrir por conteudo",
  },
];

const metricas = [
  ["128", "leads mapeados"],
  ["42", "contatos quentes"],
  ["18", "empresas alvo"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f7f2] text-zinc-950">
      <section className="border-b-4 border-[#f3c400] bg-[#9d1f16] text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-10">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-md bg-[#f3c400] px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#3b120d]">
                  MVP Comercial
                </span>
                <span className="text-sm font-semibold text-[#ffe98a]">
                  Conectar Passagens
                </span>
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                Plataforma para captar clientes e direcionar campanhas de
                passagens.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[#ffeec0] sm:text-lg">
                Uma primeira versao para demonstrar busca de potenciais
                clientes, classificacao por perfil e divulgacao dos servicos
                certos para cada oportunidade.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {metricas.map(([numero, label]) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/20 bg-white/10 p-4"
                >
                  <strong className="block text-3xl font-black text-[#f3c400]">
                    {numero}
                  </strong>
                  <span className="mt-1 block text-sm font-semibold text-white">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 text-zinc-950 shadow-xl">
            <div className="rounded-md border border-zinc-200 bg-[#fffdf2] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d1f16]">
                Visao do funil
              </p>
              <div className="mt-5 grid gap-3">
                {["Busca online", "Lead qualificado", "Contato comercial", "Venda"].map(
                  (etapa, index) => (
                    <div key={etapa} className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-[#9d1f16] text-sm font-black text-white">
                        {index + 1}
                      </span>
                      <div className="h-3 flex-1 rounded-full bg-zinc-200">
                        <div
                          className="h-3 rounded-full bg-[#f3c400]"
                          style={{ width: `${95 - index * 18}%` }}
                        />
                      </div>
                      <span className="w-32 text-sm font-bold text-zinc-800">
                        {etapa}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="mt-4 rounded-md bg-zinc-950 p-4 text-white">
              <p className="text-sm font-semibold text-[#f3c400]">
                Rotas em destaque
              </p>
              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm font-bold">
                <span>ES</span>
                <span className="h-1 w-full rounded-full bg-[#f3c400]" />
                <span className="text-right">SP / RJ / MG</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Painel pronto para mostrar onde existe demanda e qual abordagem
                comercial usar primeiro.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <LeadForm />

        <div className="grid gap-6">
          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d1f16]">
                  Busca comercial
                </p>
                <h2 className="mt-1 text-2xl font-black text-zinc-950">
                  Potenciais clientes encontrados
                </h2>
              </div>
              <span className="rounded-md bg-[#f3c400] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#3b120d]">
                demo
              </span>
            </div>

            <div className="grid gap-3">
              {leads.map((lead) => (
                <article
                  key={lead.nome}
                  className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-zinc-950">
                        {lead.nome}
                      </h3>
                      <span className="rounded-full bg-[#9d1f16]/10 px-2.5 py-1 text-xs font-bold text-[#9d1f16]">
                        {lead.prioridade}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-zinc-700">
                      {lead.rota}
                    </p>
                    <p className="mt-2 text-sm text-zinc-600">
                      Perfil: {lead.perfil}
                    </p>
                  </div>
                  <div className="rounded-md bg-zinc-950 px-4 py-3 text-sm font-bold text-[#f3c400]">
                    {lead.canal}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d1f16]">
              Divulgacao por perfil
            </p>
            <h2 className="mt-1 text-2xl font-black text-zinc-950">
              Servico certo para cada tipo de cliente
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {canais.map((canal) => (
              <article
                key={canal.titulo}
                className="rounded-lg border border-zinc-200 bg-[#fffdf2] p-5"
              >
                <h3 className="text-lg font-black text-zinc-950">
                  {canal.titulo}
                </h3>
                <p className="mt-3 min-h-20 text-sm leading-6 text-zinc-700">
                  {canal.descricao}
                </p>
                <p className="mt-4 rounded-md bg-[#9d1f16] px-3 py-2 text-sm font-bold text-white">
                  {canal.acao}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
