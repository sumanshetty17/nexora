import { getSql } from "@/lib/db";
import { nid } from "@/lib/utils";
import type { ChatMessage, ChatTurnResult, Conversation, WidgetConfig } from "@/lib/types";
import { iso } from "@/lib/utils";
import { grokChat, hasXaiKey, parseModelJson } from "./ai";
import { retrieveChunks } from "./rag";
import { ensureDemoSite } from "./demo";
import { mapConversation } from "./serialize";
import { requireSite } from "./sites.server";

type SiteRow = {
  id: string;
  user_id: string;
  public_id: string;
  name: string;
  tone: string;
  system_brief: string;
  welcome_message: string;
  brand_color: string;
  status: string;
  description: string;
};

async function loadSiteByPublicId(publicId: string): Promise<SiteRow | null> {
  await ensureDemoSite();
  const sql = await getSql();
  const rows = await sql<SiteRow>`
    select id, user_id, public_id, name, tone, system_brief, welcome_message, brand_color, status, description
      from sites where public_id = ${publicId} limit 1
  `;
  return rows[0] ?? null;
}

function extractiveReply(question: string, chunks: { content: string; title: string }[]): string {
  if (chunks.length === 0) {
    return "I don't have that in the knowledge base yet. A teammate can follow up if you leave a bit more detail.";
  }
  const q = question.toLowerCase();
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const scored = chunks
    .map((c) => {
      const hits = words.filter((w) => c.content.toLowerCase().includes(w)).length;
      return { c, hits };
    })
    .sort((a, b) => b.hits - a.hits);
  const best = scored[0];
  if (!best || best.hits === 0) {
    return "I don't have that in the knowledge base yet. A teammate can follow up if you leave a bit more detail.";
  }
  const excerpt = best.c.content.slice(0, 420).trim();
  return `From ${best.c.title}: ${excerpt}`;
}

async function bumpTopic(
  siteId: string,
  topic: string | null,
  sentiment: string | null,
  resolved: boolean | null,
) {
  if (!topic) return;
  const sql = await getSql();
  const key = topic.trim().toLowerCase().slice(0, 48);
  if (!key) return;
  await sql.query(
    `insert into topic_stats (site_id, topic, hit_count, frustrated_count, unresolved_count, last_seen_at)
     values ($1,$2,1,$3,$4, now())
     on conflict (site_id, topic) do update set
       hit_count = topic_stats.hit_count + 1,
       frustrated_count = topic_stats.frustrated_count + $3,
       unresolved_count = topic_stats.unresolved_count + $4,
       last_seen_at = now()`,
    [siteId, key, sentiment === "frustrated" ? 1 : 0, resolved === false ? 1 : 0],
  );
}

async function runTurn(input: {
  site: SiteRow;
  conversationId?: string;
  message: string;
  channel: string;
}): Promise<ChatTurnResult> {
  const message = input.message.trim();
  if (!message) throw new Error("Type a message first.");
  if (message.length > 2000) throw new Error("Keep questions under 2,000 characters.");

  const sql = await getSql();
  let conversationId = input.conversationId;
  if (conversationId) {
    const found = await sql<{ id: string; message_count: number }>`
      select id, message_count from conversations where id = ${conversationId} and site_id = ${input.site.id} limit 1
    `;
    if (!found[0]) conversationId = undefined;
    else if (found[0].message_count >= 40) {
      throw new Error("This conversation is at its length cap. Start a new one.");
    }
  }
  if (!conversationId) {
    conversationId = nid("cv");
    await sql`
      insert into conversations (id, site_id, channel, message_count)
      values (${conversationId}, ${input.site.id}, ${input.channel}, 0)
    `;
    await sql`
      insert into usage_events (id, user_id, site_id, kind)
      values (${nid("use")}, ${input.site.user_id}, ${input.site.id}, ${"conversation"})
    `;
  }

  const userMsgId = nid("msg");
  await sql`
    insert into messages (id, conversation_id, site_id, role, content)
    values (${userMsgId}, ${conversationId}, ${input.site.id}, ${"user"}, ${message})
  `;

  const chunks = await retrieveChunks(sql, input.site.id, message, 6);
  const history = await sql<{ role: string; content: string }>`
    select role, content from messages
     where conversation_id = ${conversationId}
     order by created_at desc
     limit 10
  `;
  const chronological = history.reverse();

  type ModelOut = {
    reply?: string;
    topic?: string;
    intent?: string;
    sentiment?: string;
    resolved?: boolean;
    needs_human?: boolean;
  };

  let parsed: ModelOut | null = null;
  let reply = "";

  if (hasXaiKey()) {
    const contextBlock = chunks
      .map((c, i) => `[#${i + 1} ${c.title}]\n${c.content.slice(0, 1100)}`)
      .join("\n\n");
    const result = await grokChat({
      maxTokens: 650,
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: `You are the website assistant for ${input.site.name}.
${input.site.system_brief || input.site.description}
Tone: ${input.site.tone}.
Rules:
- Answer only with facts in the knowledge excerpts. If the excerpts do not contain the answer, say you are not sure and offer a human follow-up.
- Never invent prices, policies, legal claims, or availability.
- Keep replies under 140 words unless a procedure needs steps.
- Return JSON only: {"reply": string, "topic": string, "intent": "question"|"complaint"|"purchase"|"other", "sentiment": "positive"|"neutral"|"frustrated", "resolved": boolean, "needs_human": boolean}.`,
        },
        {
          role: "user",
          content: `Knowledge excerpts:\n${contextBlock || "(none yet)"}\n\nConversation:\n${chronological
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")}\n\nLatest customer message: ${message}`,
        },
      ],
    });
    if (result.ok) {
      parsed = parseModelJson<ModelOut>(result.text);
      reply = parsed?.reply?.trim() || result.text.trim();
      if (reply.startsWith("{")) {
        reply = parsed?.reply?.trim() || extractiveReply(message, chunks);
      }
    }
  }

  if (!reply) reply = extractiveReply(message, chunks);

  const topic = parsed?.topic?.trim() || inferTopic(message);
  const sentiment = parsed?.sentiment ?? (/\b(angry|terrible|worst|scam|refund)\b/i.test(message) ? "frustrated" : "neutral");
  const unsure =
    chunks.length === 0 ||
    /don['’]t have that|not sure|teammate can follow|knowledge base yet/i.test(reply);
  const needsHuman = Boolean(parsed?.needs_human) || unsure || sentiment === "frustrated";
  const resolved = parsed?.resolved ?? !needsHuman;
  const intent = parsed?.intent ?? "question";

  await sql`
    update messages
       set topic = ${topic}, intent = ${intent}, sentiment = ${sentiment}, resolved = ${resolved}
     where id = ${userMsgId}
  `;

  const asstId = nid("msg");
  await sql`
    insert into messages (id, conversation_id, site_id, role, content, topic, intent, sentiment, resolved)
    values (
      ${asstId}, ${conversationId}, ${input.site.id}, ${"assistant"}, ${reply},
      ${topic}, ${intent}, ${sentiment}, ${resolved}
    )
  `;
  await sql`
    update conversations set
      message_count = message_count + 2,
      last_topic = ${topic},
      last_sentiment = ${sentiment},
      needs_human = ${needsHuman},
      updated_at = now()
    where id = ${conversationId}
  `;
  await bumpTopic(input.site.id, topic, sentiment, resolved);

  return {
    conversationId,
    reply,
    topic,
    sentiment,
    needsHuman,
    sources: chunks.slice(0, 3).map((c) => ({
      title: c.title,
      excerpt: c.content.slice(0, 160),
    })),
  };
}

function inferTopic(message: string): string {
  const m = message.toLowerCase();
  if (/ship|deliver|white-?glove|freight|postage/.test(m)) return "shipping";
  if (/return|refund|warranty|scratch|damage/.test(m)) return "returns";
  if (/custom|made to order|retainer|drawing/.test(m)) return "custom orders";
  if (/hour|open|closed|showroom|visit/.test(m)) return "hours";
  if (/price|cost|how much|\$/.test(m)) return "pricing";
  if (/care|oil|finish|water ring|clean/.test(m)) return "care";
  return "general";
}

export async function getWidgetConfigForPublicId(publicId: string): Promise<WidgetConfig> {
  const site = await loadSiteByPublicId(publicId);
  if (!site) throw new Error("This assistant is not available.");
  return {
    publicId: site.public_id,
    name: site.name,
    welcomeMessage: site.welcome_message,
    brandColor: site.brand_color,
    status: site.status === "live" ? "live" : "draft",
    suggestions: await suggestionsForSite(site.id),
  };
}

async function suggestionsForSite(siteId: string): Promise<string[]> {
  const sql = await getSql();
  const faqs = await sql<{ title: string }>`
    select title from knowledge_docs
     where site_id = ${siteId} and kind = 'faq'
     order by created_at desc
     limit 6
  `;
  const fromFaqs = faqs.map((f) => f.title.trim()).filter((t) => t.endsWith("?") || t.length > 8);
  if (fromFaqs.length >= 3) return fromFaqs.slice(0, 3);

  const titles = await sql<{ title: string; content: string }>`
    select title, content from knowledge_docs where site_id = ${siteId} order by created_at desc limit 8
  `;
  const blob = titles.map((t) => `${t.title} ${t.content}`).join(" ").toLowerCase();
  const unique: string[] = [];
  const maybe = (q: string, test: boolean) => {
    if (test && !unique.includes(q)) unique.push(q);
  };
  maybe("How does shipping work?", /ship|deliver|freight|postage/.test(blob));
  maybe("What is the return policy?", /return|refund|warranty/.test(blob));
  maybe("What are your hours?", /hour|open|showroom|visit/.test(blob));
  maybe("How does pricing work?", /price|cost|how much/.test(blob));
  maybe("Do you take custom orders?", /custom|made to order/.test(blob));
  for (const fallback of ["What are your hours?", "How does shipping work?", "What is the return policy?"]) {
    if (unique.length >= 3) break;
    if (!unique.includes(fallback)) unique.push(fallback);
  }
  return unique.slice(0, 3);
}

export async function widgetTurn(input: {
  publicId: string;
  conversationId?: string;
  message: string;
}): Promise<ChatTurnResult> {
  const site = await loadSiteByPublicId(input.publicId);
  if (!site) throw new Error("This assistant is not available.");
  return runTurn({
    site,
    conversationId: input.conversationId,
    message: input.message,
    channel: "widget",
  });
}

export async function playgroundTurn(
  userId: string,
  input: { siteId: string; conversationId?: string; message: string },
): Promise<ChatTurnResult> {
  const owned = await requireSite(userId, input.siteId);
  const sql = await getSql();
  const rows = await sql<SiteRow>`
    select id, user_id, public_id, name, tone, system_brief, welcome_message, brand_color, status, description
      from sites where id = ${owned.id} limit 1
  `;
  const site = rows[0];
  if (!site) throw new Error("Assistant not found");
  return runTurn({
    site,
    conversationId: input.conversationId,
    message: input.message,
    channel: "playground",
  });
}

export async function listConversationsForSite(userId: string, siteId: string): Promise<Conversation[]> {
  await requireSite(userId, siteId);
  const sql = await getSql();
  const rows = await sql`
    select c.*,
      (select m.content from messages m
        where m.conversation_id = c.id and m.role = 'user'
        order by m.created_at asc limit 1) as preview
      from conversations c
     where c.site_id = ${siteId}
     order by c.updated_at desc
     limit 80
  `;
  return rows.map(mapConversation);
}

export async function conversationMessages(
  userId: string,
  input: { siteId: string; conversationId: string },
): Promise<ChatMessage[]> {
  await requireSite(userId, input.siteId);
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    role: string;
    content: string;
    topic: string | null;
    sentiment: string | null;
    created_at: unknown;
  }>`
    select id, role, content, topic, sentiment, created_at
      from messages
     where conversation_id = ${input.conversationId} and site_id = ${input.siteId}
     order by created_at asc
  `;
  return rows.map((r) => ({
    id: r.id,
    role: r.role === "assistant" ? "assistant" : "user",
    content: r.content,
    topic: r.topic,
    sentiment: r.sentiment,
    createdAt: iso(r.created_at),
  }));
}

export async function exportConversationsCsv(userId: string, siteId: string): Promise<string> {
  const rows = await listConversationsForSite(userId, siteId);
  const header = "id,channel,topic,sentiment,needs_human,preview,updated_at";
  const body = rows.map((c) =>
    [
      c.id,
      c.channel,
      csv(c.lastTopic),
      csv(c.lastSentiment),
      c.needsHuman ? "yes" : "no",
      csv(c.preview),
      c.updatedAt,
    ].join(","),
  );
  return [header, ...body].join("\n");
}

export async function ownerReplyForSite(
  userId: string,
  input: { siteId: string; conversationId: string; message: string },
): Promise<{ ok: true }> {
  await requireSite(userId, input.siteId);
  const message = input.message.trim();
  if (!message) throw new Error("Type a reply first.");
  const sql = await getSql();
  const found = await sql<{ id: string }>`
    select id from conversations where id = ${input.conversationId} and site_id = ${input.siteId} limit 1
  `;
  if (!found[0]) throw new Error("Conversation not found");
  await sql`
    insert into messages (id, conversation_id, site_id, role, content)
    values (${nid("msg")}, ${input.conversationId}, ${input.siteId}, ${"assistant"}, ${message})
  `;
  await sql`
    update conversations set
      message_count = message_count + 1,
      needs_human = false,
      last_sentiment = ${"positive"},
      updated_at = now()
    where id = ${input.conversationId}
  `;
  return { ok: true };
}

function csv(value: string | null | undefined): string {
  const v = value ?? "";
  if (/[",\n]/.test(v)) return `"${v.replaceAll('"', '""')}"`;
  return v;
}
