const MAX_BYTES = 280_000;
const DEFAULT_PAGES = 8;
const HARD_CAP = 12;
const TIMEOUT_MS = 6000;

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
    .replace(/</gi, "<")
    .replace(/>/gi, ">")
    .replace(/"/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/'/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&/gi, "&");
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

async function fetchPage(url: string, timeoutMs = TIMEOUT_MS): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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

function pageFromHtml(href: string, html: string): CrawledPage | null {
  const parsed = htmlToText(html);
  const content = [parsed.title, parsed.description, parsed.text].filter(Boolean).join("\n\n");
  if (content.replace(/\s/g, "").length < 40) return null;
  return {
    url: href,
    title: parsed.title || href,
    content: content.slice(0, 24_000),
  };
}

export async function readPublicPage(raw: string, timeoutMs = 5000): Promise<CrawledPage | null> {
  const url = isSafeHttpUrl(raw);
  if (!url) return null;
  const html = await fetchPage(url.href, timeoutMs);
  if (!html) return null;
  return pageFromHtml(url.href, html);
}

const PRIORITY_PATHS = [
  "/about",
  "/about-us",
  "/company",
  "/products",
  "/services",
  "/pricing",
  "/faq",
  "/faqs",
  "/contact",
  "/support",
  "/help",
];

function sitemapLinks(origin: URL, xml: string): string[] {
  const out: string[] = [];
  for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    const raw = decodeEntities(match[1] ?? "");
    try {
      const next = new URL(raw);
      if (next.hostname !== origin.hostname) continue;
      if (next.protocol !== "http:" && next.protocol !== "https:") continue;
      next.hash = "";
      if (/\.(pdf|jpg|jpeg|png|gif|svg|zip|mp4|webp|css|js)$/i.test(next.pathname)) continue;
      out.push(next.href);
    } catch {
      /* skip bad loc */
    }
  }
  return out;
}

export async function crawlSite(
  startUrl: string,
  opts?: { maxPages?: number; timeoutMs?: number },
): Promise<CrawledPage[]> {
  const origin = isSafeHttpUrl(startUrl);
  if (!origin) throw new Error("Enter a public http(s) website URL.");
  const maxPages = Math.min(HARD_CAP, Math.max(1, opts?.maxPages ?? DEFAULT_PAGES));
  const timeoutMs = opts?.timeoutMs ?? TIMEOUT_MS;

  const seen = new Set<string>([origin.href]);
  const homeHtml = await fetchPage(origin.href, timeoutMs);
  if (!homeHtml) throw new Error("Could not read that site. Try pasting key pages as text.");
  const homeParsed = htmlToText(homeHtml);
  const pages: CrawledPage[] = [];
  const home = pageFromHtml(origin.href, homeHtml);
  if (home) pages.push(home);

  const queue: string[] = [];
  const push = (href: string) => {
    if (pages.length + queue.length >= maxPages) return;
    try {
      const next = new URL(href, origin.href);
      if (next.protocol !== "http:" && next.protocol !== "https:") return;
      if (next.hostname !== origin.hostname) return;
      next.hash = "";
      if (/\.(pdf|jpg|jpeg|png|gif|svg|zip|mp4|webp|css|js)$/i.test(next.pathname)) return;
      if (seen.has(next.href)) return;
      seen.add(next.href);
      queue.push(next.href);
    } catch {
      /* ignore */
    }
  };

  for (const path of PRIORITY_PATHS) push(new URL(path, origin).href);
  const sitemapXml = await fetchPage(new URL("/sitemap.xml", origin).href, Math.min(timeoutMs, 4000));
  if (sitemapXml) {
    for (const href of sitemapLinks(origin, sitemapXml)) push(href);
  }
  for (const link of homeParsed.links) push(link);

  const extras = await Promise.all(
    queue.map(async (href) => {
      const html = await fetchPage(href, timeoutMs);
      return html ? pageFromHtml(href, html) : null;
    }),
  );
  for (const page of extras) {
    if (page && pages.length < maxPages) pages.push(page);
  }
  return pages;
}
