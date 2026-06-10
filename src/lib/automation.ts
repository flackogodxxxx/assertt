export type AutomationPayload = Record<string, unknown>;

export async function callAutomationWebhook<TResponse = unknown>(
  webhookUrl: string | undefined,
  payload: AutomationPayload
): Promise<TResponse> {
  if (!webhookUrl) {
    throw new Error("Webhook n8n nao configurado");
  }

  const response = await fetch(webhookUrl, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Webhook n8n falhou com status ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export function getIaWebhookUrl() {
  return import.meta.env.VITE_N8N_IA_WEBHOOK_URL as string | undefined;
}

export function getCrmWebhookUrl() {
  return import.meta.env.VITE_N8N_CRM_WEBHOOK_URL as string | undefined;
}
