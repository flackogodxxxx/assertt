import { afterEach, describe, expect, it, vi } from "vitest";
import { callAutomationWebhook } from "../src/lib/automation";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("automation webhook client", () => {
  it("rejects when the webhook URL is not configured", async () => {
    await expect(
      callAutomationWebhook(undefined, { type: "caption" })
    ).rejects.toThrow("Webhook n8n nao configurado");
  });

  it("posts JSON payloads to n8n and returns the parsed response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ caption: "Legenda gerada" })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      callAutomationWebhook("https://n8n.example/webhook/ia", {
        demandId: "dem-1",
        type: "caption"
      })
    ).resolves.toEqual({ caption: "Legenda gerada" });

    expect(fetchMock).toHaveBeenCalledWith("https://n8n.example/webhook/ia", {
      body: JSON.stringify({ demandId: "dem-1", type: "caption" }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
  });
});
