export type SiteStatus = "draft" | "live";

export type Site = {
  id: string;
  userId: string;
  publicId: string;
  name: string;
  websiteUrl: string | null;
  industry: string | null;
  description: string;
  tone: string;
  systemBrief: string;
  welcomeMessage: string;
  brandColor: string;
  allowedOrigins: string;
  emailAssistantEnabled: boolean;
  status: SiteStatus;
  createdAt: string;
  updatedAt: string;
  docCount?: number;
  charCount?: number;
  conversationCount?: number;
};

export type KnowledgeDoc = {
  id: string;
  siteId: string;
  kind: "url" | "file" | "faq" | "profile" | "note";
  title: string;
  sourceUrl: string | null;
  content: string;
  charCount: number;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  topic?: string | null;
  sentiment?: string | null;
  createdAt: string;
};

export type Conversation = {
  id: string;
  siteId: string;
  channel: string;
  visitorLabel: string | null;
  messageCount: number;
  lastTopic: string | null;
  lastSentiment: string | null;
  needsHuman: boolean;
  createdAt: string;
  updatedAt: string;
  preview?: string | null;
};

export type TopicStat = {
  topic: string;
  hitCount: number;
  frustratedCount: number;
  unresolvedCount: number;
  lastSeenAt: string;
};

export type EmailItem = {
  id: string;
  siteId: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
  receivedAt: string;
  severity: "routine" | "sensitive" | "urgent";
  status: "new" | "drafted" | "sent" | "escalated";
  draftReply: string | null;
  sentReply: string | null;
  aiReason: string | null;
  topic: string | null;
};

export type UsageSummary = {
  conversations30d: number;
  emails30d: number;
  sites: number;
  knowledgeChars: number;
};

export type WidgetConfig = {
  publicId: string;
  name: string;
  welcomeMessage: string;
  brandColor: string;
  status: SiteStatus;
  suggestions: string[];
};

export type InsightBundle = {
  topics: TopicStat[];
  sentiment: { label: string; count: number }[];
  unresolved: { id: string; content: string; topic: string | null; createdAt: string }[];
  totalConversations: number;
  needsHuman: number;
  recommendation: string | null;
};

export type ChatTurnResult = {
  conversationId: string;
  reply: string;
  topic: string | null;
  sentiment: string | null;
  needsHuman: boolean;
  sources: { title: string; excerpt: string }[];
};
