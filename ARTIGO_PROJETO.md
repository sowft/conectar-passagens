# Conectar Passagens: da ideia inicial a uma central de prospeccao comercial

> Registro historico de uma etapa anterior. Para o estado atual, limitacoes e ativacao, consulte ATIVACAO.md e execute o diagnostico. As afirmacoes abaixo sobre disponibilidade nao comprovam uma operacao publicada.

## Visao geral

O projeto Conectar Passagens comecou como uma aplicacao voltada para consulta e atendimento de passagens rodoviarias. A ideia inicial misturava busca de rotas, atendimento e uma lista demonstrativa de potenciais clientes. Depois da conversa sobre o objetivo real do sistema, ficou claro que a necessidade principal nao era apenas procurar passagens, mas criar uma estrutura de growth e prospeccao para captar pessoas interessadas em comprar passagens.

A mudanca conceitual mais importante foi parar de simular que o sistema encontrava clientes automaticamente em canais como Google, WhatsApp ou redes sociais. Em vez disso, o projeto passou a trabalhar com um fluxo realista: criar mecanismos de captacao, receber dados de pessoas interessadas, registrar esses contatos em banco de dados e permitir que a equipe acompanhe cada lead ate a conversao.

Com isso, a aplicacao se tornou uma central de prospeccao da Conectar Passagens.

## Problema que o projeto resolve

Uma empresa de passagens nao consegue simplesmente "descobrir" clientes do nada. Para encontrar pessoas com intencao de compra, e necessario usar fontes de dados ou mecanismos de captacao. Esses mecanismos podem ser anuncios, formularios, campanhas, grupos autorizados, bases proprias ou integracoes futuras com plataformas externas.

O projeto agora resolve o primeiro ciclo real desse processo:

1. A empresa divulga uma campanha ou link publico.
2. A pessoa interessada preenche um formulario de captacao.
3. O lead e salvo no Supabase.
4. A equipe visualiza o lead na area interna.
5. A equipe chama o contato no WhatsApp.
6. O status do lead avanca no funil comercial.

Esse ciclo ja permite demonstrar valor real sem depender, neste primeiro momento, de integracoes com Meta Ads, Google Ads ou outras APIs externas.

## Nova estrutura da aplicacao

A tela principal foi reorganizada em cinco areas:

## Inicio

A aba Inicio apresenta um resumo comercial da operacao. Ela mostra a quantidade de leads captados, quantos foram convertidos e um resumo por status: novos, qualificados, contatados e convertidos.

Tambem exibe a prospeccao ativa, com informacoes como produto divulgado, publico-alvo, regiao e perfil. Isso ajuda a equipe a entender qual estrategia esta em andamento.

## Prospectar

A aba Prospectar permite configurar uma nova estrategia de captacao. Em vez de perguntar apenas origem e destino, a tela agora pergunta:

- O que deseja divulgar.
- Qual publico deseja alcancar.
- Qual regiao sera trabalhada.
- Qual perfil de cliente sera priorizado.
- Quais canais de aquisicao serao usados.

Essa mudanca posiciona o sistema como uma ferramenta comercial. A equipe deixa de apenas pesquisar rotas e passa a estruturar a captacao de clientes.

## Oportunidades

A aba Oportunidades lista os leads reais salvos no Supabase. Cada card mostra nome, telefone, origem, destino, data da viagem, fonte de captacao, data de recebimento e status.

Essa area tambem ganhou filtros para facilitar a gestao comercial:

- Busca por nome, telefone, rota ou fonte.
- Filtro por status.
- Filtro por fonte.
- Filtro por data inicial e final.

Com isso, a equipe pode encontrar rapidamente leads de uma campanha especifica, contatos novos, pessoas de uma rota determinada ou oportunidades recebidas em um periodo.

## Campanhas

A aba Campanhas organiza os links que podem ser divulgados em canais diferentes. Agora existem links rastreaveis, como:

- `/captacao?fonte=Instagram`
- `/captacao?fonte=WhatsApp`
- `/captacao?fonte=Google%20Ads`
- `/captacao?fonte=Landing%20Page`

Quando alguem entra por um desses links e preenche o formulario, a fonte fica salva junto com o lead. Isso permite medir quais canais estao gerando oportunidades.

## Funil

A aba Funil organiza os leads por etapa comercial:

- Novo.
- Qualificado.
- Contatado.
- Convertido.

Cada lead pode ser movido para a proxima etapa. Isso transforma a aplicacao em uma ferramenta de acompanhamento de vendas, nao apenas uma lista de contatos.

## Pagina publica de captacao

Foi criada a rota `/captacao`, que funciona como uma landing page simples para pessoas interessadas em passagens.

O formulario pede:

- Nome.
- WhatsApp.
- Origem.
- Destino.
- Data pretendida da viagem.

Ao enviar, a pagina chama a API interna do projeto e registra o lead no Supabase. O usuario recebe uma mensagem de sucesso informando que a equipe entrara em contato.

Essa pagina e o primeiro mecanismo real de captacao do sistema. Ela pode ser usada em campanhas de Instagram, WhatsApp, Google Ads, grupos autorizados ou qualquer outro canal.

## API interna implementada

Tambem foi criada a rota `/api/leads`, que centraliza as operacoes com leads.

A API possui tres operacoes principais:

## GET /api/leads

Lista os leads cadastrados no Supabase, ordenados pelos mais recentes.

Essa rota e usada pela tela interna para carregar oportunidades e alimentar o dashboard.

## POST /api/leads

Cria um novo lead a partir do formulario publico.

A API valida se os campos obrigatorios foram preenchidos:

- Nome.
- Telefone.
- Origem.
- Destino.
- Data da viagem.

Depois salva o lead com status inicial `novo`.

## PATCH /api/leads

Atualiza o status de um lead existente.

Essa rota e usada quando a equipe muda o lead de etapa no funil ou altera o status dentro de Oportunidades.

## Por que a API foi importante

Antes, a aplicacao fazia chamadas diretas ao Supabase a partir das telas. Isso funciona em MVPs simples, mas nao e o melhor caminho para crescer o projeto.

Ao criar uma API interna, o sistema ganha um ponto central para:

- Validar dados.
- Padronizar erros.
- Controlar regras de negocio.
- Evoluir seguranca.
- Conectar futuras integracoes externas.
- Evitar espalhar logica de banco em varias telas.

Esse e um passo importante para transformar o projeto em uma aplicacao mais profissional.

## Ajuste na configuracao do Next.js

O projeto estava configurado com `output: "export"` no `next.config.ts`. Essa opcao gera um site estatico, mas nao combina com rotas de API dinamicas.

Para implementar `/api/leads`, essa configuracao foi removida. Agora o projeto pode usar recursos server-side do Next.js, incluindo API routes.

O build passou a reconhecer:

- `/` como pagina estatica.
- `/captacao` como pagina estatica.
- `/api/leads` como rota dinamica.

## Banco de dados no Supabase

Foi criado o arquivo `supabase-leads.sql`, com a estrutura da tabela `leads`.

A tabela possui campos como:

- `id`
- `nome`
- `telefone`
- `origem`
- `destino`
- `data_viagem`
- `fonte`
- `status`
- `created_at`

Tambem foram adicionadas policies iniciais para permitir o funcionamento do MVP. Essas permissoes estao abertas o suficiente para demonstracao e precisam ser endurecidas antes de uma versao de producao.

## O que ja funciona

Neste ponto, o projeto ja possui:

- Central de prospeccao interna.
- Configuracao de prospeccao.
- Pagina publica de captacao.
- Registro de leads no Supabase.
- API interna para listar, criar e atualizar leads.
- Filtros em Oportunidades.
- Links rastreaveis por fonte de campanha.
- Botao de WhatsApp para abordagem comercial.
- Funil visual por status.
- Build e lint passando.

## O que ainda precisa evoluir

O principal proximo passo e seguranca. Hoje o MVP prioriza funcionamento e demonstracao. Para producao, sera necessario implementar:

- Login para area interna.
- Policies mais restritas no Supabase.
- Leitura de leads apenas para usuarios autorizados.
- Atualizacao de status apenas por equipe logada.
- Protecao contra spam no formulario publico.
- Validacao mais forte de telefone e data.

Depois disso, o projeto pode evoluir para:

- Historico de interacoes por lead.
- Campo de observacoes internas.
- Score automatico de prioridade.
- Dashboard de conversao por fonte.
- Integracao com Meta Ads.
- Integracao com Google Ads.
- Exportacao de leads.
- Notificacoes para novos contatos.

## Conclusao

A aplicacao deixou de ser apenas uma tela de consulta ou demonstracao e passou a representar um fluxo comercial real. Agora existe uma base concreta para captar interessados, organizar oportunidades e acompanhar conversoes.

O projeto ainda esta em fase de MVP, mas ja possui a espinha dorsal correta: campanha, formulario, lead, oportunidade, contato e funil. Essa estrutura permite mostrar ao cliente ou gestor uma visao clara do valor da ferramenta e tambem oferece um caminho tecnico consistente para evoluir com integracoes mais avancadas.
