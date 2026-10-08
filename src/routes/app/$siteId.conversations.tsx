import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { exportConversations, getConversationMessages, listConversations, ownerReply } from "@/lib/server/chat";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/$siteId/conversations")({ component: InboxPage });

function InboxPage() {
  const { siteId } = Route.useParams();
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["convos", siteId],
    queryFn: () => listConversations({ data: siteId }),
  });
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "human" | "frustrated">("all");
  const [reply, setReply] = useState("");
  const thread = useQuery({
    queryKey: ["thread", siteId, open],
    queryFn: () => getConversationMessages({ data: { siteId, conversationId: open! } }),
    enabled: Boolean(open),
  });

  const send = useMutation({
    mutationFn: () => ownerReply({ data: { siteId, conversationId: open!, message: reply } }),
    onSuccess: async () => {
      setReply("");
      await qc.invalidateQueries({ queryKey: ["thread", siteId, open] });
      await qc.invalidateQueries({ queryKey: ["convos", siteId] });
      toast.success("Reply sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function downloadCsv() {
    try {
      const { csv } = await exportConversations({ data: siteId });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nexora-conversations.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not export");
    }
  }

  const rows = useMemo(() => {
    const all = list.data ?? [];
    return all.filter((c) => {
      if (filter === "human" && !c.needsHuman) return false;
      if (filter === "frustrated" && c.lastSentiment !== "frustrated") return false;
      if (!q.trim()) return true;
      const hay = `${c.preview ?? ""} ${c.lastTopic ?? ""} ${c.visitorLabel ?? ""}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [list.data, filter, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Inbox</h1>
        <p className="mt-2 text-muted">Every visitor thread from the widget and your playground.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search questions…"
          className="max-w-xs"
        />
        {(["all", "human", "frustrated"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={
              filter === key
                ? "rounded-full bg-primary px-3 py-2 text-xs text-primary-fg"
                : "rounded-full border border-border px-3 py-2 text-xs text-muted"
            }
          >
            {key === "all" ? "All" : key === "human" ? "Needs a human" : "Frustrated"}
          </button>
        ))}
        <Button variant="secondary" size="sm" className="ml-auto" onClick={() => void downloadCsv()}>
          Export CSV
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-2">
          {rows.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpen(c.id)}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-left hover:border-primary/30"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{c.preview || c.visitorLabel || "Conversation"}</p>
                {c.needsHuman ? <Badge tone="danger">human</Badge> : null}
              </div>
              <p className="mt-1 text-xs text-muted">
                {c.lastTopic ?? c.channel} · {formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}
              </p>
            </button>
          ))}
          {rows.length === 0 ? (
            <p className="text-sm text-muted">No conversations match. Use the playground on Overview, or install the widget.</p>
          ) : null}
        </div>
        <div className="min-h-80 rounded-3xl border border-border bg-surface p-5">
          {!open ? (
            <p className="text-sm text-muted">Select a conversation.</p>
          ) : (
            <div className="space-y-3">
              {(thread.data ?? []).map((m) => (
                <div key={m.id} className={m.role === "user" ? "text-ink" : "text-muted"}>
                  <p className="text-[11px] uppercase tracking-wider">{m.role}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                </div>
              ))}
              <form
                className="mt-4 space-y-2 border-t border-border pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  send.mutate();
                }}
              >
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply as the team…"
                />
                <Button type="submit" disabled={send.isPending || !reply.trim()}>
                  {send.isPending ? "Sending…" : "Send reply"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}