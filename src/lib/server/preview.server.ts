import { createHmac, timingSafeEqual } from "node:crypto";
import { grokChat, hasXaiKey, parseModelJson } from "./ai";
import { crawlSite, isSafeHttpUrl, readSiteRound, type CrawledPage } from "./crawl";
import { chunkText, queryTerms } from "./rag";
import { researchPublicWeb } from "./research";
import { speakReply } from "./speak";

export type PreviewTurn = { role: "user" | "assistant"; content: string };

export type SitePreview = {
  reply: string;
  pagesRead: number;
  sources: { title: string; excerpt: string }[];
  context: string;
  proof: string;
  suggestions: string[];
};

type Chunk = { title: string; content: string; hits: number };

const CONTEXT_CAP = 120_000;
const HIDDEN_TITLE = "Company facts";

function proofFor(url: string, context: string, pagesRead: number): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim() || "nexora-preview";
  return createHmac("sha256", secret).update(`${pagesRead}\n${url}\n${context}`).digest("hex");
}

function proofMatches(url: string, context: string, pagesRead: number, proof: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(proof) || context.length > CONTEXT_CAP) return false;
  const expected = proofFor(url, context, pagesRead);
  return timingSafeEqual(Buffer.from(expected), Buffer.from(proof));
}

function packPages(pages: { title: string; content: string }[], budget: number): string {
  if (pages.length === 0 || budget < 200) return "";
  const slice = Math.max(700, Math.floor(budget / pages.length) - 40);
  let out = "";
  for (const page of pages) {
    const block = `# ${page.title || "Page"}\n${page.content.slice(0, slice)}\n\n`;
    if (out.length + block.length > budget) break;
    out += block;
  }
  return out.trim();
}

function rankChunks(question: string, context: string): Chunk[] {
  const terms = queryTerms(question);
  const pages = context.split(/\n# /).map((block, i) => {
    const text = i === 0 ? block : `# ${block}`;
    const title = text.split("\n")[0]?.replace(/^# /, "") || "Page";
    return { title, content: text };
  });
  const chunks = pages.flatMap((page) =>
    chunkText(page.content).map((content) => ({ title: page.title, content })),
  );
  const ranked = chunks
    .map((chunk) => ({
      ...chunk,
      hits: terms.filter((term) => chunk.content.toLowerCase().includes(term)).length,
    }))
    .sort((a, b) => b.hits - a.hits);
  const matched = ranked.filter((chunk) => chunk.hits > 0);
  return (matched.length > 0 ? matched : ranked).slice(0, 8);
}

function rankPages(question: string, pages: { title: string; content: string }[]): Chunk[] {
  const terms = queryTerms(question);
  const chunks = pages.flatMap((page) =>
    chunkText(page.content).map((content) => ({ title: page.title || "Page", content })),
  );
  const ranked = chunks
    .map((chunk) => ({
      ...chunk,
      hits: terms.filter((term) => chunk.content.toLowerCase().includes(term)).length,
    }))
    .sort((a, b) => b.hits - a.hits);
  const matched = ranked.filter((chunk) => chunk.hits > 0);
  return (matched.length > 0 ? matched : ranked).slice(0, 8);
}

export async function readPublicRound(input: {
  url: string;
  queue?: string[];
  visited?: string[];
  seeded?: boolean;
  cookie?: string;
}): Promise<{
  pages: CrawledPage[];
  queue: string[];
  visited: string[];
  seeded: boolean;
  done: boolean;
  capped: boolean;
}> {
  const round = await readSiteRound(input);
  if (!input.visited?.length) {
    const origin = isSafeHttpUrl(input.url);
    if (origin) {
      const notes = await researchPublicWeb(origin, origin.hostname.replace(/^www\./, "")).catch(() => []);
      round.pages.push(...notes);
    }
  }
  return round;
}

function suggest(context: string): string[] {
  const found = context.match(/[A-Z][^?\n]{12,90}\?/g) ?? [];
  return [...new Set(found.map((line) => line.trim()))].slice(0, 3);
}

function cleanHistory(history: PreviewTurn[] | undefined): PreviewTurn[] {
  if (!history) return [];
  return history
    .filter((turn) => turn.role === "user" || turn.role === "assistant")
    .slice(-6)
    .map((turn) => ({ role: turn.role, content: turn.content.trim().slice(0, 400) }))
    .filter((turn) => turn.content.length > 0);
}

export async function answerFromPublicSite(input: {
  url: string;
  question: string;
  history?: PreviewTurn[];
  context?: string;
  proof?: string;
  pagesRead?: number;
  pages?: { title: string; content: string }[];
}): Promise<SitePreview> {
  const question = input.question.trim();
  if (question.length < 4) throw new Error("Ask a real customer question.");
  if (question.length > 400) throw new Error("Keep the question under 400 characters.");
  const url = input.url.trim();
  const history = cleanHistory(input.history);

  let context = "";
  let pagesRead = 0;
  let supplied: { title: string; content: string }[] | null = null;
  if (input.pages && input.pages.length > 0) {
    supplied = input.pages.filter((page) => page.content.trim().length > 40).slice(0, 300);
    pagesRead = supplied.length;
    context = packPages(supplied, CONTEXT_CAP);
    if (!context) throw new Error("That site did not return readable text.");
  }
  const cached =
    !supplied &&
    input.context &&
    input.proof &&
    typeof input.pagesRead === "number" &&
    proofMatches(url, input.context, input.pagesRead, input.proof);

  if (supplied) {
    /* already packed */
  } else if (cached && input.context) {
    context = input.context;
    pagesRead = input.pagesRead ?? 0;
  } else {
    const origin = isSafeHttpUrl(url);
    const [pages, research] = await Promise.all([
      crawlSite(url, { maxPages: 20, timeoutMs: 4000 }),
      origin
        ? researchPublicWeb(origin, origin.hostname.replace(/^www\./, "")).catch(() => [])
        : Promise.resolve([]),
    ]);
    if (pages.length === 0) throw new Error("That site did not return readable text.");
    const siteContext = packPages(pages, 100_000);
    const extraContext = packPages(research, 12_000);
    context = [siteContext, extraContext].filter(Boolean).join("\n\n").slice(0, CONTEXT_CAP);
    pagesRead = pages.length;
    if (!context) throw new Error("That site did not return readable text.");
  }

  const chunks = supplied ? rankPages(question, supplied) : rankChunks(question, context);
  let reply = "";

  if (hasXaiKey() && chunks.length > 0) {
    const contextBlock = chunks
      .map((chunk, i) => `[#${i + 1} ${chunk.title}]\n${chunk.content.slice(0, 900)}`)
      .join("\n\n");
    const prior = history.map((turn) => `${turn.role}: ${turn.content}`).join("\n");
    const result = await grokChat({
      maxTokens: 450,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a person chatting on a company website. Answer the customer's latest question in your own words, the way you would in a normal conversation. Use contractions. Do not paste headings, menus, or sentences from the excerpts. Do not start with the page title. Never invent prices or policies. If the excerpts do not say, say you are not sure and ask one useful follow-up. Under 90 words. Return JSON only: {\"reply\": string}.",
        },
        {
          role: "user",
          content: `Excerpts:\n${contextBlock}\n\n${prior ? `Earlier:\n${prior}\n\n` : ""}Customer question: ${question}`,
        },
      ],
    });
    if (result.ok) {
      const parsed = parseModelJson<{ reply?: string }>(result.text);
      reply = parsed?.reply?.trim() || "";
      if (reply.startsWith("{")) reply = "";
    }
  }

  if (!reply) reply = speakReply(question, chunks);

  return {
    reply,
    pagesRead,
    sources: chunks
      .filter((chunk) => chunk.title !== HIDDEN_TITLE)
      .slice(0, 3)
      .map((chunk) => ({
        title: chunk.title,
        excerpt: chunk.content.slice(0, 160),
      })),
    context,
    proof: proofFor(url, context, pagesRead),
    suggestions: suggest(context.split(`# ${HIDDEN_TITLE}`)[0] ?? context),
  };
}
