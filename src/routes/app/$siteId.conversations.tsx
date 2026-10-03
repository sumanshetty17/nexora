import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getConversationMessages, listConversations } from "@/lib/server/chat";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/$siteId/conversations")({ component: InboxPage });

function InboxPage() {
  const { siteId } = Route.useParams();
  const list = useQuery({
    queryKey: ["convos", siteId],
    queryFn: () => listConversations({ data: siteId }),
  });
  const [open, setOpen] = useState<string | null>(null);
  const thread = useQuery({
    queryKey: ["thread", siteId, open],
    queryFn: () => getConversationMessages({ data: { siteId, conversationId: open! } }),
    enabled: Boolean(open),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Inbox</h1>
        <p className="mt-2 text-muted">Every visitor thread from the widget and your playground.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-2">
          {(list.data ?? []).map((c) => (
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
          {list.data?.length === 0 ? (
            <p className="text-sm text-muted">No conversations yet. Use the playground on Overview, or install the widget.</p>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
