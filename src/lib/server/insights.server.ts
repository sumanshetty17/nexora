import { getSql } from "@/lib/db";
import { iso } from "@/lib/utils";
import type { InsightAction, InsightBundle } from "@/lib/types";
import { grokChat } from "./ai";
import { mapTopic } from "./serialize";
import { requireSite } from "./sites.server";
import { insertSampleTraffic } from "./demo";

function actionsFromTopics(
  topics: { topic: string; hitCount: number; frustratedCount: number; unresolvedCount: number }[],
): InsightAction[] {
  return topics.slice(0, 4).map((t) => {
    const stuck = t.frustratedCount > 0 || t.unresolvedCount > 0;
    return {
      topic: t.topic,
      title: stuck
        ? `${t.hitCount} customers ran into “${t.topic}” — ${t.frustratedCount} sounded stuck`
        : `${t.hitCount} customers asked about “${t.topic}”`,
      detail: t.unresolvedCount > 0
        ? `Put a plain-language answer on the site and in knowledge. ${t.unresolvedCount} chats still needed a human.`
        : `Move this answer higher on the page so people find it before they open chat.`,
    };
  });
}

export async function insightsForSite(userId: string, siteId: string): Promise<InsightBundle> {
  await requireSite(userId, siteId);
  const sql = await getSql();
  const topics = await sql`
    select * from topic_stats where site_id = ${siteId}
    order by hit_count desc, last_seen_at desc
    limit 12
  `;
  const sentiment = await sql<{ label: string; count: number }>`
    select coalesce(last_sentiment, 'neutral') as label, count(*)::int as count
      from conversations
     where site_id = ${siteId} and last_sentiment is not null
     group by last_sentiment
  `;
  const unresolved = await sql<{
    id: string;
    content: string;
    topic: string | null;
    created_at: unknown;
  }>`
    select id, content, topic, created_at from messages
     where site_id = ${siteId} and role = 'user' and resolved = false
     order by created_at desc
     limit 8
  `;
  const totals = await sql<{ n: number; human: number }>`
    select count(*)::int as n,
           count(*) filter (where needs_human)::int as human
      from conversations where site_id = ${siteId}
  `;
  const mapped = topics.map(mapTopic);
  return {
    topics: mapped,
    sentiment: sentiment.map((s) => ({ label: s.label, count: Number(s.count) })),
    unresolved: unresolved.map((u) => ({
      id: u.id,
      content: u.content,
      topic: u.topic,
      createdAt: iso(u.created_at),
    })),
    totalConversations: totals[0]?.n ?? 0,
    needsHuman: totals[0]?.human ?? 0,
    recommendation: null,
    actions: actionsFromTopics(mapped),
  };
}

export async function recommendForSite(userId: string, siteId: string): Promise<{ recommendation: string }> {
  await requireSite(userId, siteId);
  const sql = await getSql();
  const topics = await sql<{
    topic: string;
    hit_count: number;
    frustrated_count: number;
    unresolved_count: number;
  }>`
    select topic, hit_count, frustrated_count, unresolved_count
      from topic_stats where site_id = ${siteId}
    order by hit_count desc limit 8
  `;
  const questions = await sql<{ content: string }>`
    select content from messages
     where site_id = ${siteId} and role = 'user'
     order by created_at desc limit 12
  `;
  if (topics.length === 0 && questions.length === 0) {
    return {
      recommendation:
        "No customer questions yet. Install the widget or use the playground so Nexora can see where people get stuck.",
    };
  }
  const result = await grokChat({
    maxTokens: 420,
    messages: [
      {
        role: "system",
        content:
          "You are an operator's analyst. Write 3 short, concrete recommendations for a business owner based on chatbot traffic. No fluff, no emoji. Plain sentences. Mention the topic names given.",
      },
      {
        role: "user",
        content: `Topics (hits / frustrated / unresolved):\n${topics
          .map((t) => `${t.topic}: ${t.hit_count}/${t.frustrated_count}/${t.unresolved_count}`)
          .join("\n")}\n\nRecent questions:\n${questions.map((q) => `- ${q.content}`).join("\n")}`,
      },
    ],
  });
  if (!result.ok) {
    const top = topics[0];
    return {
      recommendation: top
        ? `Customers ask about “${top.topic}” more than anything else. Put a plain-language answer on the site and add it to the knowledge base so the assistant can resolve it without a human.`
        : "Add the most common questions you hear on sales calls into the knowledge base.",
    };
  }
  return { recommendation: result.text.trim() };
}

export async function seedTrafficForSite(userId: string, siteId: string) {
  await requireSite(userId, siteId);
  const sql = await getSql();
  const count = await sql<{ n: number }>`
    select count(*)::int as n from conversations where site_id = ${siteId}
  `;
  if ((count[0]?.n ?? 0) > 4) return { added: 0 };
  const added = await insertSampleTraffic(siteId);
  return { added };
}
