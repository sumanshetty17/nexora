import { getSql } from "@/lib/db";
import { nid } from "@/lib/utils";
import type { Lead } from "@/lib/types";
import { mapLead } from "./serialize";
import { requireSite } from "./sites.server";

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.length < 180;
}

export async function captureLeadForPublicId(input: {
  publicId: string;
  conversationId: string;
  name: string;
  email: string;
  note?: string;
}): Promise<Lead> {
  const email = input.email.trim().toLowerCase();
  if (!validEmail(email)) throw new Error("Enter a valid email so the team can follow up.");
  const name = input.name.trim().slice(0, 80);
  const note = (input.note ?? "").trim().slice(0, 800);
  if (!input.conversationId) throw new Error("Start a conversation first.");

  const sql = await getSql();
  const sites = await sql<{ id: string }>`
    select id from sites where public_id = ${input.publicId} limit 1
  `;
  const site = sites[0];
  if (!site) throw new Error("This assistant is not available.");

  const conv = await sql<{ id: string; last_topic: string | null }>`
    select id, last_topic from conversations
     where id = ${input.conversationId} and site_id = ${site.id}
     limit 1
  `;
  if (!conv[0]) throw new Error("That conversation was not found.");

  const existing = await sql`select * from leads where conversation_id = ${conv[0].id} limit 1`;
  if (existing[0]) return mapLead(existing[0]);

  const id = nid("lead");
  const topic = conv[0].last_topic;
  const label = name ? `${name} · ${email}` : email;
  await sql`
    insert into leads (id, site_id, conversation_id, name, email, note, topic, status)
    values (${id}, ${site.id}, ${conv[0].id}, ${name}, ${email}, ${note}, ${topic}, ${"new"})
  `;
  await sql`
    update conversations set visitor_label = ${label}, needs_human = true, updated_at = now()
     where id = ${conv[0].id}
  `;
  const rows = await sql`select * from leads where id = ${id} limit 1`;
  return mapLead(rows[0]!);
}

export async function listLeadsForSite(userId: string, siteId: string): Promise<Lead[]> {
  await requireSite(userId, siteId);
  const sql = await getSql();
  const rows = await sql`
    select * from leads where site_id = ${siteId}
     order by created_at desc
     limit 120
  `;
  return rows.map(mapLead);
}

export async function updateLeadForSite(
  userId: string,
  input: { siteId: string; leadId: string; status: Lead["status"] },
): Promise<Lead> {
  await requireSite(userId, input.siteId);
  const status = input.status;
  if (!["new", "contacted", "closed"].includes(status)) throw new Error("Unknown status");
  const sql = await getSql();
  await sql`
    update leads set status = ${status}
     where id = ${input.leadId} and site_id = ${input.siteId}
  `;
  const rows = await sql`select * from leads where id = ${input.leadId} and site_id = ${input.siteId} limit 1`;
  if (!rows[0]) throw new Error("Lead not found");
  return mapLead(rows[0]);
}
