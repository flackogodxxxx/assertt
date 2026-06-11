# Assert CRM: QC, IA, arquivamento e notificacoes em tempo real

## Objetivo

Melhorar as telas de correcao/QC e IA Assert para uso operacional em desktop e mobile, preservar demandas aprovadas no historico do cliente, restringir exclusao definitiva a administradores e garantir notificacoes imediatas via Supabase Realtime.

## Escopo

- Redesenhar a experiencia de revisao de demandas, com foco em clareza, espacamento e produtividade.
- Redesenhar a pagina IA Assert mantendo Gemini direto, sem n8n.
- Retirar demandas concluidas das superficies operacionais.
- Exibir demandas concluidas no historico do perfil do cliente.
- Permitir exclusao definitiva somente para Admin e somente no historico arquivado.
- Entregar notificacoes persistidas pelo Supabase em tempo real, com toast, contador e som.
- Verificar configuracao Vercel, variaveis de ambiente e integracao com Supabase antes do deploy.

## Fluxo da demanda

1. Admin ou Organizador cria a demanda.
2. O frontend grava a demanda em `production_tasks`.
3. Depois de receber os IDs persistidos, o frontend grava uma notificacao em `notifications` para cada responsavel.
4. O Supabase Realtime entrega a nova demanda e a notificacao para as sessoes abertas.
5. O responsavel produz e envia o material para revisao.
6. Admin ou Organizador abre a experiencia de QC, aprova ou solicita ajustes.
7. Ao solicitar ajustes, a demanda volta para producao e preserva os comentarios com minutagem.
8. Ao aprovar, o status passa para `Concluido`/`delivered`.
9. Demandas concluidas deixam Kanban, dashboard, calendario operacional e listas de trabalho.
10. A demanda permanece no Supabase e aparece na aba Arquivadas do perfil do cliente.

## Experiencia de QC

A revisao sera apresentada como uma area de trabalho dedicada dentro da tela de demandas:

- Cabecalho compacto com cliente, titulo, tipo, status, prazo e responsaveis.
- Area principal desktop em duas colunas:
  - Midia em destaque, com proporcao estavel e controles previsiveis.
  - Timeline de correcoes, com comentarios, autor e timestamps clicaveis.
- Campo de nova correcao fixo no painel de comentarios.
- Briefing, links de origem e entrega em uma secao secundaria recolhivel.
- Barra de decisao persistente com:
  - `Solicitar ajustes`, que exige ao menos um comentario novo ou existente.
  - `Aprovar e arquivar`, que conclui a demanda.
- Em mobile, midia, contexto e comentarios ficam em fluxo vertical; as acoes permanecem acessiveis na parte inferior.
- Icones Lucide, tooltips nos controles pouco obvios e estados de carregamento/desabilitado.

## Experiencia IA Assert

A pagina sera uma estacao de trabalho, sem composicao de landing page:

- Cabecalho compacto com modo atual e acao para iniciar novo processamento.
- Controle segmentado para `Legenda e revisao` e `Copywriter`.
- Opcoes do modo em uma barra lateral curta no desktop e bloco superior no mobile.
- Upload central compacto, com estados de arrastar, processar, erro e arquivo selecionado.
- Resultado com hierarquia de leitura:
  - Resumo/status.
  - Conteudo principal.
  - Hooks, hashtags ou correcoes em blocos auxiliares.
- Copiar usa icone, feedback temporario e tooltip.
- O resultado anterior continua salvo localmente por uma hora.
- A integracao permanece direta com Gemini usando as variaveis `VITE_GEMINI_*`.

## Arquivamento e historico

Nao sera criada uma segunda copia da demanda. O status concluido sera a fonte de verdade:

- `production_tasks.status = delivered` representa demanda arquivada.
- A colecao operacional filtra demandas concluidas.
- O perfil do cliente usa todas as demandas e apresenta abas:
  - `Ativas`: qualquer status diferente de concluido.
  - `Arquivadas`: somente demandas concluidas.
- A aba Arquivadas oferece busca, filtros por tipo e abertura dos detalhes completos.
- Briefing, entrega, links, legenda e comentarios permanecem disponiveis.

## Exclusao definitiva

- Disponivel somente para `Admin`.
- Visivel somente na aba Arquivadas do perfil do cliente.
- Exige confirmacao reforcada com o titulo da demanda e aviso de irreversibilidade.
- A operacao remove primeiro registros dependentes, como notificacoes relacionadas, e depois `production_tasks`.
- Em caso de falha, a demanda continua na interface e um erro e exibido.
- Nao havera exclusao otimista para dados remotos.

## Notificacoes Realtime e som

- Cada notificacao sera uma linha persistida em `public.notifications`.
- O canal Realtime sera filtrado logicamente para o usuario autenticado.
- Ao receber um `INSERT` destinado ao usuario:
  - adicionar o evento ao estado sem refazer toda a consulta;
  - incrementar o contador de nao lidas;
  - mostrar toast;
  - tocar um som curto.
- O som toca apenas para o destinatario e apenas uma vez por ID de notificacao.
- A aba que criou a demanda nao toca o som de atribuicao, exceto se o autor tambem for destinatario.
- O audio sera iniciado somente depois de uma interacao do usuario, respeitando as regras de autoplay do navegador.
- Se audio estiver bloqueado, toast e contador continuam funcionando.
- Notificacoes de alteracao de status seguem o mesmo mecanismo persistido.
- Leitura atualiza `read_at`; eventos ja lidos nao disparam som novamente ao recarregar.
- O fallback local permanece apenas para desenvolvimento sem sessao remota.

## Supabase

- Confirmar que `production_tasks` e `notifications` estao na publicacao `supabase_realtime`.
- Manter RLS habilitado.
- Revisar politicas para que usuarios autenticados leiam somente notificacoes globais ou destinadas ao proprio perfil.
- Garantir permissao de exclusao definitiva somente para perfil Admin, preferencialmente por funcao RPC protegida ou politica verificando o perfil ligado a `auth.uid()`.
- Verificar integridade entre notificacoes e demandas antes da exclusao.
- Nao expor chave `service_role` no frontend.

## Vercel e deploy

- Confirmar o projeto Vercel correto e a integracao Git atual.
- Confirmar build command, output `dist` e rewrite SPA.
- Conferir nos ambientes Production e Preview:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_GEMINI_API_KEY`
  - `VITE_GEMINI_MODEL`
- Executar build e testes locais.
- Fazer deploy de producao.
- Validar login, criacao de demanda, Realtime, som, revisao, aprovacao, arquivamento e historico no deployment publicado.

## Testes

- Unidade:
  - demandas concluidas nao entram na colecao operacional;
  - demandas concluidas entram no historico arquivado do cliente;
  - somente Admin pode solicitar exclusao definitiva;
  - notificacao nova destinada ao usuario produz um unico alerta sonoro;
  - notificacao lida ou de outro usuario nao produz som.
- Integracao:
  - criar demanda e notificacoes no Supabase;
  - receber notificacao por Realtime;
  - concluir demanda e confirmar permanencia no banco;
  - excluir demanda arquivada como Admin e limpar dependencias.
- Interface:
  - screenshots desktop e mobile das telas QC e IA;
  - ausencia de sobreposicoes;
  - controles de teclado e foco;
  - textos e botoes sem estouro.

## Criterios de aceite

- QC e IA possuem hierarquia visual limpa e utilizavel em desktop e mobile.
- Aprovar remove a demanda de todas as superficies operacionais sem apagar dados.
- A demanda aprovada aparece no perfil do cliente em Arquivadas.
- Somente Admin consegue excluir definitivamente uma demanda arquivada.
- A pessoa atribuida recebe toast, contador e som logo apos o envio da demanda.
- Recarregar a pagina nao repete o som de notificacoes antigas ou lidas.
- Build, testes, smoke Supabase e validacao do deployment Vercel passam.
