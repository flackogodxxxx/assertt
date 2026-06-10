# n8n Assert — Blueprint Completo de Automações

Este documento estrutura todas as automações da agência Assert usando n8n como orquestrador, Supabase como fonte de dados, Dropbox como armazenamento de arquivos e Gemini como motor de IA.

---

## Mapa da Operação Assert

```
Equipe:
  Admin:        Bianca
  Organizadores: Gui, Bruna, Mel
  Designers:    Marcelo, Luan, Nicoly, Matheus, Gui
  Video Makers: Felipe, Mari, Dani

Fluxo de Produção:
  Organizador cria demanda → atribui Designer e/ou Video Maker
  → Responsável produz → envia para revisão
  → Admin/Organizador aprova ou pede correção
  → Aprovado → material final no Dropbox → entregue
```

---

## Princípios Gerais

- Supabase é a fonte de verdade para dados operacionais.
- Dropbox é a fonte de verdade para arquivos de produção.
- n8n reage a eventos (webhooks) e agenda rotinas (schedules).
- Gemini é usado para transcrição, briefing e análises de conteúdo.
- Cada automação é idempotente (tabela `automation_events`).
- Falhas são registradas e notificadas para administradores.

---

## Tabelas Supabase Necessárias

### automation_events (existente no plano original)

```sql
create table if not exists public.automation_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  source text not null,
  task_id text,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
```

### subtitle_requests (nova)

```sql
create table if not exists public.subtitle_requests (
  id uuid primary key default gen_random_uuid(),
  task_id text references public.production_tasks(id),
  requested_by text not null,
  audio_storage_path text not null,
  transcript text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.subtitle_requests enable row level security;
```

### video_reviews (nova)

```sql
create table if not exists public.video_reviews (
  id uuid primary key default gen_random_uuid(),
  task_id text references public.production_tasks(id),
  dropbox_path text not null,
  reviewer_id text,
  status text not null default 'pending_review',
  correction_note text,
  approved_version text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.video_reviews enable row level security;
```

---

## Estrutura de Pastas no Dropbox

```
/Assert Producao/
├── {Nome do Cliente}/
│   ├── {YYYY-MM}/
│   │   ├── Videos/
│   │   │   ├── _rascunhos/        ← Video Maker sobe aqui
│   │   │   ├── _em-revisao/       ← n8n move para cá quando enviado p/ review
│   │   │   ├── _aprovados/        ← n8n move para cá quando aprovado
│   │   │   └── _correcoes/        ← correções são salvas aqui temporariamente
│   │   ├── Artes/
│   │   │   ├── _rascunhos/
│   │   │   ├── _aprovados/
│   │   └── Legendas/
│   │       └── {titulo-do-video}.txt
```

---

## BLOCO 1 — Pipeline de Vídeo + Dropbox

### WF-V1: Upload de Rascunho

**Trigger:** Webhook do CRM quando Video Maker muda status para "Em Andamento" ou faz upload de arquivo.

**Fluxo:**

1. `Webhook Trigger` — recebe `task_id`, `client_name`, `assignee_id`
2. `Supabase: Fetch Task` — busca detalhes da tarefa e cliente
3. `Dropbox: Create Folder` — garante que a estrutura de pastas existe:
   - `/Assert Producao/{cliente}/{YYYY-MM}/Videos/_rascunhos/`
4. `Supabase: Insert Notification` — notifica o Video Maker com o link do Dropbox
5. `External Message` — envia link do Dropbox para o responsável

**Mensagem:**

```
Pasta criada para {cliente} — {titulo}
Suba os rascunhos em: {dropbox_link}
Prazo: {due_date}
```

---

### WF-V2: Envio para Revisão de Vídeo

**Trigger:** Webhook `production_tasks UPDATE` quando `status = review` e `type = video`.

**Fluxo:**

1. `Webhook Trigger`
2. `IF` — filtra apenas vídeos em revisão
3. `Dropbox: List Folder` — lista arquivos em `_rascunhos/`
4. `Dropbox: Move Files` — move todos os arquivos de `_rascunhos/` para `_em-revisao/`
5. `Supabase: Insert video_reviews` — cria registro de revisão com `status = pending_review`
6. `Supabase: Update Task` — salva link da pasta `_em-revisao/` como `deliverable`
7. `Supabase: Insert Notification` — notifica Admin e Organizadores
8. `External Message` — Slack/WhatsApp com link para revisar

**Mensagem:**

```
📹 Entrega para revisão
Cliente: {cliente}
Vídeo: {titulo}
Responsável: {assignee_name}
Link: {dropbox_em_revisao_link}
```

---

### WF-V3: Aprovação de Vídeo

**Trigger:** Webhook do CRM quando Admin muda demanda de vídeo para "Concluído".

**Fluxo:**

1. `Webhook Trigger`
2. `IF` — filtra `status = delivered` + `type = video`
3. `Supabase: Update video_reviews` — marca `status = approved`, salva `approved_version`
4. `Dropbox: List Files` — lista arquivos em `_em-revisao/`
5. `Dropbox: Move Files` — move versão aprovada de `_em-revisao/` para `_aprovados/`
6. `Dropbox: Delete Folder Contents` — limpa `_em-revisao/` e `_correcoes/`
7. `Dropbox: Delete Folder Contents` — limpa `_rascunhos/`
8. `Supabase: Update Task` — atualiza `deliverable` com link final da pasta `_aprovados/`
9. `Supabase: Insert Notification` — confirma para o Video Maker
10. `Mark automation_events`

**Mensagem:**

```
✅ Vídeo aprovado: {titulo}
Cliente: {cliente}
Versão final salva em: {dropbox_aprovados_link}
Pastas temporárias limpas.
```

---

### WF-V4: Correção de Vídeo (Reprovação)

**Trigger:** Webhook do CRM quando Admin muda vídeo de "Em Revisão" para "Em Andamento" (ajuste).

**Fluxo:**

1. `Webhook Trigger`
2. `IF` — filtra `old_status = review` → `new_status = production` + `type = video`
3. `Supabase: Update video_reviews` — marca `status = corrections_requested`, salva `correction_note`
4. `Dropbox: Move Files` — move arquivos de `_em-revisao/` para `_correcoes/{timestamp}/`
5. `Supabase: Insert Notification` — notifica Video Maker com nota de correção
6. `External Message`

**Mensagem:**

```
🔄 Correção solicitada: {titulo}
Cliente: {cliente}
Nota: {correction_note}
Suba a versão corrigida em: {dropbox_rascunhos_link}
Os arquivos anteriores estão em _correcoes/ para referência.
```

---

## BLOCO 2 — Correção de Legenda (Transcrição com IA)

### WF-L1: Solicitar Transcrição

**Trigger:** Webhook do CRM — botão "Corrigir Legenda" no frontend ou `subtitle_requests INSERT`.

**Fluxo:**

1. `Webhook Trigger` — recebe `task_id`, `audio_storage_path`, `requested_by`
2. `Supabase Storage: Download` — baixa o arquivo de áudio
3. `Gemini API` — envia o áudio com o prompt:

```
Transcreva esse áudio perfeitamente IGUAL é falado, só corrija:
- Pontuação (vírgula, ponto, início e fim de frase)
- Palavras informais para formais:
  pra → para
  cê → você
  tá → está
  né → não é
  pro → para o
  pros → para os
  pras → para as
  num → não
  nuns → não
  tamo → estamos
  vamo → vamos
  to → estou
  tão → estão
  dum → de um
  duma → de uma
  cum → com um

Mantenha o conteúdo exatamente como falado. Não resuma, não adicione, não altere o sentido.
Formate em blocos de 2-3 linhas para facilitar a inserção como legenda.
```

4. `Code: Format Transcript` — formata a resposta em blocos de legenda
5. `Supabase: Update subtitle_requests` — salva o `transcript`, marca `status = completed`
6. `Supabase: Insert Notification` — notifica quem pediu que a legenda está pronta no CRM
7. `Mark automation_events`

**Mensagem:**

```
📝 Legenda pronta: {titulo}
Cliente: {cliente}
Abra no CRM para copiar o texto corrigido.
```

---

## BLOCO 3 — Pipeline de Artes + Dropbox

### WF-A1: Estrutura de Pasta para Design

**Trigger:** Webhook `production_tasks INSERT` quando `type = carousel` ou `post`.

**Fluxo:**

1. `Webhook Trigger`
2. `Dropbox: Create Folder` — cria estrutura:
   - `/Assert Producao/{cliente}/{YYYY-MM}/Artes/_rascunhos/`
   - `/Assert Producao/{cliente}/{YYYY-MM}/Artes/_aprovados/`
3. `Supabase: Update Task` — salva link da pasta como referência no `checklist.dropboxLink`

---

### WF-A2: Aprovação de Arte

**Trigger:** Webhook quando arte muda para "Concluído".

**Fluxo:**

1. Move arquivos de `_rascunhos/` para `_aprovados/`
2. Limpa `_rascunhos/`
3. Notifica Designer

---

## BLOCO 4 — Demandas e Notificações (refinamento do plano original)

### WF-D1: Nova Demanda Criada

**Trigger:** Webhook `production_tasks INSERT`.

**Fluxo:**

1. Valida dados, monta `event_key = task:{id}:created`
2. Checa idempotência em `automation_events`
3. Busca contexto: tarefa, cliente, responsável, autor
4. Decide rota: vídeo → WF-V1 em paralelo, arte → WF-A1 em paralelo
5. Se prazo <= 48h → marca prioridade alta
6. Gera briefing com Gemini (opcional):

```
Gere um briefing operacional curto para a seguinte demanda:
Título: {title}
Cliente: {client}
Tipo: {type}
Descrição: {description}
Prazo: {due_date}

Formato: 3-5 bullet points objetivos para o responsável.
```

7. Insere notificação no Supabase
8. Envia mensagem externa
9. Marca `automation_events`

---

### WF-D2: Envio para Revisão (genérico)

**Trigger:** Webhook `production_tasks UPDATE` quando `status = review`.

**Fluxo:**

1. Busca contexto completo
2. Se vídeo → dispara WF-V2
3. Se arte → notifica com link do Canva/Dropbox
4. Insere notificação para Admin + Organizadores
5. Envia mensagem externa com todos os links (entrega, Dropbox, planejamento)

---

### WF-D3: SLA e Prazos

**Schedule:** A cada 1 hora, dias úteis, `America/Sao_Paulo`.

**Fluxo:**

1. Busca tarefas com prazo em 24h e 48h (status != delivered)
2. Busca tarefas atrasadas (due_date < hoje, status != delivered)
3. Para cada tarefa, checa idempotência
4. Cria notificação categorizada:
   - ⚠️ Prazo em 24h
   - 🚨 Atrasada
5. Envia alerta para responsável + Admin se atrasada

**Mensagem prazo:**

```
⚠️ Prazo se aproximando
{titulo} para {cliente}
Responsável: {assignee}
Prazo: {due_date} ({horas_restantes}h)
```

**Mensagem atrasada:**

```
🚨 Demanda atrasada
{titulo} para {cliente}
Responsável: {assignee}
Prazo era: {due_date} ({dias_atrasados} dias)
```

---

### WF-D4: Briefing Diário

**Schedule:** Segunda a sexta, 08:30, `America/Sao_Paulo`.

**Fluxo:**

1. Busca: demandas do dia, atrasadas, em revisão, status de cada membro
2. Agrupa por responsável
3. Usa Gemini para gerar resumo contextualizado (opcional)
4. Envia para canal de operações

**Formato:**

```
☀️ Briefing Assert — {data}

📊 Números do Dia
• Para hoje: {count}
• Atrasadas: {count}
• Em revisão: {count}
• Legendas pendentes: {count}

👥 Por Responsável
Felipe (Video Maker): 3 ativas, 1 atrasada
Marcelo (Designer): 2 ativas, 0 atrasadas
...

🎯 Atenções
• {cliente} tem entrega vencendo hoje
• {video_maker} tem 2 vídeos sem legenda
```

---

## BLOCO 5 — Inteligência e Produtividade

### WF-I1: Relatório Semanal de Produtividade

**Schedule:** Sexta-feira, 17:00, `America/Sao_Paulo`.

**Fluxo:**

1. Busca todas as tarefas da semana (criadas e concluídas)
2. Calcula métricas por pessoa:
   - Demandas concluídas
   - Tempo médio de produção (created_at → delivered)
   - Número de correções (quantas vezes voltou de review)
   - Legendas transcritas
3. Usa Gemini para gerar análise qualitativa
4. Envia relatório para Admin

**Formato:**

```
📊 Relatório Semanal — Semana {numero}

🏆 Destaques
• {nome} concluiu {n} demandas sem correções
• Tempo médio de entrega: {n} dias

📈 Por Pessoa
| Nome     | Cargo       | Concluídas | Tempo Médio | Correções |
|----------|-------------|------------|-------------|-----------|
| Felipe   | Video Maker | 8          | 2.3 dias    | 1         |
| Marcelo  | Designer    | 12         | 1.8 dias    | 0         |
...

⚠️ Pontos de Atenção
• {nome} teve {n} correções esta semana
• {cliente} tem demandas acumulando
```

---

### WF-I2: Análise de Briefing por IA

**Trigger:** Webhook — ao criar demanda com descrição longa.

**Fluxo:**

1. Se `description.length > 200` ou Admin marcou como "briefing detalhado"
2. Gemini analisa o briefing e gera:
   - Checklist de entregáveis
   - Pontos de atenção
   - Sugestão de referências visuais
3. Salva no `checklist.aiBriefing` da tarefa
4. Notifica responsável

---

### WF-I3: Detector de Gargalos

**Schedule:** Quarta-feira, 10:00, `America/Sao_Paulo`.

**Fluxo:**

1. Busca membros com mais de 5 demandas ativas
2. Busca clientes com mais de 3 demandas sem concluir
3. Busca demandas "Em Revisão" há mais de 48h
4. Envia alerta para Admin com recomendações

**Mensagem:**

```
🔍 Análise de Gargalos

Pessoas sobrecarregadas:
• {nome}: {n} demandas ativas (capacidade usual: {usual})

Clientes acumulando:
• {cliente}: {n} demandas pendentes

Reviews paradas:
• {titulo} ({cliente}) — em revisão há {n} horas
```

---

## BLOCO 6 — Onboarding e Gestão de Clientes

### WF-C1: Novo Cliente Cadastrado

**Trigger:** Webhook `clients INSERT`.

**Fluxo:**

1. `Dropbox: Create Folder Tree` — cria toda a estrutura para o cliente:
   ```
   /Assert Producao/{cliente}/
   ├── {YYYY-MM}/Videos/_rascunhos/
   ├── {YYYY-MM}/Videos/_aprovados/
   ├── {YYYY-MM}/Artes/_rascunhos/
   ├── {YYYY-MM}/Artes/_aprovados/
   └── {YYYY-MM}/Legendas/
   ```
2. `Supabase: Insert Notification` — avisa organizadores
3. `External Message` — anuncia no canal de ops

---

### WF-C2: Rotação Mensal de Pastas

**Schedule:** Dia 1 de cada mês, 06:00, `America/Sao_Paulo`.

**Fluxo:**

1. Busca todos os clientes ativos
2. Para cada cliente, cria a estrutura de pastas do novo mês
3. Verifica se o mês anterior tem rascunhos não aprovados → alerta Admin

---

## BLOCO 7 — Tratamento de Erros

### WF-E1: Error Handler Global

**Trigger:** Error Trigger (conectado a todos os workflows).

**Fluxo:**

1. Registra em `automation_events` com `source = n8n-error`
2. Envia alerta para Admin com: workflow, node, mensagem, timestamp
3. Se erro crítico (Dropbox, Supabase down) → alerta via WhatsApp/SMS

---

## Variáveis do n8n

```
SUPABASE_URL=https://knmaekgzppmaclkesxfs.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret>
DROPBOX_ACCESS_TOKEN=<token>
DROPBOX_ROOT_PATH=/Assert Producao
GEMINI_API_KEY=<key>
APP_BASE_URL=<url-do-crm-online>
OPS_CHANNEL_WEBHOOK=<slack-discord-whatsapp>
ADMIN_DIRECT_WEBHOOK=<whatsapp-bianca>
```

---

## Ordem de Implantação

### Fase 1 — Infraestrutura (semana 1)

1. Criar tabelas `automation_events`, `subtitle_requests`, `video_reviews`
2. Configurar credenciais no n8n (Supabase, Dropbox, Gemini)
3. Configurar Database Webhooks no Supabase
4. Implementar WF-E1 (error handler)

### Fase 2 — Core do Pipeline (semana 2)

5. Implementar WF-D1 (nova demanda) e WF-D2 (revisão)
6. Implementar WF-V1 a WF-V4 (pipeline completo de vídeo)
7. Testar com uma demanda real de vídeo de ponta a ponta

### Fase 3 — Legendas e Artes (semana 3)

8. Implementar WF-L1 (transcrição com Gemini)
9. Implementar WF-A1 e WF-A2 (pipeline de artes)
10. Adicionar botão "Corrigir Legenda" no frontend do CRM

### Fase 4 — Inteligência e Rotinas (semana 4)

11. Implementar WF-D3 (SLA) e WF-D4 (briefing diário)
12. Implementar WF-I1 (relatório semanal)
13. Implementar WF-I2 (briefing IA) e WF-I3 (gargalos)
14. Implementar WF-C1 (onboarding) e WF-C2 (rotação mensal)

### Fase 5 — Canais Externos (semana 5)

15. Conectar WhatsApp Business / Slack / Discord
16. Ativar todas as mensagens externas
17. Treinamento da equipe

---

## Resumo dos Workflows

| # | Workflow | Trigger | Integração |
|---|---|---|---|
| WF-V1 | Upload de Rascunho | Webhook INSERT | Dropbox |
| WF-V2 | Revisão de Vídeo | Webhook UPDATE | Dropbox |
| WF-V3 | Aprovação de Vídeo | Webhook UPDATE | Dropbox (limpeza) |
| WF-V4 | Correção de Vídeo | Webhook UPDATE | Dropbox |
| WF-L1 | Transcrição/Legenda | Webhook/Button | Gemini + Dropbox |
| WF-A1 | Pasta de Arte | Webhook INSERT | Dropbox |
| WF-A2 | Aprovação de Arte | Webhook UPDATE | Dropbox |
| WF-D1 | Nova Demanda | Webhook INSERT | Gemini (opcional) |
| WF-D2 | Envio p/ Revisão | Webhook UPDATE | — |
| WF-D3 | SLA e Prazos | Schedule 1h | — |
| WF-D4 | Briefing Diário | Schedule 08:30 | Gemini (opcional) |
| WF-I1 | Relatório Semanal | Schedule sex 17h | Gemini |
| WF-I2 | Briefing IA | Webhook INSERT | Gemini |
| WF-I3 | Detector Gargalos | Schedule qua 10h | — |
| WF-C1 | Onboarding Cliente | Webhook INSERT | Dropbox |
| WF-C2 | Rotação Mensal | Schedule dia 1 | Dropbox |
| WF-E1 | Error Handler | Error Trigger | — |
