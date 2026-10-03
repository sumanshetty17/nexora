const MAX_BYTES = 280_000;
const MAX_PAGES = 5;
const TIMEOUT_MS = 8000;

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.|::1|\[::1\])/;

export function isSafeHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (PRIVATE_HOST.test(url.hostname) || url.hostname.endsWith(".local")) return null;
    if (url.hostname === "0.0.0.0") return null;
    return url;
  } catch {
    return null;
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/gi, "&");
}

export function htmlToText(html: string): { title: string; description: string; text: string; links: string[] } {
  const title = decodeEntities(
    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/<[^>]+>/g, "").trim(),
  );
  const description = decodeEntities(
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ??
      "",
  );
  const links = [...html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)].map((m) => m[1] ?? "");
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ");
  const text = decodeEntities(stripped.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  return { title, description, text, links };
}

async function fetchPage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "NexoraBot/1.0 (knowledge ingest)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
      },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!/html|text|xml/i.test(type)) return null;
    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf;
    return new TextDecoder("utf-8", { fatal: false }).decode(slice);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type CrawledPage = {
  url: string;
  title: string;
  content: string;
};

export async function crawlSite(startUrl: string): Promise<CrawledPage[]> {
  const origin = isSafeHttpUrl(startUrl);
  if (!origin) throw new Error("Enter a public http(s) website URL.");

  const seen = new Set<string>();
  const queue: string[] = [origin.href];
  const pages: CrawledPage[] = [];

  while (queue.length && pages.length < MAX_PAGES) {
    const href = queue.shift();
    if (!href || seen.has(href)) continue;
    seen.add(href);
    const html = await fetchPage(href);
    if (!html) continue;
    const parsed = htmlToText(html);
    const content = [parsed.title, parsed.description, parsed.text].filter(Boolean).join("\n\n");
    if (content.replace(/\s/g, "").length < 40) continue;
    pages.push({
      url: href,
      title: parsed.title || href,
      content: content.slice(0, 24_000),
    });

    for (const raw of parsed.links) {
      if (pages.length + queue.length >= MAX_PAGES) break;
      try {
        const next = new URL(raw, href);
        if (next.protocol !== "http:" && next.protocol !== "https:") continue;
        if (next.hostname !== origin.hostname) continue;
        next.hash = "";
        if (/\.(pdf|jpg|png|gif|svg|zip|mp4|webp)$/i.test(next.pathname)) continue;
        if (!seen.has(next.href)) queue.push(next.href);
      } catch {
        /* ignore bad href */
      }
    }
  }

  return pages;
}
