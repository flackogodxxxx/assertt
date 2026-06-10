export type GeminiFilePart = {
  data: string;
  mimeType: string;
};

export type GeminiJsonRequest = {
  apiKey?: string;
  filePart?: GeminiFilePart;
  model: string;
  prompt: string;
  systemInstruction: string;
};

type GeminiResponsePayload = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

export function getGeminiApiKey() {
  return import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
}

export function stripJsonMarkdownFence(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function callGeminiJson<TResponse = unknown>({
  apiKey = getGeminiApiKey(),
  filePart,
  model,
  prompt,
  systemInstruction
}: GeminiJsonRequest): Promise<TResponse> {
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY nao configurada");
  }

  const parts: Array<Record<string, unknown>> = [
    {
      text: `${systemInstruction}\n\n${prompt}`
    }
  ];

  if (filePart?.data && filePart.mimeType) {
    parts.push({
      inline_data: {
        data: filePart.data,
        mime_type: filePart.mimeType
      }
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      body: JSON.stringify({
        contents: [
          {
            parts,
            role: "user"
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.35
        }
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    }
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Gemini falhou com status ${response.status}`);
  }

  const data = (await response.json()) as GeminiResponsePayload;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini nao retornou texto para processar.");
  }

  return JSON.parse(stripJsonMarkdownFence(text)) as TResponse;
}

export function getDefaultGeminiModel() {
  return import.meta.env.VITE_GEMINI_MODEL || "gemini-2.0-flash-lite-001";
}
