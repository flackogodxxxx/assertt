import { afterEach, describe, expect, it, vi } from "vitest";
import { callGeminiJson, stripJsonMarkdownFence } from "../src/lib/gemini";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Gemini direct client", () => {
  it("rejects when the API key is missing", async () => {
    await expect(
      callGeminiJson({
        apiKey: "",
        model: "gemini-1.5-flash",
        prompt: "Return JSON",
        systemInstruction: "Return only JSON"
      })
    ).rejects.toThrow("VITE_GEMINI_API_KEY nao configurada");
  });

  it("posts a Gemini request and parses JSON response text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "{\"caption\":\"Legenda\",\"hashtags\":[\"#assert\"]}" }]
            }
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      callGeminiJson<{ caption: string; hashtags: string[] }>({
        apiKey: "test-key",
        filePart: {
          data: "abc123",
          mimeType: "image/png"
        },
        model: "gemini-1.5-flash",
        prompt: "Create a caption",
        systemInstruction: "Return only JSON"
      })
    ).resolves.toEqual({ caption: "Legenda", hashtags: ["#assert"] });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=test-key",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
        method: "POST"
      })
    );
  });

  it("strips markdown JSON fences", () => {
    expect(stripJsonMarkdownFence("```json\n{\"ok\":true}\n```")).toBe("{\"ok\":true}");
  });
});
