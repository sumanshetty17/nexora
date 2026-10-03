import { getSql } from "@/lib/db";
import { nid } from "@/lib/utils";
import type { KnowledgeDoc } from "@/lib/types";
import { mapDoc } from "./serialize";
import { crawlSite } from "./crawl";
import { indexDocument } from "./rag";
import { requireSite } from "./sites.server";

export async function listDocsForSite(userId: string, siteId: string): Promise<KnowledgeDoc[]> {
  await requireSite(userId, siteId);
  const sql = await getSql();
  const rows = await sql`
    select * from knowledge_docs where site_id = ${siteId} and user_id = ${userId}
    order by created_at desc
  `;
  return rows.map(mapDoc);
}

export async function addKnowledgeForSite(
  userId: string,
  data: {
    siteId: string;
    kind: "url" | "file" | "faq" | "profile" | "note";
    title: string;
    content: string;
    sourceUrl?: string;
  },
): Promise<KnowledgeDoc> {
  await requireSite(userId, data.siteId);
  const content = data.content.trim();
  if (content.length < 12) throw new Error("Add a bit more detail so the assistant can learn it.");
  if (content.length > 80_000) throw new Error("That document is too large. Split it under 80k characters.");
  const title = data.title.trim() || "Untitled source";
  const sql = await getSql();
  const id = nid("doc");
  await sql`
    insert into knowledge_docs (id, site_id, user_id, kind, title, source_url, content, char_count)
    values (${id}, ${data.siteId}, ${userId}, ${data.kind}, ${title}, ${data.sourceUrl ?? null}, ${content}, ${content.length})
  `;
  await indexDocument(sql, { siteId: data.siteId, docId: id, content });
  await sql`update sites set updated_at = now() where id = ${data.siteId} and user_id = ${userId}`;
  const rows = await sql`select * from knowledge_docs where id = ${id} limit 1`;
  return mapDoc(rows[0]!);
}

export async function ingestWebsiteForSite(
  userId: string,
  data: { siteId: string; url: string },
): Promise<{ imported: number; titles: string[] }> {
  await requireSite(userId, data.siteId);
  const pages = await crawlSite(data.url);
  if (pages.length === 0) throw new Error("Could not read that site. Try pasting key pages as text.");
  const sql = await getSql();
  const titles: string[] = [];
  for (const page of pages) {
    const id = nid("doc");
    await sql`
      insert into knowledge_docs (id, site_id, user_id, kind, title, source_url, content, char_count)
      values (${id}, ${data.siteId}, ${userId}, ${"url"}, ${page.title}, ${page.url}, ${page.content}, ${page.content.length})
    `;
    await indexDocument(sql, { siteId: data.siteId, docId: id, content: page.content });
    titles.push(page.title);
  }
  await sql`
    update sites set website_url = ${data.url}, updated_at = now()
    where id = ${data.siteId} and user_id = ${userId}
  `;
  return { imported: pages.length, titles };
}

export async function deleteDocForSite(userId: string, data: { siteId: string; docId: string }) {
  await requireSite(userId, data.siteId);
  const sql = await getSql();
  await sql`delete from knowledge_chunks where doc_id = ${data.docId} and site_id = ${data.siteId}`;
  await sql`
    delete from knowledge_docs
    where id = ${data.docId} and site_id = ${data.siteId} and user_id = ${userId}
  `;
  return { ok: true as const };
}
