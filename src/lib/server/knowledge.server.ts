import { getSql } from "@/lib/db";
import { nid } from "@/lib/utils";
import type { KnowledgeDoc } from "@/lib/types";
import { mapDoc } from "./serialize";
import { crawlSite, isSafeHttpUrl, readSiteRound } from "./crawl";
import { indexDocument, retrieveChunks } from "./rag";
import { researchPublicWeb } from "./research";
import { requireSite } from "./sites.server";

export async function listDocsForSite(userId: string, siteId: string): Promise<KnowledgeDoc[]> {
  await requireSite(userId, siteId);
  const sql = await getSql();
  const rows = await sql`
    select * from knowledge_docs
    where site_id = ${siteId} and user_id = ${userId} and kind <> ${"background"}
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
  const origin = isSafeHttpUrl(data.url);
  const [pages, research] = await Promise.all([
    crawlSite(data.url),
    origin
      ? researchPublicWeb(origin, origin.hostname.replace(/^www\./, "")).catch(() => [])
      : Promise.resolve([]),
  ]);
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
  for (const note of research) {
    const id = nid("doc");
    await sql`
      insert into knowledge_docs (id, site_id, user_id, kind, title, source_url, content, char_count)
      values (${id}, ${data.siteId}, ${userId}, ${"background"}, ${note.title}, ${null}, ${note.content}, ${note.content.length})
    `;
    await indexDocument(sql, { siteId: data.siteId, docId: id, content: note.content });
  }
  await sql`
    update sites set website_url = ${data.url}, updated_at = now()
    where id = ${data.siteId} and user_id = ${userId}
  `;
  return { imported: pages.length, titles };
}

export async function ingestWebsiteRoundForSite(
  userId: string,
  data: { siteId: string; url: string; queue?: string[]; visited?: string[]; seeded?: boolean; cookie?: string },
): Promise<{
  imported: number;
  titles: string[];
  queue: string[];
  visited: string[];
  seeded: boolean;
  done: boolean;
  capped: boolean;
}> {
  await requireSite(userId, data.siteId);
  const first = !data.visited?.length;
  const origin = isSafeHttpUrl(data.url);
  const [round, research] = await Promise.all([
    readSiteRound(data),
    first && origin
      ? researchPublicWeb(origin, origin.hostname.replace(/^www\./, "")).catch(() => [])
      : Promise.resolve([]),
  ]);
  const sql = await getSql();
  const titles: string[] = [];
  const docs = [...round.pages, ...research];
  for (const page of docs) {
    const id = nid("doc");
    const kind = page.title === "Company facts" ? "background" : "url";
    await sql`
      insert into knowledge_docs (id, site_id, user_id, kind, title, source_url, content, char_count)
      values (
        ${id},
        ${data.siteId},
        ${userId},
        ${kind},
        ${page.title},
        ${kind === "background" ? null : page.url},
        ${page.content},
        ${page.content.length}
      )
    `;
    await indexDocument(sql, { siteId: data.siteId, docId: id, content: page.content });
    if (kind !== "background") titles.push(page.title);
  }
  await sql`
    update sites set website_url = ${data.url}, updated_at = now()
    where id = ${data.siteId} and user_id = ${userId}
  `;
  return {
    imported: titles.length,
    titles,
    queue: round.queue,
    visited: round.visited,
    seeded: round.seeded,
    done: round.done,
    capped: round.capped,
  };
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

  const faqs: { q: string; a: string }[] = [];
  for (const doc of docs) {
    const text = doc.content.replace(/\s+/g, " ").trim();
    const questions = text.match(/[A-Z][^?]{12,140}\?/g) ?? [];
    for (const question of questions) {
      const at = text.indexOf(question);
      const answer = text
        .slice(at + question.length)
        .trim()
        .split(/(?<=[.!])\s+/)[0];
      if (answer && answer.length > 40) faqs.push({ q: question.trim(), a: answer.trim() });
    }
    if (questions.length === 0) {
      const sentence = text.split(/(?<=[.!?])\s+/).find((part) => part.length > 50);
      if (sentence) faqs.push({ q: `What should I know about ${doc.title}?`, a: sentence.trim() });
    }
  }
  const unique = faqs.filter((faq, index) => faqs.findIndex((other) => other.q === faq.q) === index).slice(0, 8);
  if (unique.length === 0) throw new Error("Could not find questions in those pages. Paste a policy note first.");

  const titles: string[] = [];
  for (const faq of unique) {
    const title = faq.q.trim();
    const content = `Q: ${title}\nA: ${faq.a.trim()}`;
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

export async function searchDocsForSite(
  userId: string,
  input: { siteId: string; query: string },
): Promise<{ title: string; excerpt: string; sourceUrl: string | null }[]> {
  await requireSite(userId, input.siteId);
  const sql = await getSql();
  const chunks = await retrieveChunks(sql, input.siteId, input.query, 6);
  return chunks.map((c) => ({
    title: c.title,
    excerpt: c.content.slice(0, 280),
    sourceUrl: c.sourceUrl,
  }));
}
