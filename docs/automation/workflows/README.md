# n8n import workflows

Arquivos importaveis no n8n:

- `assert-ia-webhook.json`: webhook publico usado por `VITE_N8N_IA_WEBHOOK_URL`.
- `assert-crm-webhook.json`: webhook publico reservado para eventos CRM em `VITE_N8N_CRM_WEBHOOK_URL`.

## Setup no n8n

1. Importe os JSONs no n8n.
2. Abra o workflow `Assert CRM - IA Webhook`.
3. Abra o node `Call Gemini`.
4. No campo `URL`, troque `COLE_SUA_GEMINI_API_KEY_AQUI` pela chave do Google AI Studio.
5. Ative o workflow `Assert CRM - IA Webhook`.
6. Copie a URL de producao do node `Webhook IA` para `VITE_N8N_IA_WEBHOOK_URL`.
7. Ative o workflow `Assert CRM - Event Router Webhook`.
8. Copie a URL de producao do node `Webhook CRM` para `VITE_N8N_CRM_WEBHOOK_URL` quando o frontend passar a enviar eventos CRM para ele.

Observacao para n8n free: este arquivo nao depende de `Settings > n8n API` nem de `Variables`, porque esses recursos podem nao existir no modo free/trial.

## Contrato IA

Entrada esperada:

```json
{
  "action": "legenda",
  "file": {
    "name": "video.mp4",
    "mimeType": "video/mp4",
    "base64": "..."
  },
  "options": {
    "platform": "instagram"
  },
  "prompt": "Return JSON",
  "systemInstruction": "Return only valid JSON"
}
```

Saida esperada pelo app:

```json
{
  "caption": "...",
  "transcription": "...",
  "hashtags": ["#assert"],
  "ok": true
}
```

## Limite atual do MCP

O MCP do n8n esta autenticado, mas nesta sessao expoe apenas ferramentas de busca, documentacao e validacao. Para criar, ativar e listar workflows por aqui, o servidor precisa expor as ferramentas `n8n_create_workflow`, `n8n_list_workflows`, `n8n_update_partial_workflow` e `n8n_health_check`, o que depende de `N8N_API_URL` e API key configurados no lado do servidor MCP.
