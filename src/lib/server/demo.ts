import { getSql } from "@/lib/db";
import { nid } from "@/lib/utils";
import {
  DEMO_BRIEF,
  DEMO_DOCS,
  DEMO_EMAILS,
  DEMO_NAME,
  DEMO_PUBLIC_ID,
  DEMO_SITE_ID,
  DEMO_USER_ID,
  SAMPLE_TRAFFIC,
} from "./demo-content";
import { indexDocument } from "./rag";

const globalRef = globalThis as typeof globalThis & {
  __nexoraDemoSeed__?: Promise<void>;
};

export async function ensureDemoSite(): Promise<void> {
  globalRef.__nexoraDemoSeed__ ??= (async () => {
    const sql = await getSql();
    const existing = await sql<{ id: string }>`
      select id from sites where id = ${DEMO_SITE_ID} limit 1
    `;
    if (existing.length === 0) {
      await sql`
        insert into sites (
          id, user_id, public_id, name, website_url, industry, description, tone,
          system_brief, welcome_message, brand_color, status, email_assistant_enabled
        ) values (
          ${DEMO_SITE_ID}, ${DEMO_USER_ID}, ${DEMO_PUBLIC_ID}, ${DEMO_NAME},
          ${"https://harborandoak.example"}, ${"furniture"},
          ${"Solid-wood furniture studio in Portland, Oregon."},
          ${"warm, specific, never salesy"},
          ${DEMO_BRIEF},
          ${"Welcome to Harbor & Oak — looking for a table, a finish, or a ship date?"},
          ${"#21564A"}, ${"live"}, ${true}
        )
      `;
    }

    for (const doc of DEMO_DOCS) {
      const has = await sql<{ id: string }>`select id from knowledge_docs where id = ${doc.id} limit 1`;
      if (has.length) continue;
      await sql`
        insert into knowledge_docs (id, site_id, user_id, kind, title, content, char_count)
        values (${doc.id}, ${DEMO_SITE_ID}, ${DEMO_USER_ID}, ${doc.kind}, ${doc.title}, ${doc.content}, ${doc.content.length})
      `;
      await indexDocument(sql, { siteId: DEMO_SITE_ID, docId: doc.id, content: doc.content });
    }

    const emailCount = await sql<{ n: number }>`
      select count(*)::int as n from emails where site_id = ${DEMO_SITE_ID}
    `;
    if ((emailCount[0]?.n ?? 0) === 0) {
      for (const email of DEMO_EMAILS) {
        await sql`
          insert into emails (id, site_id, user_id, from_name, from_email, subject, body)
          values (${nid("em")}, ${DEMO_SITE_ID}, ${DEMO_USER_ID}, ${email.fromName}, ${email.fromEmail}, ${email.subject}, ${email.body})
        `;
      }
    }

    const convoCount = await sql<{ n: number }>`
      select count(*)::int as n from conversations where site_id = ${DEMO_SITE_ID}
    `;
    if ((convoCount[0]?.n ?? 0) === 0) {
      await insertSampleTraffic(DEMO_SITE_ID);
    }
  })().catch((err) => {
    globalRef.__nexoraDemoSeed__ = undefined;
    throw err;
  });
  await globalRef.__nexoraDemoSeed__;
}

export async function insertSampleTraffic(siteId: string): Promise<number> {
  const sql = await getSql();
  let n = 0;
  for (const row of SAMPLE_TRAFFIC) {
    const cid = nid("cv");
    const daysAgo = 2 + n;
    await sql.query(
      `insert into conversations (
         id, site_id, channel, visitor_label, message_count, last_topic, last_sentiment, needs_human, created_at, updated_at
       ) values ($1,$2,'widget',$3,2,$4,$5,$6, now() - ($7 || ' days')::interval, now() - ($7 || ' days')::interval)`,
      [cid, siteId, row.visitor, row.topic, row.sentiment, row.needsHuman, String(daysAgo)],
    );
    const qid = nid("msg");
    const aid = nid("msg");
    await sql.query(
      `insert into messages (id, conversation_id, site_id, role, content, topic, intent, sentiment, resolved, created_at)
       values ($1,$2,$3,'user',$4,$5,'question',$6,$7, now() - ($8 || ' days')::interval)`,
      [qid, cid, siteId, row.question, row.topic, row.sentiment, row.resolved, String(daysAgo)],
    );
    await sql.query(
      `insert into messages (id, conversation_id, site_id, role, content, topic, intent, sentiment, resolved, created_at)
       values ($1,$2,$3,'assistant',$4,$5,'answer',$6,$7, now() - ($8 || ' days')::interval + interval '40 seconds')`,
      [aid, cid, siteId, row.answer, row.topic, row.sentiment, row.resolved, String(daysAgo)],
    );
    await sql.query(
      `insert into topic_stats (site_id, topic, hit_count, frustrated_count, unresolved_count, last_seen_at)
       values ($1,$2,1,$3,$4, now() - ($5 || ' days')::interval)
       on conflict (site_id, topic) do update set
         hit_count = topic_stats.hit_count + 1,
         frustrated_count = topic_stats.frustrated_count + excluded.frustrated_count,
         unresolved_count = topic_stats.unresolved_count + excluded.unresolved_count,
         last_seen_at = excluded.last_seen_at`,
      [
        siteId,
        row.topic,
        row.sentiment === "frustrated" ? 1 : 0,
        row.resolved ? 0 : 1,
        String(daysAgo),
      ],
    );
    n += 1;
  }
  return n;
}
