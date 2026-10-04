import type { Sql } from "@/lib/db";
import { nid } from "@/lib/utils";

const STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "been",
  "could",
  "does",
  "from",
  "have",
  "into",
  "just",
  "like",
  "more",
  "only",
  "over",
  "some",
  "than",
  "that",
  "them",
  "then",
  "this",
  "what",
  "when",
  "where",
  "which",
  "will",
  "with",
  "would",
  "your",
  "please",
  "there",
  "their",
  "they",
  "here",
  "how",
  "the",
  "and",
  "for",
  "are",
  "can",
  "you",
]);

export function queryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
    .slice(0, 8);
}

export function chunkText(text: string, size = 900, overlap = 120): string[] {
  const clean = text.replaceAll("\r", "").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    let end = Math.min(i + size, clean.length);
    if (end < clean.length) {
      const slice = clean.slice(i, end);
      const lastStop = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf(". "));
      if (lastStop > size * 0.4) end = i + lastStop + (slice[lastStop] === "." ? 1 : 0);
    }
    const piece = clean.slice(i, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    i = Math.max(end - overlap, i + 1);
  }
  return chunks;
}

export async function indexDocument(
  sql: Sql,
  input: { siteId: string; docId: string; content: string },
): Promise<number> {
  await sql`delete from knowledge_chunks where doc_id = ${input.docId}`;
  const chunks = chunkText(input.content);
  let n = 0;
  for (const content of chunks) {
    const id = nid("chk");
    await sql.query(
      `insert into knowledge_chunks (id, site_id, doc_id, ordinal, content, tsv)
       values ($1, $2, $3, $4, $5, to_tsvector('english', $5))`,
      [id, input.siteId, input.docId, n, content],
    );
    n += 1;
  }
  return n;
}

export type RetrievedChunk = {
  content: string;
  title: string;
  sourceUrl: string | null;
};

export async function retrieveChunks(
  sql: Sql,
  siteId: string,
  query: string,
  limit = 6,
): Promise<RetrievedChunk[]> {
  const q = query.trim();
  if (!q) return [];

  const terms = queryTerms(q);
  const orQuery = terms.join(" | ") || q;

  let fts: Array<RetrievedChunk & { rank: number }> = [];
  try {
    fts = await sql.query<RetrievedChunk & { rank: number }>(
      `select c.content, d.title, d.source_url as "sourceUrl",
              ts_rank_cd(c.tsv, to_tsquery('english', $2)) as rank
         from knowledge_chunks c
         join knowledge_docs d on d.id = c.doc_id
        where c.site_id = $1
          and c.tsv @@ to_tsquery('english', $2)
        order by rank desc
        limit $3`,
      [siteId, sanitizeTsQuery(orQuery), limit],
    );
  } catch {
    try {
      fts = await sql.query<RetrievedChunk & { rank: number }>(
        `select c.content, d.title, d.source_url as "sourceUrl",
                ts_rank_cd(c.tsv, plainto_tsquery('english', $2)) as rank
           from knowledge_chunks c
           join knowledge_docs d on d.id = c.doc_id
          where c.site_id = $1
            and c.tsv @@ plainto_tsquery('english', $2)
          order by rank desc
          limit $3`,
        [siteId, terms.join(" ") || q, limit],
      );
    } catch {
      fts = [];
    }
  }

  if (fts.length >= 1) {
    return fts.map(({ content, title, sourceUrl }) => ({ content, title, sourceUrl }));
  }

  if (terms.length === 0) {
    const fallback = await sql.query<RetrievedChunk>(
      `select c.content, d.title, d.source_url as "sourceUrl"
         from knowledge_chunks c
         join knowledge_docs d on d.id = c.doc_id
        where c.site_id = $1
        order by c.ordinal
        limit $2`,
      [siteId, limit],
    );
    return fallback;
  }

  const clauses = terms.map((_, i) => `lower(c.content) like $${i + 2}`).join(" or ");
  const params: unknown[] = [siteId, ...terms.map((t) => `%${t}%`), limit];
  const rows = await sql.query<RetrievedChunk>(
    `select c.content, d.title, d.source_url as "sourceUrl"
       from knowledge_chunks c
       join knowledge_docs d on d.id = c.doc_id
      where c.site_id = $1
        and (${clauses})
      order by length(c.content) asc
      limit $${terms.length + 2}`,
    params,
  );
  return rows;
}

function sanitizeTsQuery(raw: string): string {
  const parts = raw
    .split("|")
    .map((p) => p.trim().replace(/[^a-z0-9]+/gi, ""))
    .filter((p) => p.length > 1);
  if (!parts.length) return "assistant";
  return parts.map((p) => `${p}:*`).join(" | ");
}
