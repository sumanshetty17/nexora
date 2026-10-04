import { useMemo, useRef, useState } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatTurnResult } from "@/lib/types";

type Bubble = { id: string; role: "user" | "assistant"; content: string };

export function ChatPanel({
  name,
  welcome,
  brandColor,
  compact = false,
  suggestions,
  onSend,
}: {
  name: string;
  welcome: string;
  brandColor?: string;
  compact?: boolean;
  suggestions?: string[];
  onSend: (message: string, conversationId?: string) => Promise<ChatTurnResult>;
}) {
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const accent = brandColor || "#21564A";

  const empty = messages.length === 0;
  const chips = useMemo(
    () =>
      suggestions && suggestions.length > 0
        ? suggestions.slice(0, 4)
        : ["What are your hours?", "How does shipping work?", "What is the return policy?"],
    [suggestions],
  );

  async function send(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    setError(null);
    setDraft("");
    const userId = `u_${Date.now()}`;
    setMessages((m) => [...m, { id: userId, role: "user", content: message }]);
    setPending(true);
    try {
      const result = await onSend(message, conversationId);
      setConversationId(result.conversationId);
      setMessages((m) => [
        ...m,
        { id: `a_${Date.now()}`, role: "assistant", content: result.reply },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that.");
    } finally {
      setPending(false);
      queueMicrotask(() => bottom.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-surface",
        compact ? "rounded-none" : "rounded-3xl border border-border",
      )}
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="grid size-8 place-items-center rounded-full text-xs font-semibold text-primary-fg" style={{ background: accent }}>
          {name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted">Usually replies instantly</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {empty ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-ink">{welcome}</p>
            <div className="flex flex-wrap gap-2">
              {chips.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-bg px-3 py-1.5 text-left text-xs text-ink hover:border-primary/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                m.role === "user"
                  ? "rounded-br-md text-primary-fg"
                  : "rounded-bl-md border border-border bg-bg text-ink",
              )}
              style={m.role === "user" ? { background: accent } : undefined}
            >
              {m.content}
            </div>
          </div>
        ))}
        {pending ? (
          <div className="flex items-center gap-2 text-xs text-muted">
            <LoaderCircle className="size-3.5 animate-spin" />
            Thinking
          </div>
        ) : null}
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        <div ref={bottom} />
      </div>
      <form
        className="border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-bg p-1.5 pl-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            rows={1}
            placeholder="Ask a question"
            className="max-h-28 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            className="grid size-10 place-items-center rounded-xl text-primary-fg disabled:opacity-40"
            style={{ background: accent }}
            aria-label="Send"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
