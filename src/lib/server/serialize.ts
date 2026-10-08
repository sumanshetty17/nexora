import { iso } from "@/lib/utils";
import type { Conversation, EmailItem, KnowledgeDoc, Lead, Site, TopicStat } from "@/lib/types";

type Row = Record<string, unknown>;

export function mapSite(row: Row): Site {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    publicId: String(row.public_id),
    name: String(row.name),
    websiteUrl: row.website_url ? String(row.website_url) : null,
    industry: row.industry ? String(row.industry) : null,
    description: String(row.description ?? ""),
    tone: String(row.tone ?? "warm, concise, professional"),
    systemBrief: String(row.system_brief ?? ""),
    welcomeMessage: String(row.welcome_message ?? "Hi — how can I help today?"),
    brandColor: String(row.brand_color ?? "#21564A"),
    allowedOrigins: String(row.allowed_origins ?? "*"),
    emailAssistantEnabled: Boolean(row.email_assistant_enabled),
    status: row.status === "live" ? "live" : "draft",
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    docCount: num(row.doc_count),
    charCount: num(row.char_count),
    conversationCount: num(row.conversation_count),
  };
}

export function mapDoc(row: Row): KnowledgeDoc {
  return {
    id: String(row.id),
    siteId: String(row.site_id),
    kind: (["url", "file", "faq", "profile", "note"].includes(String(row.kind))
      ? row.kind
      : "note") as KnowledgeDoc["kind"],
    title: String(row.title),
    sourceUrl: row.source_url ? String(row.source_url) : null,
    content: String(row.content ?? ""),
    charCount: Number(row.char_count ?? 0),
    createdAt: iso(row.created_at),
  };
}

export function mapConversation(row: Row): Conversation {
  return {
    id: String(row.id),
    siteId: String(row.site_id),
    channel: String(row.channel ?? "widget"),
    visitorLabel: row.visitor_label ? String(row.visitor_label) : null,
    messageCount: Number(row.message_count ?? 0),
    lastTopic: row.last_topic ? String(row.last_topic) : null,
    lastSentiment: row.last_sentiment ? String(row.last_sentiment) : null,
    needsHuman: Boolean(row.needs_human),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    preview: row.preview ? String(row.preview) : null,
  };
}

export function mapTopic(row: Row): TopicStat {
  return {
    topic: String(row.topic),
    hitCount: Number(row.hit_count ?? 0),
    frustratedCount: Number(row.frustrated_count ?? 0),
    unresolvedCount: Number(row.unresolved_count ?? 0),
    lastSeenAt: iso(row.last_seen_at),
  };
}

export function mapEmail(row: Row): EmailItem {
  const severity = String(row.severity);
  const status = String(row.status);
  return {
    id: String(row.id),
    siteId: String(row.site_id),
    fromName: String(row.from_name),
    fromEmail: String(row.from_email),
    subject: String(row.subject),
    body: String(row.body),
    receivedAt: iso(row.received_at),
    severity:
      severity === "urgent" || severity === "sensitive" ? severity : "routine",
    status:
      status === "drafted" || status === "sent" || status === "escalated"
        ? status
        : "new",
    draftReply: row.draft_reply ? String(row.draft_reply) : null,
    sentReply: row.sent_reply ? String(row.sent_reply) : null,
    aiReason: row.ai_reason ? String(row.ai_reason) : null,
    topic: row.topic ? String(row.topic) : null,
  };
}

function num(value: unknown): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function mapLead(row: Row): Lead {
  const status = String(row.status);
  return {
    id: String(row.id),
    siteId: String(row.site_id),
    conversationId: row.conversation_id ? String(row.conversation_id) : null,
    name: String(row.name ?? ""),
    email: String(row.email),
    note: String(row.note ?? ""),
    topic: row.topic ? String(row.topic) : null,
    status: status === "contacted" || status === "closed" ? status : "new",
    createdAt: iso(row.created_at),
  };
}
