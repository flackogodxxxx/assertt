# n8n CRM Automation Workflows

Este blueprint usa o Supabase como fonte de verdade e o n8n como camada de automacao externa. O app deve continuar usando Supabase Realtime para a experiencia em tela: demandas novas, notificacoes internas, presenca e status online. O n8n entra para mensagens fora do app, SLA, briefing automatico e auditoria.

## Principios

- Supabase guarda os dados operacionais: `production_tasks`, `notifications`, `profiles`, `clients` e `demand_attachments`.
- Supabase Realtime atualiza o frontend em tempo real.
- n8n reage a eventos e agenda rotinas, sem substituir a regra de acesso do banco.
- Cada automacao precisa ser idempotente para evitar notificacoes duplicadas.
- Falhas de automacao devem ser registradas e notificadas para administradores.

## Tabela de auditoria sugerida

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

alter table public.automation_events enable row level security;
```

Uso do `event_key`:

- `task:<task_id>:created`
- `task:<task_id>:review`
- `task:<task_id>:due-soon`
- `task:<task_id>:overdue`

## Workflow 1: Nova Demanda

Objetivo: quando uma demanda for criada, avisar a pessoa responsavel, registrar notificacao interna e gerar briefing se necessario.

Fluxo:

1. `Webhook Trigger`
   - Recebe evento do Supabase Database Webhook para `production_tasks` em `INSERT`.
   - Payload esperado: `body.record`.
2. `Code` ou `IF`
   - Valida `record.id`, `record.assignee_id`, `record.client_id`, `record.title`, `record.due_date`.
   - Monta `event_key = task:<id>:created`.
3. `Supabase/Postgres: Check Automation Event`
   - Consulta `automation_events` pelo `event_key`.
   - Se ja existir, encerra o fluxo.
4. `Supabase/Postgres: Fetch Context`
   - Busca tarefa, cliente, responsavel e autor.
5. `Switch`
   - `type = video`: rota de video.
   - `type = carousel`, `single_post` ou `post`: rota de design/social.
   - `due_date <= 48h`: adiciona prioridade alta.
6. `Optional AI Briefing`
   - Gera resumo de producao com base em titulo, descricao, cliente, links e checklist.
   - Atualiza `production_tasks.checklist.briefing`.
7. `Supabase/Postgres: Insert Notification`
   - Insere notificacao para `target_user_id = assignee_id`.
8. `External Message`
   - Envia Slack, Discord, WhatsApp, email ou outro canal definido.
9. `Supabase/Postgres: Mark Automation Event`
   - Registra `status = processed`.

Mensagem sugerida:

```text
Nova demanda: {{$json.task.title}}
Cliente: {{$json.client.name}}
Responsavel: {{$json.assignee.name}}
Prazo: {{$json.task.due_date}}
```

## Workflow 2: Envio Para Revisao

Objetivo: quando uma demanda muda para revisao, avisar administradores e organizadores.

Fluxo:

1. `Webhook Trigger`
   - Evento do Supabase Database Webhook para `production_tasks` em `UPDATE`.
2. `IF`
   - Continua somente quando `body.record.status = review`.
   - Usa `event_key = task:<id>:review`.
3. `Fetch Context`
   - Busca cliente, responsavel, autor, links e anexos.
4. `Insert Notification`
   - Envia para administradores e/ou organizadores.
5. `External Message`
   - Envia mensagem com link de entrega, Dropbox, planejamento e comentarios.

## Workflow 3: SLA e Prazos

Objetivo: rodar periodicamente para avisar demandas proximas do prazo ou atrasadas.

Agenda:

- A cada 1 hora em dias uteis.
- Timezone: `America/Sao_Paulo`.

Fluxo:

1. `Schedule Trigger`
2. `Supabase/Postgres: Due Soon`
   - Busca tarefas com prazo nas proximas 24 ou 48 horas e status diferente de `delivered`.
3. `Supabase/Postgres: Overdue`
   - Busca tarefas com `due_date < current_date` e status diferente de `delivered`.
4. `Split In Batches`
5. `Check automation_events`
   - Evita alertas repetidos por tarefa e tipo.
6. `Create Notification`
7. `External Message`
   - Alerta responsavel e administradores quando estiver atrasada.

## Workflow 4: Briefing Diario

Objetivo: enviar um resumo operacional do dia.

Agenda:

- Segunda a sexta, 08:30, `America/Sao_Paulo`.

Fluxo:

1. `Schedule Trigger`
2. `Supabase/Postgres`
   - Demandas para hoje.
   - Demandas atrasadas.
   - Demandas em revisao.
   - Pessoas com status atual em `profiles.status`.
3. `Code`
   - Agrupa por responsavel, cliente e status.
4. `External Message`
   - Envia resumo para o canal de operacao/admin.

Formato sugerido:

```text
Resumo operacional

Hoje: {{$json.counts.today}}
Atrasadas: {{$json.counts.overdue}}
Em revisao: {{$json.counts.review}}

Por responsavel:
{{$json.assigneeSummary}}
```

## Workflow 5: Erros de Automacao

Objetivo: centralizar falhas e avisar administradores.

Fluxo:

1. `Error Trigger`
2. `Supabase/Postgres: Insert automation_events`
   - `source = n8n-error`
   - `status = failed`
   - `payload = error context`
3. `External Message`
   - Avisa admins com workflow, node, mensagem e timestamp.

## Configuracao Supabase

Criar Database Webhooks no Supabase apontando para os Webhook URLs do n8n:

- `production_tasks INSERT` -> Workflow 1.
- `production_tasks UPDATE` -> Workflow 2.

O n8n deve usar chave segura no servidor:

- Preferir service role key somente dentro do n8n.
- Nunca expor service role key no frontend.
- Manter RLS ativa para o app.
- Se usar service role no n8n, tratar o n8n como ambiente backend privilegiado.

## Variaveis do n8n

```text
SUPABASE_URL=https://knmaekgzppmaclkesxfs.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret>
APP_BASE_URL=<url-do-app-online>
OPS_CHANNEL_WEBHOOK=<slack-discord-whatsapp-email-webhook>
```

## Expressoes uteis

ID da tarefa:

```text
{{$json.body.record.id}}
```

Responsavel:

```text
{{$json.body.record.assignee_id}}
```

Status novo:

```text
{{$json.body.record.status}}
```

Criar chave idempotente:

```text
{{'task:' + $json.body.record.id + ':created'}}
```

## Ordem de implantacao

1. Criar `automation_events`.
2. Publicar workflows no n8n com credenciais Supabase seguras.
3. Configurar Database Webhooks no Supabase.
4. Testar com uma demanda real no app.
5. Ativar mensagens externas.
6. Ativar SLA e briefing diario.
