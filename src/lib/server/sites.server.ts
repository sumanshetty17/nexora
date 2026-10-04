import { getSql } from "@/lib/db";
import { nid, publicId } from "@/lib/utils";
import type { Site, UsageSummary } from "@/lib/types";
import { mapSite } from "./serialize";
import { grokChat, parseModelJson } from "./ai";
import { indexDocument, retrieveChunks } from "./rag";
import { DEMO_BRIEF, DEMO_DOCS, DEMO_NAME } from "./demo-content";
import { insertSampleTraffic } from "./demo";

export async function requireSite(userId: string, siteId: string): Promise<Site> {
  const sql = await getSql();
  const rows = await sql`select * from sites where id = ${siteId} and user_id = ${userId} limit 1`;
  const row = rows[0];
  if (!row) throw new Error("Assistant not found");
  return mapSite(row);
}

export async function listSitesForUser(userId: string): Promise<Site[]> {
  const sql = await getSql();
  const rows = await sql`
    select s.*,
           (select count(*)::int from knowledge_docs d where d.site_id = s.id) as doc_count,
           (select coalesce(sum(char_count),0)::int from knowledge_docs d where d.site_id = s.id) as char_count,
           (select count(*)::int from conversations c where c.site_id = s.id) as conversation_count
      from sites s
     where s.user_id = ${userId}
     order by s.updated_at desc
  `;
  return rows.map(mapSite);
}

export async function createSiteForUser(
  userId: string,
  data: { name: string; websiteUrl?: string; industry?: string; description?: string; tone?: string },
): Promise<Site> {
  const name = data.name.trim();
  if (!name) throw new Error("Give your assistant a company name.");
  const sql = await getSql();
  const id = nid("site");
  const pid = publicId();
  await sql`
    insert into sites (id, user_id, public_id, name, website_url, industry, description, tone, status)
    values (
      ${id}, ${userId}, ${pid}, ${name},
      ${data.websiteUrl?.trim() || null},
      ${data.industry?.trim() || null},
      ${data.description?.trim() || ""},
      ${data.tone?.trim() || "warm, concise, professional"},
      ${"draft"}
    )
  `;
  if (data.description?.trim()) {
    const docId = nid("doc");
    const content = data.description.trim();
    await sql`
      insert into knowledge_docs (id, site_id, user_id, kind, title, content, char_count)
      values (${docId}, ${id}, ${userId}, ${"profile"}, ${"Company profile"}, ${content}, ${content.length})
    `;
    await indexDocument(sql, { siteId: id, docId, content });
  }
  return requireSite(userId, id);
}

export async function updateSiteForUser(
  userId: string,
  data: {
    siteId: string;
    name?: string;
    websiteUrl?: string;
    industry?: string;
    description?: string;
    tone?: string;
    welcomeMessage?: string;
    brandColor?: string;
    allowedOrigins?: string;
    status?: "draft" | "live";
    emailAssistantEnabled?: boolean;
  },
): Promise<Site> {
  const current = await requireSite(userId, data.siteId);
  const sql = await getSql();
  const name = data.name?.trim() || current.name;
  const websiteUrl = data.websiteUrl === undefined ? current.websiteUrl : data.websiteUrl.trim() || null;
  const industry = data.industry === undefined ? current.industry : data.industry.trim() || null;
  const description = data.description === undefined ? current.description : data.description;
  const tone = data.tone?.trim() || current.tone;
  const welcome = data.welcomeMessage?.trim() || current.welcomeMessage;
  const color = data.brandColor?.trim() || current.brandColor;
  const origins = data.allowedOrigins === undefined ? current.allowedOrigins : data.allowedOrigins.trim() || "*";
  const status = data.status ?? current.status;
  const emailOn =
    data.emailAssistantEnabled === undefined ? current.emailAssistantEnabled : data.emailAssistantEnabled;
  await sql`
    update sites set
      name = ${name},
      website_url = ${websiteUrl},
      industry = ${industry},
      description = ${description},
      tone = ${tone},
      welcome_message = ${welcome},
      brand_color = ${color},
      allowed_origins = ${origins},
      status = ${status},
      email_assistant_enabled = ${emailOn},
      updated_at = now()
    where id = ${data.siteId} and user_id = ${userId}
  `;
  return requireSite(userId, data.siteId);
}

export async function deleteSiteForUser(userId: string, siteId: string) {
  const sql = await getSql();
  await sql`delete from knowledge_chunks where site_id = ${siteId} and site_id in (select id from sites where id = ${siteId} and user_id = ${userId})`;
  await sql`delete from knowledge_docs where site_id = ${siteId} and user_id = ${userId}`;
  await sql`delete from messages where site_id = ${siteId} and site_id in (select id from sites where id = ${siteId} and user_id = ${userId})`;
  await sql`delete from conversations where site_id = ${siteId} and site_id in (select id from sites where id = ${siteId} and user_id = ${userId})`;
  await sql`delete from topic_stats where site_id = ${siteId} and site_id in (select id from sites where id = ${siteId} and user_id = ${userId})`;
  await sql`delete from emails where site_id = ${siteId} and user_id = ${userId}`;
  await sql`delete from usage_events where site_id = ${siteId} and user_id = ${userId}`;
  await sql`delete from sites where id = ${siteId} and user_id = ${userId}`;
  return { ok: true as const };
}

export async function prepareAssistantForUser(userId: string, siteId: string): Promise<Site> {
  const site = await requireSite(userId, siteId);
  const sql = await getSql();
  const chunks = await retrieveChunks(
    sql,
    siteId,
    `${site.name} ${site.description} hours shipping returns`,
    8,
  );
  const corpus = chunks.map((c) => c.content).join("\n\n---\n\n").slice(0, 10_000);
  const result = await grokChat({
    maxTokens: 500,
    messages: [
      {
        role: "system",
        content:
          "You write a compact brief for a customer-facing website assistant. Return JSON only: {\"brief\": string, \"welcome\": string}. The brief is 180-280 words, second person to the assistant, listing only facts present in the source. Welcome is one sentence.",
      },
      {
        role: "user",
        content: `Company: ${site.name}\nURL: ${site.websiteUrl ?? "n/a"}\nTone: ${site.tone}\nDescription: ${site.description}\n\nSource material:\n${corpus || site.description}`,
      },
    ],
  });
  let brief = site.systemBrief;
  let welcome = site.welcomeMessage;
  if (result.ok) {
    const parsed = parseModelJson<{ brief?: string; welcome?: string }>(result.text);
    if (parsed?.brief) brief = parsed.brief;
    if (parsed?.welcome) welcome = parsed.welcome;
  } else if (!brief) {
    brief = `${site.name} assistant. ${site.description} Tone: ${site.tone}. Answer only from the knowledge base. If unsure, offer a human follow-up.`;
  }
  await sql`
    update sites set system_brief = ${brief}, welcome_message = ${welcome}, status = ${"live"}, updated_at = now()
    where id = ${siteId} and user_id = ${userId}
  `;
  return requireSite(userId, siteId);
}

export async function cloneHarborForUser(userId: string): Promise<Site> {
  const sql = await getSql();
  const id = nid("site");
  const pid = publicId();
  await sql`
    insert into sites (
      id, user_id, public_id, name, website_url, industry, description, tone,
      system_brief, welcome_message, brand_color, status
    ) values (
      ${id}, ${userId}, ${pid}, ${DEMO_NAME},
      ${"https://harborandoak.example"}, ${"furniture"},
      ${"Solid-wood furniture studio in Portland, Oregon."},
      ${"warm, specific, never salesy"},
      ${DEMO_BRIEF},
      ${"Welcome to Harbor & Oak — looking for a table, a finish, or a ship date?"},
      ${"#21564A"}, ${"live"}
    )
  `;
  for (const doc of DEMO_DOCS) {
    const docId = nid("doc");
    await sql`
      insert into knowledge_docs (id, site_id, user_id, kind, title, content, char_count)
      values (${docId}, ${id}, ${userId}, ${doc.kind}, ${doc.title}, ${doc.content}, ${doc.content.length})
    `;
    await indexDocument(sql, { siteId: id, docId, content: doc.content });
  }
  await insertSampleTraffic(id);
  return requireSite(userId, id);
}

export async function usageForUser(userId: string): Promise<UsageSummary> {
  const sql = await getSql();
  const sites = await sql<{ n: number }>`select count(*)::int as n from sites where user_id = ${userId}`;
  const conv = await sql<{ n: number }>`
    select count(*)::int as n from usage_events
     where user_id = ${userId} and kind = 'conversation'
       and created_at > now() - interval '30 days'
  `;
  const emails = await sql<{ n: number }>`
    select count(*)::int as n from usage_events
     where user_id = ${userId} and kind = 'email_reply'
       and created_at > now() - interval '30 days'
  `;
  const chars = await sql<{ n: number }>`
    select coalesce(sum(d.char_count),0)::int as n
      from knowledge_docs d
      join sites s on s.id = d.site_id
     where s.user_id = ${userId}
  `;
  return {
    sites: sites[0]?.n ?? 0,
    conversations30d: conv[0]?.n ?? 0,
    emails30d: emails[0]?.n ?? 0,
    knowledgeChars: chars[0]?.n ?? 0,
  };
}
