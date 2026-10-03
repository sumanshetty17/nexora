import { getSql } from "@/lib/db";
import { nid } from "@/lib/utils";
import type { EmailItem } from "@/lib/types";
import { grokChat, hasXaiKey, parseModelJson } from "./ai";
import { retrieveChunks } from "./rag";
import { mapEmail } from "./serialize";
import { requireSite } from "./sites.server";
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
  const contextBlock = chunks.map((c) => `${c.title}: ${c.content.slice(0, 900)}`).join("\n\n");

  type Out = {
    severity?: "routine" | "sensitive" | "urgent";
    status?: "drafted" | "escalated";
    draft?: string;
    reason?: string;
    topic?: string;
  };

  let out: Out = {};
  if (hasXaiKey()) {
    const result = await grokChat({
      maxTokens: 700,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You are the email assistant for ${site.name}.
${site.systemBrief || site.description}
Write as a careful human on the team. JSON only:
{"severity":"routine"|"sensitive"|"urgent","status":"drafted"|"escalated","draft":string,"reason":string,"topic":string}
Escalate (status=escalated, severity=urgent) for: legal threats, chargebacks, harassment, safety, large refunds on custom work, press, or anything you cannot answer from knowledge.
Otherwise draft a complete sendable reply. No placeholders like [Name] if the sender name is known.`,
        },
        {
          role: "user",
          content: `From: ${email.from_name} <${email.from_email}>\nSubject: ${email.subject}\n\n${email.body}\n\nKnowledge:\n${contextBlock || "(none)"}`,
        },
      ],
    });
    if (result.ok) out = parseModelJson<Out>(result.text) ?? {};
  }

  const severity = out.severity === "urgent" || out.severity === "sensitive" ? out.severity : "routine";
  const escalate =
    out.status === "escalated" ||
    severity === "urgent" ||
    /chargeback|lawyer|sue|refund everything|dispute/i.test(`${email.subject} ${email.body}`);
  const firstName = String(email.from_name).split(" ")[0] || "there";
  const draft =
    out.draft?.trim() ||
    `Hi ${firstName},\n\nThanks for writing — a teammate will follow up shortly.\n\n— ${site.name}`;
  const status = escalate ? "escalated" : "drafted";
  const reason =
    out.reason?.trim() ||
    (escalate ? "This looks like it needs a person — legal, money, or tone." : "Routine customer question.");
  const topic = out.topic?.trim() || null;

  await sql`
    update emails set
      severity = ${escalate ? "urgent" : severity},
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
