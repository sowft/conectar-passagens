# Ativacao da prospeccao

O endereco publico e reconhecido por `PUBLIC_APP_URL`, quando definido, ou pelas variaveis de sistema `VERCEL_PROJECT_PRODUCTION_URL` e `VERCEL_URL` fornecidas pela Vercel. A mesma resolucao e usada na verificacao de ativacao e nos links de autenticacao. Uma URL explicita invalida continua aparecendo como pendencia; o sistema nao considera localhost um endereco publico. Dominio proprio pode ser definido em `PUBLIC_APP_URL`.

## Contas individuais e recuperacao para qualquer e-mail

O cadastro e a redefinicao de contas individuais aceitam senhas a partir de 6 caracteres. A politica de senha do Supabase tambem precisa permitir esse minimo. O acesso administrativo original mantem sua configuracao separada.

A tela inicial oferece Entrar e Criar conta. Qualquer pessoa pode informar seu proprio e-mail, cadastrar uma senha e confirmar o endereco. Esqueci minha senha aceita qualquer e-mail valido e encaminha a recuperacao ao Supabase Auth. A resposta nao revela se a conta existe. Cada conta ve apenas suas campanhas e os contatos vinculados a elas. Os dados antigos sem proprietario continuam restritos ao administrador original, que entra com e-mail vazio.

Para ativar na hospedagem:

1. Execute `supabase-contas.sql` depois de `supabase-leads.sql`. Se repetir a migracao geral, repita tambem a de contas para restaurar as permissoes individuais. As tabelas `auth.users` e a funcao `auth.uid()` sao fornecidas pelo Supabase.
2. Cadastre `NEXT_PUBLIC_SUPABASE_ANON_KEY` ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` na Vercel, alem da URL do Supabase. A chave publica e diferente da chave privada usada apenas pelo servidor administrativo. Defina `PUBLIC_APP_URL=https://conectar-passagens.vercel.app`.
3. No Supabase, em Authentication, habilite cadastro por e-mail e configure URL Configuration com Site URL `https://conectar-passagens.vercel.app` e Redirect URLs `https://conectar-passagens.vercel.app/auth/callback` e `https://conectar-passagens.vercel.app/auth/callback?next=/redefinir-senha`.
4. Configure SMTP em Authentication para entrega a destinatarios externos. O envio padrao do Supabase tem restricoes e nao garante e-mail para qualquer pessoa. Referencia: https://supabase.com/docs/guides/auth/auth-smtp
5. Para links que possam ser abertos em outro navegador/aparelho, use os modelos de e-mail com token_hash: confirmacao `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirmar e-mail</a>` e recuperacao `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Redefinir senha</a>`. Sem a adaptacao, o fluxo PKCE padrao exige abrir o link no navegador onde foi solicitado.
6. Publique novamente e teste com duas contas: cadastro, confirmacao, login, recuperacao e isolamento de campanhas/contatos. Teste envio real: testes simulados nao comprovam entrega SMTP.

O fluxo de contas individuais nao exige `ADMIN_RECOVERY_EMAIL` nem a integracao direta `RESEND_API_KEY` do fluxo administrativo antigo. As senhas e os links individuais sao geridos pelo Supabase Auth; o servidor verifica o usuario antes de acessar o banco com o JWT dessa pessoa e RLS. Nao ha acesso publico aos dados administrativos.

Se o projeto Supabase tiver a tabela antiga `leads` com apenas `id`, `nome`, `telefone`, `origem`, `destino` e `created_at`, execute o `supabase-leads.sql` atualizado por completo. Ele acrescenta os campos do CRM sem excluir linhas ou alterar o identificador numerico existente. O aplicativo aceita identificadores bigint e UUID e pede ao banco que devolva o ID como texto, preservando a precisao. A migracao roda em uma transacao e pode ser repetida. Execute tambem `supabase-auth-recovery.sql` para a recuperacao administrativa.

## Instalar no Android, iPhone e Windows

O app inclui manifesto PWA, icones e a pagina `/instalar`. Envie `https://conectar-passagens.vercel.app/instalar` para orientar a instalacao. Android: Chrome > menu > Instalar aplicativo. iPhone/iPad: Safari > Compartilhar > Adicionar a Tela de Inicio. Windows: Chrome/Edge > icone de instalacao ou menu > Instalar aplicativo. A disponibilidade e o nome das opcoes dependem do navegador. Navegadores internos de mensageiros podem exigir abrir no navegador principal.

O app instalado usa o mesmo servidor e as mesmas credenciais. Consultas, login e gravacoes exigem internet. O service worker guarda somente uma pagina publica de aviso de falta de conexao; nao guarda contatos, respostas de API nem paginas autenticadas. Atualizacoes sao recebidas pelo site, sem reenviar um instalador.

## Acesso administrativo original

O administrador original ainda pode entrar com e-mail vazio e a senha configurada na hospedagem. O fluxo novo de contas individuais nao altera essa senha. A recuperacao administrativa anterior permanece apenas como compatibilidade na API com `mode: "admin"`, se ja tiver sido configurada com `ADMIN_RECOVERY_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` e `supabase-auth-recovery.sql`. Esses valores nao sao necessarios para cadastrar e recuperar contas individuais. Depois de recuperar uma senha administrativa por esse mecanismo antigo, preserve sua configuracao e a tabela `admin_access`, pois o banco passa a ser a fonte da senha recuperada.

Proteja login e recuperacao contra abuso no provedor. Confirme a entrega real de e-mail e a instalacao nos aparelhos antes do aceite; build e testes com simulacoes nao comprovam esses servicos externos.

O codigo inclui pesquisa de empresas pelo Google Places, campanhas persistidas, links por campanha/canal, formulario com autorizacao de contato, funil manual e encaminhamento para a ClickBus. Isso nao publica anuncios automaticamente nem confirma compras no site externo.

## Situacao da operacao

Nao ha contas externas disponiveis informadas pela empresa. O sistema ainda nao esta ativado para uso publico. Codigo compilado e testes com simulacoes nao substituem uma campanha publicada e uma compra real conciliada.

Para iniciar com divulgacao manual, o minimo e uma hospedagem HTTPS com o aplicativo Next.js em execucao e um projeto Supabase configurado. Contas de anuncios e Google Places sao opcionais para esse primeiro canal. Integracao de compra exige acesso autorizado a uma plataforma que forneca os dados de venda; nao existe confirmacao automatica da ClickBus implementada.

Nao divulgue links de localhost. Crie as contas em nome da empresa e configure credenciais diretamente no servidor ou com `npm run configurar`, sem envia-las pelo chat.

## Medicao de aquisicao

Os novos links de campanha usam `/r/ID_DA_CAMPANHA?fonte=CANAL`. O servidor verifica campanha e canal, persiste uma entrada e redireciona para o formulario com atribuicao assinada, valida por sete dias. O formulario associa o lead a essa entrada. A assinatura impede trocar campanha/canal de um acesso rastreado pelo navegador.

Links antigos de `/captacao` continuam aceitos, mas nao registram entradas. Preenchimentos sem atribuicao assinada mantem a origem informada e nao comprovam um acesso rastreado. A contagem de interessados inclui esses cadastros.

O botao de compra envia um POST a `/comprar`. Para entradas rastreadas, o encaminhamento e persistido uma vez por entrada; repeticoes nao inflam essa metrica. O destino e fixo na ClickBus. Falha de persistencia gera erro em vez de simular registro. Sem atribuicao, o visitante segue para a ClickBus sem metrica de campanha.

Entradas representam acessos ao link: repeticoes e robos podem estar incluidos. Um HEAD nao cria entrada. O teste do link pelo painel cria uma entrada real e esta identificado na interface. Esses numeros nao sao pessoas unicas nem impressoes de anuncios. Encaminhamento nao e venda. O status convertido continua sendo uma informacao manual da equipe.

O painel Inicio verifica credenciais, estrutura, consulta de metricas e presenca de endereco publico HTTPS. A aba Campanhas mostra entradas, interessados e encaminhamentos por canal. Use Atualizar para consultar novamente entradas/encaminhamentos; para interessados novos, atualize os leads ou recarregue a pagina. A verificacao tecnica nao testa disponibilidade externa, entrega de anuncios nem compras.

## Comece por aqui

Para abrir apenas o painel local, inicie o servidor de desenvolvimento e acesse `/configurar` por `127.0.0.1` ou `localhost`. Escolha uma senha com pelo menos 12 caracteres. O assistente grava somente o hash scrypt da senha e a assinatura de sessao em `.env.local`, preservando as demais configuracoes. Depois volte ao login, deixe o e-mail vazio e use sua senha. O assistente nao redefine administradores existentes, exige mesma origem e nao funciona em producao. Isso libera acesso local ao painel; captacao e campanhas ainda precisam do Supabase.

Se o processo for interrompido durante a configuracao e deixar `.local-data/setup.lock`, encerre o servidor e remova somente esse arquivo antes de tentar novamente. Para alterar uma senha existente, use `npm run configurar` no terminal.

1. Acesse https://supabase.com/dashboard com a conta que criou o projeto. O endereco do banco ja esta em `.env.local`; tente recuperar o acesso antes de criar outro projeto para nao perder a ligacao com os dados existentes.
2. No projeto, abra Settings > API Keys e obtenha a chave secreta de servidor (`sb_secret_...`). Nunca envie essa chave em mensagens. Referencia oficial: https://supabase.com/docs/guides/getting-started/api-keys
3. No terminal da pasta do projeto, execute `npm run configurar`. O assistente pede a chave de forma oculta e permite definir a senha administrativa. Enter mantem valores existentes. A chave do Google pode ficar para depois.
4. Abra o SQL Editor do projeto e execute o arquivo `supabase-leads.sql` completo. Nao execute em outro projeto por engano.
5. Execute `npm run diagnostico`. Ele verifica configuracao e estrutura das tabelas sem exibir chaves nem ler registros de clientes. Chave Google presente nao significa API validada: isso exige uma busca real.
6. Reinicie `npm run dev` e entre usando a senha administrativa, com o email vazio.

O assistente funciona no Windows/PowerShell e grava somente `.env.local`, que esta ignorado pelo Git. Para publicar, as variaveis tambem precisam ser cadastradas na hospedagem. Nenhum desses comandos publica ou cria servicos pagos.

## Configurar o servidor

No arquivo `.env.local` (nunca publique seu conteudo):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=URL_DO_PROJETO
NEXT_PUBLIC_SUPABASE_ANON_KEY=CHAVE_PUBLICA_DO_PROJETO
SUPABASE_SECRET_KEY=CHAVE_SECRETA_DO_SUPABASE
SESSION_SECRET=SEGREDO_ALEATORIO_COM_PELO_MENOS_32_CARACTERES
ADMIN_PASSWORD=SENHA_FORTE_DE_ACESSO_INTERNO
GOOGLE_PLACES_API_KEY=CHAVE_DA_PLACES_API_NEW
LEAD_INGEST_TOKEN=TOKEN_ALEATORIO_COM_PELO_MENOS_32_CARACTERES
PUBLIC_APP_URL=https://ENDERECO_PUBLICO_DA_APLICACAO
```

SUPABASE_SERVICE_ROLE_KEY legado continua aceito como alternativa. SESSION_SECRET ja foi gerado localmente nesta implementacao. Configure os demais valores necessarios. Nunca use NEXT_PUBLIC_ para as chaves de servidor. A chave publica e usada nas contas individuais com RLS. O login administrativo usa e-mail vazio e ADMIN_PASSWORD ou ADMIN_PASSWORD_HASH. Contas novas sao criadas pelo Supabase Auth; os hashes antigos de usuarios nao sao usados para cadastrar ou recuperar essas contas.

1. Execute `supabase-leads.sql` no SQL Editor do seu projeto Supabase. A migracao preserva leads existentes e revoga leitura/escrita anonimas. Ela pode ser executada novamente.
2. Ative Places API (New) no Google Cloud, configure faturamento, restrinja a chave e defina cotas. O app solicita nome, endereco, telefone e site em ate 10 resultados por busca. As consultas podem gerar cobranca do Google.
3. Reinicie com `npm run dev`. Para captar pessoas externas, publique o app em um dominio HTTPS e configure as mesmas variaveis no provedor.
4. Entre, abra Prospectar, pesquise segmento/cidade e salve uma campanha. Abra Campanhas e copie um link por canal. Divulgacao e contato sao manuais.
5. Envie um formulario de teste e confira origem, campanha, autorizacao e etapas no funil. Pause a campanha e confirme que novos cadastros sao recusados.

## Google e compra

A pesquisa Google requer chave; sem ela, o app explica a pendencia e oferece abrir o Google Maps. Resultados ficam apenas em memoria na tela, sem importacao automatica para o CRM. A equipe qualifica o contato e envia o formulario para registrar interesse. Antes de publicar, disponibilize termos de uso e politica de privacidade da empresa, incluindo as referencias exigidas pelo Google.

Documentacao: https://developers.google.com/maps/documentation/places/web-service/text-search
Atribuicao: https://developers.google.com/maps/documentation/places/web-service/policies

O destino informado e https://www.clickbus.com.br/viacao/itapemirim. O link aparece no formulario e na mensagem sugerida de WhatsApp. Clique no link nao significa compra. A conversao e marcada manualmente pela equipe; conciliacao automatica exige uma integracao disponibilizada pela plataforma de vendas.

## Entrada de leads externos

`POST /api/integrations/leads`, com `Authorization: Bearer SEU_LEAD_INGEST_TOKEN` e `Content-Type: application/json`.

```json
{
  "nome": "Contato de teste",
  "telefone": "27999999999",
  "origem": "Vitoria",
  "destino": "Sao Paulo",
  "data_viagem": "2027-01-20",
  "fonte": "Google Ads",
  "campaign_id": "UUID_DE_UMA_CAMPANHA_ATIVA",
  "consentimento": true
}
```

Retorna 201 quando gravado. O conector externo deve enviar apenas contatos com autorizacao registrada. Este endpoint recebe dados; nao e um conector nativo Meta/Google Ads. Nao reenvie automaticamente uma mesma submissao: ainda nao existe deduplicacao por ID externo.

## Validacao

`node --test tests/server.mjs`, `npx tsc --noEmit`, `npm run lint` e `npm run build`.

Para producao, complete a verificacao integrada com suas contas, configure protecao de abuso/rate limiting no provedor para login e formulario, e revise acessos de equipe. Usuarios legados ainda usam o hash do prototipo; a migracao para autenticacao gerenciada continua pendente.

## Aceite operacional antes de divulgar

1. Configure hospedagem, variaveis e banco; aplique o SQL completo, incluindo campaign_visits, purchase_clicks e campaign_metrics. Restrinja o acesso aos dados e configure backup/restauracao no banco.
2. Confira `npm run diagnostico` no ambiente publicado. Configure protecao de abuso para login, formulario e links rastreados no provedor. Revise os usuarios legados antes de conceder acesso a equipe.
3. Crie uma campanha e abra o link por um dispositivo externo. Confira a entrada no canal correto, preencha o formulario e confirme o lead. O formulario coleta autorizacao de contato; a empresa ainda precisa disponibilizar suas informacoes de privacidade e contato.
4. Use o botao de compra, confira o encaminhamento no painel e confirme que um segundo clique da mesma entrada nao aumenta o total. Nao marque uma venda com base nesse numero.
5. Pause a campanha; confirme que o link e o cadastro da campanha sao recusados. Simule indisponibilidade do banco em homologacao e confira os erros. Evite testes de falha no ambiente com clientes.
6. Valide atendimento com um responsavel, horario de retorno e procedimento para registrar vendas com comprovante. Execute uma jornada real e concilie a compra na plataforma de vendas. Somente entao declare o canal operacional.
