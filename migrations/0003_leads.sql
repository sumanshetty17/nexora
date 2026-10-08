-- Visitor leads captured when the assistant cannot resolve a question.

create table if not exists leads (
  id text primary key,
  site_id text not null,
  conversation_id text,
  name text not null default '',
  email text not null,
  note text not null default '',
  topic text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
create index if not exists leads_site_idx on leads (site_id, created_at desc);
create index if not exists leads_conversation_idx on leads (conversation_id);
