import { grokChat, hasXaiKey, parseModelJson } from "./ai";
import { crawlSite } from "./crawl";
import { chunkText, queryTerms } from "./rag";

export type SitePreview = {
  reply: string;
  pagesRead: number;
  sources: { title: string; excerpt: string }[];
};

type Chunk = { title: string; content: string; hits: number };

function rankChunks(question: string, pages: { title: string; content: string }[]): Chunk[] {
  const terms = queryTerms(question);
  const chunks = pages.flatMap((page) =>
    chunkText(page.content).map((content) => ({ title: page.title || "Page", content })),
  );
  return chunks
    .map((chunk) => ({
      ...chunk,
      hits: terms.filter((term) => chunk.content.toLowerCase().includes(term)).length,
    }))
    .filter((chunk) => chunk.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 5);
}

function extractive(question: string, chunks: Chunk[]): string {
  const best = chunks[0];
  if (!best) {
    return "I read the public pages, but I could not find an answer to that. Try a more specific question, or add the policy text when you create the assistant.";
  }
  return `From ${best.title}: ${best.content.slice(0, 420).trim()}`;
}

export async function answerFromPublicSite(input: { url: string; question: string }): Promise<SitePreview> {
  const question = input.question.trim();
  if (question.length < 4) throw new Error("Ask a real customer question.");
  if (question.length > 400) throw new Error("Keep the question under 400 characters.");

  const pages = await crawlSite(input.url.trim(), { maxPages: 3, timeoutMs: 5000 });
  if (pages.length === 0) throw new Error("That site did not return readable text.");

  const chunks = rankChunks(question, pages);
  let reply = "";

  if (hasXaiKey() && chunks.length > 0) {
    const contextBlock = chunks
      .map((chunk, i) => `[#${i + 1} ${chunk.title}]\n${chunk.content.slice(0, 900)}`)
      .join("\n\n");
    const result = await grokChat({
      maxTokens: 450,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You answer as a company website assistant. Use only the excerpts. If they do not contain the answer, say you are not sure. Never invent prices or policies. Under 120 words. Return JSON only: {\"reply\": string}.",
        },
        {
          role: "user",
          content: `Excerpts:\n${contextBlock}\n\nCustomer question: ${question}`,
        },
      ],
    });
    if (result.ok) {
      const parsed = parseModelJson<{ reply?: string }>(result.text);
      reply = parsed?.reply?.trim() || "";
      if (reply.startsWith("{")) reply = "";
    }
  }

  if (!reply) reply = extractive(question, chunks);

  return {
    reply,
    pagesRead: pages.length,
    sources: chunks.slice(0, 3).map((chunk) => ({
      title: chunk.title,
      excerpt: chunk.content.slice(0, 160),
    })),
  };
}
