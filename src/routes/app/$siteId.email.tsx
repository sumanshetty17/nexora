import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  escalateEmail,
  ingestEmail,
  listEmails,
  loadSampleEmails,
  processEmail,
  sendEmailReply,
} from "@/lib/server/email";
import { formatDistanceToNow } from "date-fns";
import type { EmailItem } from "@/lib/types";

export const Route = createFileRoute("/app/$siteId/email")({ component: EmailPage });

function severityTone(s: EmailItem["severity"]) {
  if (s === "urgent") return "danger" as const;
  if (s === "sensitive") return "warn" as const;
  return "ok" as const;
}

function EmailPage() {
  const { siteId } = Route.useParams();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["emails", siteId], queryFn: () => listEmails({ data: siteId }) });
  const [openId, setOpenId] = useState<string | null>(null);
  const open = list.data?.find((e) => e.id === openId) ?? list.data?.[0] ?? null;
  const [draft, setDraft] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["emails", siteId] });
  };

  const ingest = useMutation({
    mutationFn: () =>
      ingestEmail({
        data: { siteId, fromName, fromEmail, subject, body },
      }),
    onSuccess: async (row) => {
      setBody("");
      setSubject("");
      await refresh();
      setOpenId(row.id);
      setDraft(row.draftReply ?? "");
      toast.success(row.status === "escalated" ? "Escalated to you" : "Draft ready");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const samples = useMutation({
    mutationFn: () => loadSampleEmails({ data: siteId }),
    onSuccess: async () => {
      await refresh();
      toast.success("Sample inbox loaded");
    },
  });

  const process = useMutation({
    mutationFn: (emailId: string) => processEmail({ data: { siteId, emailId } }),
    onSuccess: async (row) => {
      await refresh();
      setDraft(row.draftReply ?? "");
      setOpenId(row.id);
      toast.success(row.status === "escalated" ? "Escalated to you" : "Draft ready");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const send = useMutation({
    mutationFn: () => sendEmailReply({ data: { siteId, emailId: open!.id, body: draft || open!.draftReply || "" } }),
    onSuccess: async () => {
      await refresh();
      toast.success("Marked sent (delivery wiring comes with billing)");
    },
  });

  const escalate = useMutation({
    mutationFn: () => escalateEmail({ data: { siteId, emailId: open!.id } }),
    onSuccess: refresh,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Email assistant</h1>
          <p className="mt-2 max-w-xl text-muted">
            Paste mail from customers. Routine messages get a human-sounding draft.
            Anything serious is held for you.
          </p>
        </div>
        <Button variant="secondary" onClick={() => samples.mutate()} disabled={samples.isPending}>
          Load sample inbox
        </Button>
      </div>

      <Card>
        <h2 className="font-display text-xl tracking-tight">Add an email</h2>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            ingest.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>From name</Label>
            <Input value={fromName} onChange={(e) => setFromName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>From email</Label>
            <Input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} required />
          </div>
          <Button type="submit" disabled={ingest.isPending}>
            Add to inbox
          </Button>
        </form>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-2">
          {(list.data ?? []).map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                setOpenId(e.id);
                setDraft(e.draftReply ?? "");
              }}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-medium">{e.subject}</p>
                <Badge tone={severityTone(e.severity)}>{e.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">
                {e.fromName} · {formatDistanceToNow(new Date(e.receivedAt), { addSuffix: true })}
              </p>
            </button>
          ))}
        </div>
        {open ? (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{open.subject}</p>
                <p className="text-sm text-muted">
                  {`${open.fromName} (${open.fromEmail})`}
                </p>
              </div>
              <Badge tone={severityTone(open.severity)}>{open.severity}</Badge>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{open.body}</p>
            {open.aiReason ? <p className="mt-3 text-sm text-muted">{open.aiReason}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => process.mutate(open.id)} disabled={process.isPending}>
                {process.isPending ? "Reading…" : "Draft with Nexora"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => escalate.mutate()}>
                Escalate
              </Button>
            </div>
            <Label className="mt-5 block">Reply</Label>
            <Textarea
              className="mt-2 min-h-40"
              value={draft || open.draftReply || ""}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button className="mt-3" onClick={() => send.mutate()} disabled={send.isPending || open.status === "sent"}>
              {open.status === "sent" ? "Sent" : "Mark as sent"}
            </Button>
          </Card>
        ) : (
          <p className="text-sm text-muted">Inbox is empty.</p>
        )}
      </div>
    </div>
  );
}
