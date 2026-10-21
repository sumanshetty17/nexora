import { isSafeHttpUrl, readPublicPage, type CrawledPage } from "./crawl";

const SEARCH_TIMEOUT_MS = 4500;

function hostLabel(url: URL): string {
  return url.hostname.replace(/^www\./, "");
}

async function fetchJson(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "NexoraBot/1.0" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function duckAbstract(query: string): Promise<string> {
  const body = (await fetchJson(
    "https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q=" + encodeURIComponent(query),
  )) as { AbstractText?: string; RelatedTopics?: { Text?: string }[] } | null;
  const related = (body?.RelatedTopics ?? [])
    .map((topic) => topic.Text?.trim() ?? "")
    .filter((text) => text.length > 40)
    .slice(0, 4)
    .join("\n");
  return [body?.AbstractText?.trim() ?? "", related].filter(Boolean).join("\n\n");
}

async function wikipediaExtract(query: string): Promise<string> {
  const searchUrl =
    "https://en.wikipedia.org/w/api.php?action=query&list=search&utf8=1&format=json&srlimit=1&srsearch=" +
    encodeURIComponent(query);
  const found = (await fetchJson(searchUrl)) as {
    query?: { search?: { title?: string }[] };
  } | null;
  const title = found?.query?.search?.[0]?.title;
  if (!title) return "";
  const extractUrl =
    "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exchars=4000&format=json&titles=" +
    encodeURIComponent(title);
  const body = (await fetchJson(extractUrl)) as {
    query?: { pages?: Record<string, { extract?: string }> };
  } | null;
  const pages = body?.query?.pages ?? {};
  const extract = Object.values(pages)[0]?.extract?.trim() ?? "";
  if (extract.length < 80) return "";
  return extract;
}

function duckLinks(html: string, ownHost: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/uddg=([^&"']+)/gi)) {
    let href = "";
    try {
      href = decodeURIComponent(match[1] ?? "");
    } catch {
      continue;
    }
    const url = isSafeHttpUrl(href);
    if (!url) continue;
    if (url.hostname === ownHost || url.hostname.endsWith("." + ownHost)) continue;
    if (/duckduckgo\.com|google\.com|facebook\.com|instagram\.com|youtube\.com|tiktok\.com/i.test(url.hostname)) {
      continue;
    }
    if (seen.has(url.href)) continue;
    seen.add(url.href);
    out.push(url.href);
    if (out.length >= 3) break;
  }
  return out;
}

async function duckduckgoPages(query: string, ownHost: string): Promise<CrawledPage[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  let html = "";
  try {
    const res = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NexoraBot/1.0)",
        Accept: "text/html",
      },
    });
    if (res.ok) html = await res.text();
  } catch {
    html = "";
  } finally {
    clearTimeout(timer);
  }
  if (!html) return [];
  const links = duckLinks(html, ownHost);
  const pages = await Promise.all(links.map((href) => readPublicPage(href, SEARCH_TIMEOUT_MS)));
  return pages.filter((page): page is CrawledPage => Boolean(page));
}

/**
 * Public-web notes about a company. No model calls — Wikipedia and web search only.
 * Failures are ignored so a site crawl still succeeds on its own.
 */
export async function researchPublicWeb(origin: URL, siteTitle: string): Promise<CrawledPage[]> {
  const label = hostLabel(origin);
  const query = [siteTitle, label].filter(Boolean).join(" ").slice(0, 180);
  const [wiki, abstract, searched] = await Promise.all([
    wikipediaExtract(query).catch(() => ""),
    duckAbstract(query).catch(() => ""),
    duckduckgoPages(`${label} company about history products services`, origin.hostname).catch(() => []),
  ]);

  const notes: CrawledPage[] = [];
  const brief = [wiki, abstract].filter((part) => part.length > 80).join("\n\n");
  if (brief) {
    notes.push({
      url: origin.href,
      title: "Company facts",
      content: brief.slice(0, 6000),
    });
  }
  for (const page of searched) {
    notes.push({
      url: origin.href,
      title: "Company facts",
      content: page.content.slice(0, 4000),
    });
  }
  return notes.slice(0, 4);
}
