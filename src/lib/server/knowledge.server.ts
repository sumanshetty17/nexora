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

export async function generateFaqsForSite(
  userId: string,
  siteId: string,
): Promise<{ added: number; titles: string[] }> {
  await requireSite(userId, siteId);
  const sql = await getSql();
  const docs = await sql<{ title: string; content: string }>`
    select title, content from knowledge_docs
     where site_id = ${siteId} and user_id = ${userId}
     order by created_at desc
     limit 8
  `;
  if (docs.length === 0) throw new Error("Add a website or notes first so FAQs have something to draw from.");

  const { grokChat, parseModelJson } = await import("./ai");
  const corpus = docs
    .map((d) => `## ${d.title}\n${d.content.slice(0, 2200)}`)
    .join("\n\n")
    .slice(0, 12_000);

  const result = await grokChat({
    maxTokens: 700,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          'Extract customer FAQs from the source. Return JSON only: {"faqs":[{"q":string,"a":string}]}. 5-8 items. Answers must use only facts in the source. Short, specific, no marketing.',
      },
      { role: "user", content: corpus },
    ],
  });

  const parsed = result.ok ? parseModelJson<{ faqs?: { q?: string; a?: string }[] }>(result.text) : null;
  const faqs = (parsed?.faqs ?? []).filter((f) => f.q && f.a);
  if (faqs.length === 0) {
    throw new Error(
      result.ok
        ? "Could not extract FAQs from that material. Try adding a policy page first."
        : "AI is not available here — paste FAQs as notes instead.",
    );
  }

  const titles: string[] = [];
  for (const faq of faqs.slice(0, 8)) {
    const title = faq.q!.trim();
    const content = `Q: ${title}\nA: ${faq.a!.trim()}`;
    const id = nid("doc");
    await sql`
      insert into knowledge_docs (id, site_id, user_id, kind, title, content, char_count)
      values (${id}, ${siteId}, ${userId}, ${"faq"}, ${title}, ${content}, ${content.length})
    `;
    await indexDocument(sql, { siteId, docId: id, content });
    titles.push(title);
  }
  await sql`update sites set updated_at = now() where id = ${siteId} and user_id = ${userId}`;
  return { added: titles.length, titles };
}
