-- Nexora core schema: sites, knowledge, conversations, insights, email assistant.

create table if not exists sites (
  id text primary key,
  user_id text not null,
  public_id text not null unique,
  name text not null,
  website_url text,
  industry text,
  description text not null default '',
  tone text not null default 'warm, concise, professional',
  system_brief text not null default '',
  welcome_message text not null default 'Hi — how can I help today?',
  brand_color text not null default '#21564A',
  allowed_origins text not null default '*',
  email_assistant_enabled boolean not null default true,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sites_user_id_idx on sites (user_id);
create index if not exists sites_public_id_idx on sites (public_id);

create table if not exists knowledge_docs (
  id text primary key,
  site_id text not null,
  user_id text not null,
  kind text not null,
  title text not null,
  source_url text,
  content text not null,
  char_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists knowledge_docs_site_idx on knowledge_docs (site_id);

create table if not exists knowledge_chunks (
  id text primary key,
  site_id text not null,
  doc_id text not null,
  ordinal integer not null default 0,
  content text not null,
  tsv tsvector
);
create index if not exists knowledge_chunks_site_idx on knowledge_chunks (site_id);
create index if not exists knowledge_chunks_doc_idx on knowledge_chunks (doc_id);
create index if not exists knowledge_chunks_tsv_idx on knowledge_chunks using gin (tsv);

create table if not exists conversations (
  id text primary key,
  site_id text not null,
  channel text not null default 'widget',
  visitor_label text,
  message_count integer not null default 0,
  last_topic text,
  last_sentiment text,
  needs_human boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversations_site_idx on conversations (site_id, updated_at desc);

create table if not exists messages (
  id text primary key,
  conversation_id text not null,
  site_id text not null,
  role text not null,
  content text not null,
  topic text,
  intent text,
  sentiment text,
  resolved boolean,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on messages (conversation_id, created_at);
create index if not exists messages_site_idx on messages (site_id, created_at desc);

create table if not exists topic_stats (
  site_id text not null,
  topic text not null,
  hit_count integer not null default 0,
  frustrated_count integer not null default 0,
  unresolved_count integer not null default 0,
  last_seen_at timestamptz not null default now(),
  primary key (site_id, topic)
);

create table if not exists emails (
  id text primary key,
  site_id text not null,
  user_id text not null,
  from_name text not null,
  from_email text not null,
  subject text not null,
  body text not null,
  received_at timestamptz not null default now(),
  severity text not null default 'routine',
  status text not null default 'new',
  draft_reply text,
  sent_reply text,
  ai_reason text,
  topic text
);
create index if not exists emails_site_idx on emails (site_id, received_at desc);

create table if not exists usage_events (
  id text primary key,
  user_id text not null,
  site_id text not null,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists usage_events_user_idx on usage_events (user_id, created_at desc);
