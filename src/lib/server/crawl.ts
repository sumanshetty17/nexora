const MAX_BYTES = 280_000;
const DEFAULT_PAGES = 20;
const HARD_CAP = 24;
const TIMEOUT_MS = 6000;

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.|::1|\[::1\])/;

const ASSET_EXT = /\.(css|js|mjs|map|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|eot|otf|pdf|zip|mp4|webm|xml|txt)(\?|$)/i;
const STATIC_PATH = /^\/(_next|static|assets|api|graphql|cdn|fonts?|images?|img|media|build|chunks?|wp-content|wp-includes)(\/|$)/i;

const PRIORITY_PATHS = [
  "/about",
  "/about-us",
  "/company",
  "/products",
  "/product",
  "/services",
  "/pricing",
  "/features",
  "/faq",
  "/faqs",
  "/contact",
  "/support",
  "/help",
  "/blog",
  "/docs",
  "/team",
  "/careers",
  "/privacy",
  "/terms",
];

const MEMBER_PATHS = ["/account", "/dashboard", "/members", "/portal", "/orders", "/billing", "/profile", "/settings"];

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

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
    .replace(/'|&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&/gi, "&");
}

function normalizePageUrl(raw: string, base: string): string | null {
  try {
    const next = new URL(raw, base);
    if (next.protocol !== "http:" && next.protocol !== "https:") return null;
    next.hash = "";
    if (next.pathname !== "/" && next.pathname.endsWith("/")) {
      next.pathname = next.pathname.replace(/\/+$/, "");
    }
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"]) {
      next.searchParams.delete(key);
    }
    return next.href;
  } catch {
    return null;
  }
}

function looksLikePage(url: URL, originHost: string): boolean {
  if (url.hostname !== originHost) return false;
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const path = url.pathname || "/";
  if (ASSET_EXT.test(path) || STATIC_PATH.test(path)) return false;
  if (path.length > 120) return false;
  return true;
}

function jsonLdText(html: string): string {
  const blocks: string[] = [];
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = decodeEntities((match[1] ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (raw.length > 40) blocks.push(raw.slice(0, 2000));
    if (blocks.length >= 2) break;
  }
  return blocks.join("\n");
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
  const links = discoverLinks(html);
  const facts = jsonLdText(html);
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const text = decodeEntities(stripped.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  return {
    title,
    description,
    text: [facts, text].filter(Boolean).join("\n\n"),
    links,
  };
}

function discoverLinks(html: string): string[] {
  const found: string[] = [];
  const push = (raw: string | undefined) => {
    if (!raw) return;
    const value = raw.trim();
    if (!value || value.startsWith("#") || /^(mailto:|tel:|javascript:|data:)/i.test(value)) return;
    found.push(value);
  };
  for (const match of html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) push(match[1]);
  for (const match of html.matchAll(/\s(?:data-href|data-to|data-url|data-path|formaction)=["']([^"']+)["']/gi)) push(match[1]);
  for (const match of html.matchAll(/<form\b[^>]*\saction=["']([^"']+)["']/gi)) push(match[1]);
  for (const match of html.matchAll(/(?:location(?:\.href)?|window\.open)\s*(?:=|\()\s*["']([^"']+)["']/gi)) push(match[1]);
  for (const match of html.matchAll(/["'](\/(?:[a-zA-Z][a-zA-Z0-9_-]{0,40})(?:\/[a-zA-Z0-9_-]{1,40}){0,3}\/?)["']/g)) {
    push(match[1]);
  }
  return found;
}

async function fetchPage(url: string, timeoutMs = TIMEOUT_MS, cookie?: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: cookie ? { ...BROWSER_HEADERS, cookie } : BROWSER_HEADERS,
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (type && !/html|text|xml|json/i.test(type)) return null;
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

function locsFromXml(originHost: string, xml: string): { pages: string[]; sitemaps: string[] } {
  const pages: string[] = [];
  const sitemaps: string[] = [];
  for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    const raw = decodeEntities(match[1] ?? "").trim();
    const safe = isSafeHttpUrl(raw);
    if (!safe || safe.hostname !== originHost) continue;
    if (/\.xml(\?|$)/i.test(safe.pathname)) sitemaps.push(safe.href);
    else if (looksLikePage(safe, originHost)) pages.push(safe.href);
  }
  return { pages, sitemaps };
}

async function discoverFromSitemaps(origin: URL, timeoutMs: number, cookie?: string): Promise<string[]> {
  const found = new Set<string>();
  const seeds = [new URL("/sitemap.xml", origin).href, new URL("/sitemap_index.xml", origin).href];
  const robots = await fetchPage(new URL("/robots.txt", origin).href, Math.min(timeoutMs, 3500), cookie);
  if (robots) {
    for (const line of robots.split(/\r?\n/)) {
      if (!line.toLowerCase().startsWith("sitemap:")) continue;
      const raw = line.slice(line.indexOf(":") + 1).trim();
      const safe = isSafeHttpUrl(raw);
      if (safe) seeds.push(safe.href);
    }
  }
  const docs = await Promise.all(
    [...new Set(seeds)].slice(0, 3).map((href) => fetchPage(href, Math.min(timeoutMs, 3500), cookie)),
  );
  const nested: string[] = [];
  for (const xml of docs) {
    if (!xml) continue;
    const parsed = locsFromXml(origin.hostname, xml);
    for (const href of parsed.pages) found.add(href);
    nested.push(...parsed.sitemaps);
  }
  if (found.size < 4 && nested.length > 0) {
    const extra = await fetchPage(nested[0]!, Math.min(timeoutMs, 3500), cookie);
    if (extra) {
      for (const href of locsFromXml(origin.hostname, extra).pages) found.add(href);
    }
  }
  return [...found];
}

export async function crawlSite(
  startUrl: string,
  opts?: { maxPages?: number; timeoutMs?: number },
): Promise<CrawledPage[]> {
  const checked = isSafeHttpUrl(startUrl);
  if (!checked) throw new Error("Enter a public http(s) website URL.");
  const startHref = normalizePageUrl(checked.href, checked.href);
  if (!startHref) throw new Error("Enter a public http(s) website URL.");
  const origin = new URL(startHref);
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
    const normalized = normalizePageUrl(href, origin.href);
    if (!normalized || seen.has(normalized)) return;
    const next = isSafeHttpUrl(normalized);
    if (!next || !looksLikePage(next, origin.hostname)) return;
    seen.add(normalized);
    queue.push(normalized);
  };

  for (const path of PRIORITY_PATHS) push(new URL(path, origin).href);
  const mapped = await discoverFromSitemaps(origin, timeoutMs);
  for (const href of mapped) push(href);
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

const READ_CAP = 300;
const READ_BATCH = 4;

export type ReadRound = {
  pages: CrawledPage[];
  queue: string[];
  visited: string[];
  seeded: boolean;
  done: boolean;
  capped: boolean;
};

export async function readSiteRound(input: {
  url: string;
  queue?: string[];
  visited?: string[];
  seeded?: boolean;
  cookie?: string;
}): Promise<ReadRound> {
  const checked = isSafeHttpUrl(input.url);
  if (!checked) throw new Error("Enter a public http(s) website URL.");
  const startHref = normalizePageUrl(checked.href, checked.href);
  if (!startHref) throw new Error("Enter a public http(s) website URL.");
  const origin = new URL(startHref);

  const visited = new Set(
    (input.visited ?? []).filter((item) => typeof item === "string" && item.length < 500),
  );
  let queue = (input.queue ?? []).filter((item) => typeof item === "string" && item.length < 500);
  let seeded = Boolean(input.seeded);

  if (visited.size === 0 && queue.length === 0) {
    queue = [origin.href];
    for (const path of PRIORITY_PATHS) {
      const normalized = normalizePageUrl(new URL(path, origin).href, origin.href);
      if (normalized && !queue.includes(normalized)) queue.push(normalized);
    }
    if (input.cookie) {
      for (const path of MEMBER_PATHS) {
        const normalized = normalizePageUrl(new URL(path, origin).href, origin.href);
        if (normalized && !queue.includes(normalized)) queue.splice(1, 0, normalized);
      }
    }
    seeded = true;
    const mapped = await discoverFromSitemaps(origin, 4000, input.cookie).catch(() => [] as string[]);
    for (const href of mapped) {
      if (queue.length >= READ_CAP) break;
      const normalized = normalizePageUrl(href, origin.href);
      if (!normalized || queue.includes(normalized)) continue;
      const safe = isSafeHttpUrl(normalized);
      if (safe && looksLikePage(safe, origin.hostname)) queue.push(normalized);
    }
  }

  if (queue.length === 0 && !seeded) {
    seeded = true;
    for (const path of PRIORITY_PATHS) {
      const normalized = normalizePageUrl(new URL(path, origin).href, origin.href);
      if (!normalized || visited.has(normalized) || queue.includes(normalized)) continue;
      queue.push(normalized);
    }
  }

  const batch: string[] = [];
  while (queue.length > 0 && batch.length < READ_BATCH && visited.size < READ_CAP) {
    const next = queue.shift() ?? "";
    const normalized = normalizePageUrl(next, origin.href);
    if (!normalized || visited.has(normalized)) continue;
    const safe = isSafeHttpUrl(normalized);
    if (!safe || !looksLikePage(safe, origin.hostname)) continue;
    visited.add(normalized);
    batch.push(normalized);
  }

  const fetched = await Promise.all(
    batch.map(async (href) => ({ href, html: await fetchPage(href, 4000, input.cookie) })),
  );
  const pages: CrawledPage[] = [];
  for (const item of fetched) {
    if (!item.html) continue;
    const page = pageFromHtml(item.href, item.html);
    if (page) pages.push(page);
    if (visited.size >= READ_CAP) continue;
    const found: string[] = [];
    for (const link of discoverLinks(item.html)) {
      const normalized = normalizePageUrl(link, item.href);
      if (!normalized || visited.has(normalized) || queue.includes(normalized) || found.includes(normalized)) continue;
      const safe = isSafeHttpUrl(normalized);
      if (!safe || safe.hostname !== origin.hostname || !looksLikePage(safe, origin.hostname)) continue;
      found.push(normalized);
    }
    if (found.length > 0) queue = [...found, ...queue].slice(0, READ_CAP);
  }

  const capped = visited.size >= READ_CAP && queue.length > 0;
  return {
    pages,
    queue: queue.slice(0, READ_CAP),
    visited: [...visited].slice(0, READ_CAP),
    seeded,
    done: queue.length === 0 || capped,
    capped,
  };
}
