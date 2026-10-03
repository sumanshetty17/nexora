const MODEL = "grok-4.5";

export type ChatCompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function hasXaiKey(): boolean {
  return Boolean(process.env.XAI_API_KEY);
}

export async function grokChat(options: {
  messages: ChatCompletionMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { ok: false, error: "AI is not available in this environment" };

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 700,
      temperature: options.temperature ?? 0.4,
    }),
  });

  if (!res.ok) {
    return { ok: false, error: `xAI API error ${res.status}` };
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return { ok: true, text: body.choices?.[0]?.message?.content ?? "" };
}

export function parseModelJson<T>(text: string): T | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
