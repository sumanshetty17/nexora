import { getSql } from "@/lib/db";
import { nid } from "@/lib/utils";
import type { EmailItem } from "@/lib/types";
import { retrieveChunks } from "./rag";
import { mapEmail } from "./serialize";
import { requireSite } from "./sites.server";
import { speakReply } from "./speak";
import { DEMO_EMAILS } from "./demo-content";

export async function listEmailsForSite(userId: string, siteId: string): Promise<EmailItem[]> {
  await requireSite(userId, siteId);
  const sql = await getSql();
  const rows = await sql`
    select * from emails where site_id = ${siteId} and user_id = ${userId}
    order by received_at desc
    limit 80
  `;
  return rows.map(mapEmail);
}

export async function ingestEmailForSite(
  userId: string,
  data: { siteId: string; fromName: string; fromEmail: string; subject: string; body: string },
): Promise<EmailItem> {
  await requireSite(userId, data.siteId);
  const sql = await getSql();
  const id = nid("em");
  await sql`
    insert into emails (id, site_id, user_id, from_name, from_email, subject, body)
    values (
      ${id}, ${data.siteId}, ${userId},
      ${data.fromName.trim() || "Customer"},
      ${data.fromEmail.trim() || "customer@email.invalid"},
      ${data.subject.trim() || "(no subject)"},
      ${data.body.trim()}
    )
  `;
  return processEmailForSite(userId, { siteId: data.siteId, emailId: id });
}

export async function loadSampleEmailsForSite(userId: string, siteId: string): Promise<EmailItem[]> {
  await requireSite(userId, siteId);
  const sql = await getSql();
  for (const email of DEMO_EMAILS) {
    await sql`
      insert into emails (id, site_id, user_id, from_name, from_email, subject, body)
      values (${nid("em")}, ${siteId}, ${userId}, ${email.fromName}, ${email.fromEmail}, ${email.subject}, ${email.body})
    `;
  }
  const rows = await sql`
    select * from emails where site_id = ${siteId} and user_id = ${userId}
    order by received_at desc
  `;
  return rows.map(mapEmail);
}

export async function processEmailForSite(
  userId: string,
  data: { siteId: string; emailId: string },
): Promise<EmailItem> {
  const site = await requireSite(userId, data.siteId);
  const sql = await getSql();
  const rows = await sql`
    select * from emails where id = ${data.emailId} and site_id = ${data.siteId} and user_id = ${userId} limit 1
  `;
  const email = rows[0];
  if (!email) throw new Error("Email not found");

  const chunks = await retrieveChunks(sql, data.siteId, `${String(email.subject)} ${String(email.body)}`, 6);
  const escalate = /chargeback|lawyer|sue|lawsuit|harass|press inquiry|refund everything|dispute|safety/i.test(
    `${email.subject} ${email.body}`,
  );
  const firstName = String(email.from_name).split(" ")[0] || "there";
  const answer = speakReply(`${email.subject}. ${email.body}`, chunks);
  const draft = escalate
    ? `Hi ${firstName},\n\nThanks for writing. A person on our team will reply to this directly.\n\n— ${site.name}`
    : `Hi ${firstName},\n\n${answer}\n\n— ${site.name}`;
  const status = escalate ? "escalated" : "drafted";
  const reason = escalate
    ? "This looks like it needs a person — legal, money, or safety."
    : "Answered from the pages already read.";
  const topic = String(email.subject).trim().slice(0, 48) || null;

  await sql`
    update emails set
      severity = ${escalate ? "urgent" : "routine"},
      status = ${status},
      draft_reply = ${draft},
      ai_reason = ${reason},
      topic = ${topic}
    where id = ${data.emailId} and user_id = ${userId}
  `;
  await sql`
    insert into usage_events (id, user_id, site_id, kind)
    values (${nid("use")}, ${userId}, ${data.siteId}, ${"email_reply"})
  `;
  const updated = await sql`select * from emails where id = ${data.emailId} limit 1`;
  return mapEmail(updated[0]!);
}

export async function processInboxForSite(
  userId: string,
  siteId: string,
): Promise<{ processed: number; escalated: number }> {
  await requireSite(userId, siteId);
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    select id from emails
     where site_id = ${siteId} and user_id = ${userId} and status = 'new'
     order by received_at asc
     limit 6
  `;
  let processed = 0;
  let escalated = 0;
  for (const row of rows) {
    const item = await processEmailForSite(userId, { siteId, emailId: row.id });
    processed += 1;
    if (item.status === "escalated" || item.severity === "urgent") escalated += 1;
  }
  return { processed, escalated };
}

export async function sendEmailReplyForSite(
  userId: string,
  data: { siteId: string; emailId: string; body: string },
): Promise<EmailItem> {
  await requireSite(userId, data.siteId);
  const sql = await getSql();
  const body = data.body.trim();
  if (!body) throw new Error("Write a reply first.");
  await sql`
    update emails set status = ${"sent"}, sent_reply = ${body}, draft_reply = ${body}
    where id = ${data.emailId} and site_id = ${data.siteId} and user_id = ${userId}
  `;
  const updated = await sql`select * from emails where id = ${data.emailId} limit 1`;
  if (!updated[0]) throw new Error("Email not found");
  return mapEmail(updated[0]);
}

export async function escalateEmailForSite(
  userId: string,
  data: { siteId: string; emailId: string },
): Promise<EmailItem> {
  await requireSite(userId, data.siteId);
  const sql = await getSql();
  await sql`
    update emails set status = ${"escalated"}, severity = ${"urgent"}
    where id = ${data.emailId} and site_id = ${data.siteId} and user_id = ${userId}
  `;
  const updated = await sql`select * from emails where id = ${data.emailId} limit 1`;
  if (!updated[0]) throw new Error("Email not found");
  return mapEmail(updated[0]);
}
