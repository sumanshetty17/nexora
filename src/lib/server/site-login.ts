import { isSafeHttpUrl } from "./crawl";

const BROWSER_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
};

const LOGIN_PATHS = ["/login", "/signin", "/sign-in", "/account/login", "/auth/login"];

export type SiteSession = {
  ok: boolean;
  cookie: string;
  method: "session_cookies" | "form" | "none";
  error: string | null;
};

function sameHost(raw: string, host: string): URL | null {
  const url = isSafeHttpUrl(raw);
  if (!url || url.hostname !== host) return null;
  return url;
}

function attr(tag: string, name: string): string {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match?.[1] ?? "";
}

function serialize(jar: Map<string, string>): string {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function absorb(lines: string[], jar: Map<string, string>) {
  for (const line of lines) {
    const pair = line.split(";")[0] ?? "";
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (!/^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/.test(name)) continue;
    jar.set(name, value);
  }
}

export function cookieHeaderFromPaste(raw: string, pageUrl: string): string {
  const host = isSafeHttpUrl(pageUrl)?.hostname ?? "";
  const text = raw.trim();
  if (!text) return "";
  const jar = new Map<string, string>();
  const take = (name: unknown, value: unknown, domain?: unknown) => {
    if (typeof name !== "string" || typeof value !== "string") return;
    if (!/^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/.test(name)) return;
    if (typeof domain === "string" && domain && host) {
      const bare = domain.replace(/^\./, "");
      if (bare !== host && !host.endsWith(`.${bare}`) && !bare.endsWith(host)) return;
    }
    jar.set(name, value);
  };
  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      const data = JSON.parse(text) as unknown;
      const list = Array.isArray(data)
        ? data
        : data && typeof data === "object" && Array.isArray((data as { cookies?: unknown }).cookies)
          ? (data as { cookies: unknown[] }).cookies
          : [];
      for (const item of list) {
        if (!item || typeof item !== "object") continue;
        const row = item as { name?: unknown; value?: unknown; domain?: unknown };
        take(row.name, row.value, row.domain);
      }
    } catch {
      return "";
    }
  } else {
    for (const part of text.replace(/\n/g, ";").split(";")) {
      const eq = part.indexOf("=");
      if (eq <= 0) continue;
      const name = part.slice(0, eq).trim();
      if (/^(path|domain|expires|max-age|secure|httponly|samesite)$/i.test(name)) continue;
      take(name, part.slice(eq + 1).trim());
    }
  }
  return serialize(jar).slice(0, 6000);
}

async function request(
  url: string,
  host: string,
  jar: Map<string, string>,
  init: RequestInit,
  hops = 0,
): Promise<{ url: string; status: number; body: string }> {
  const headers = new Headers(init.headers);
  const cookie = serialize(jar);
  if (cookie) headers.set("cookie", cookie);
  const res = await fetch(url, { ...init, headers, redirect: "manual" });
  const setCookies =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  absorb(setCookies, jar);
  const location = res.headers.get("location");
  if (location && res.status >= 300 && res.status < 400 && hops < 6) {
    const next = sameHost(new URL(location, url).href, host);
    if (!next) return { url, status: res.status, body: "" };
    return request(next.href, host, jar, { method: "GET", headers: BROWSER_HEADERS }, hops + 1);
  }
  const body = await res.text();
  return { url: res.url || url, status: res.status, body: body.slice(0, 500_000) };
}

function loginForm(
  html: string,
  pageUrl: string,
  host: string,
): { action: string; body: URLSearchParams; user: string; pass: string } | null {
  const forms = [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)];
  for (const form of forms) {
    const inputs = [...form[2].matchAll(/<input\b[^>]*>/gi)].map((tag) => ({
      name: attr(tag[0], "name"),
      type: (attr(tag[0], "type") || "text").toLowerCase(),
      value: attr(tag[0], "value"),
    }));
    const pass = inputs.find((field) => field.type === "password" && field.name);
    if (!pass?.name) continue;
    const user = inputs.find(
      (field) =>
        field.name &&
        field.type !== "hidden" &&
        field.type !== "password" &&
        field.type !== "submit" &&
        (field.type === "email" || /email|user|login/i.test(field.name) || field.type === "text"),
    );
    if (!user?.name) continue;
    const actionRaw = attr(form[1] ?? "", "action");
    const action = sameHost(new URL(actionRaw || pageUrl, pageUrl).href, host);
    if (!action) continue;
    const body = new URLSearchParams();
    for (const field of inputs) {
      if (!field.name || field.type === "submit" || field.type === "password" || field.name === user.name) continue;
      if (field.type === "hidden" || field.value) body.set(field.name, field.value);
    }
    const button = form[2].match(/<button\b[^>]*name=["']([^"']+)["'][^>]*>/i);
    if (button?.[1]) body.set(button[1], attr(button[0], "value") || "1");
    return { action: action.href, body, user: user.name, pass: pass.name };
  }
  return null;
}

export async function openSiteSession(input: {
  url: string;
  loginUrl?: string;
  username?: string;
  password?: string;
  sessionCookies?: string;
}): Promise<SiteSession> {
  const start = isSafeHttpUrl(input.url.trim());
  if (!start) return { ok: false, cookie: "", method: "none", error: "Enter a public http(s) website URL." };
  const pasted = cookieHeaderFromPaste(input.sessionCookies ?? "", start.href);
  if (pasted) return { ok: true, cookie: pasted, method: "session_cookies", error: null };

  const username = (input.username ?? "").trim();
  const password = input.password ?? "";
  if (!username || !password) return { ok: true, cookie: "", method: "none", error: null };
  if (username.length > 200 || password.length > 200) {
    return { ok: false, cookie: "", method: "form", error: "Keep the login under 200 characters." };
  }

  const jar = new Map<string, string>();
  const candidates = input.loginUrl?.trim()
    ? [input.loginUrl.trim()]
    : [start.href, ...LOGIN_PATHS.map((path) => new URL(path, start).href)];

  let lastError = "Could not find username/password fields. Paste the session cookie after you sign in yourself.";
  for (const candidate of candidates) {
    const page = sameHost(candidate, start.hostname);
    if (!page) continue;
    let loaded: { url: string; status: number; body: string };
    try {
      loaded = await request(page.href, start.hostname, jar, { method: "GET", headers: BROWSER_HEADERS });
    } catch {
      continue;
    }
    const form = loginForm(loaded.body, loaded.url, start.hostname);
    if (!form) continue;
    form.body.set(form.user, username);
    form.body.set(form.pass, password);
    let sent: { url: string; status: number; body: string };
    try {
      sent = await request(form.action, start.hostname, jar, {
        method: "POST",
        headers: {
          ...BROWSER_HEADERS,
          "content-type": "application/x-www-form-urlencoded",
          origin: start.origin,
          referer: loaded.url,
        },
        body: form.body.toString(),
      });
    } catch {
      lastError = "The login form did not respond.";
      continue;
    }
    const stillLogin = /\/(login|signin|sign-in|auth)(\/|$|\?)/i.test(sent.url) && /type=["']password["']/i.test(sent.body);
    if (sent.status >= 400 || stillLogin || jar.size === 0) {
      lastError = "Still on a login page after submit — check the email and password, or paste the session cookie if the site asks for a code.";
      continue;
    }
    return { ok: true, cookie: serialize(jar).slice(0, 6000), method: "form", error: null };
  }
  return { ok: false, cookie: "", method: "form", error: lastError };
}
