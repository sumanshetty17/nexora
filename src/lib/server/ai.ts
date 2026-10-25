export type ChatCompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function hasXaiKey(): boolean {
  return false;
}

export async function grokChat(): Promise<{ ok: false; error: string }> {
  return { ok: false, error: "This project answers from the pages it read. It does not call another AI." };
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
