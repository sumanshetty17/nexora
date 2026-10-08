import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChatPanel } from "@/components/chat-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { playgroundChat } from "@/lib/server/chat";
import { captureLead } from "@/lib/server/leads";
import { getInsights } from "@/lib/server/insights";
import { listDocs } from "@/lib/server/knowledge";
import { getReadiness, getSite, prepareAssistant, updateSite } from "@/lib/server/sites";
import { Check } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/$siteId/")({ component: SiteOverview });

function SiteOverview() {
  const { siteId } = Route.useParams();
  const qc = useQueryClient();
  const siteQ = useQuery({ queryKey: ["site", siteId], queryFn: () => getSite({ data: siteId }) });
  const insights = useQuery({ queryKey: ["insights", siteId], queryFn: () => getInsights({ data: siteId }) });
  const docs = useQuery({ queryKey: ["docs", siteId], queryFn: () => listDocs({ data: siteId }) });
  const ready = useQuery({ queryKey: ["readiness", siteId], queryFn: () => getReadiness({ data: siteId }) });
  const site = siteQ.data;
  const [welcome, setWelcome] = useState<string | null>(null);
  const [tone, setTone] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      updateSite({
        data: {
          siteId,
          welcomeMessage: welcome ?? site?.welcomeMessage,
          tone: tone ?? site?.tone,
        },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["site", siteId] });
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const prepare = useMutation({
    mutationFn: () => prepareAssistant({ data: siteId }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["site", siteId] });
      await qc.invalidateQueries({ queryKey: ["readiness", siteId] });
      toast.success("Assistant brief written from your knowledge");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!site) {
    return <div className="h-24 animate-pulse rounded-2xl bg-ink/5" />;
  }

  const top = insights.data?.topics[0];
  const hasKnowledge = (docs.data?.length ?? site.docCount ?? 0) > 0;
  const prepared = Boolean(site.systemBrief);
  const hasTraffic = (insights.data?.totalConversations ?? 0) > 0;
  const live = site.status === "live";
  const steps: {
    done: boolean;
    label: string;
    hint: string;
    href?: "knowledge" | "install";
    action?: "prepare";
  }[] = [
    { done: hasKnowledge, label: "Train on knowledge", href: "knowledge", hint: "Crawl the site or paste policies" },
    { done: prepared, label: "Prepare the voice", action: "prepare", hint: "Write a brief from your sources" },
    { done: hasTraffic, label: "Try the playground", hint: "Ask it something a customer would" },
    { done: live, label: "Install on the website", href: "install", hint: "Copy the one-line snippet" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-4xl tracking-tight">{site.name}</h1>
            <Badge tone={site.status === "live" ? "ok" : "default"}>{site.status}</Badge>
          </div>
          <p className="mt-2 text-muted">{site.websiteUrl || "No website URL yet"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => prepare.mutate()} disabled={prepare.isPending}>
            {prepare.isPending ? "Preparing…" : "Prepare assistant"}
          </Button>
          <Button asChild>
            <Link to="/app/$siteId/install" params={{ siteId }}>
              Install
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {steps.map((step, i) => (
          <div
            key={step.label}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-center gap-2">
              <span
                className={
                  step.done
                    ? "grid size-6 place-items-center rounded-full bg-primary text-primary-fg"
                    : "grid size-6 place-items-center rounded-full border border-border text-xs text-muted"
                }
              >
                {step.done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <p className="text-sm font-medium">{step.label}</p>
            </div>
            <p className="mt-2 text-xs text-muted">{step.hint}</p>
            {"href" in step && step.href === "knowledge" ? (
              <Link to="/app/$siteId/knowledge" params={{ siteId }} className="mt-2 inline-block text-xs text-primary">
                Open
              </Link>
            ) : step.href === "install" ? (
              <Link to="/app/$siteId/install" params={{ siteId }} className="mt-2 inline-block text-xs text-primary">
                Open
              </Link>
            ) : step.action === "prepare" ? (
              <button
                type="button"
                className="mt-2 text-xs text-primary"
                onClick={() => prepare.mutate()}
              >
                Run
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Readiness</p>
          <p className="mt-1 font-display text-3xl tabular-nums">{ready.data?.score ?? 0}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Conversations</p>
          <p className="mt-1 font-display text-3xl tabular-nums">{insights.data?.totalConversations ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Needs a human</p>
          <p className="mt-1 font-display text-3xl tabular-nums">{insights.data?.needsHuman ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Hottest topic</p>
          <p className="mt-1 font-display text-2xl">{top?.topic ?? "—"}</p>
        </Card>
      </div>

      {ready.data ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ready.data.checks.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-surface px-4 py-3">
              <p className={c.done ? "text-sm font-medium" : "text-sm font-medium text-muted"}>
                {c.done ? "Ready · " : "Open · "}
                {c.label}
              </p>
              <p className="mt-1 text-xs text-muted">{c.hint}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl tracking-tight">Voice</h2>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Welcome line</Label>
              <Input
                value={welcome ?? site.welcomeMessage}
                onChange={(e) => setWelcome(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tone</Label>
              <Textarea value={tone ?? site.tone} onChange={(e) => setTone(e.target.value)} />
            </div>
            <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
              Save
            </Button>
          </div>
          {site.systemBrief ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted">{site.systemBrief}</p>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Prepare the assistant after you add knowledge so it writes a brief from your sources.
            </p>
          )}
        </Card>
        <div className="h-[520px]">
          <ChatPanel
            name={site.name}
            welcome={site.welcomeMessage}
            brandColor={site.brandColor}
            suggestions={
              (docs.data ?? [])
                .filter((d) => d.kind === "faq")
                .map((d) => d.title)
                .filter((t) => t.endsWith("?") || t.length > 8)
                .slice(0, 4)
            }
            onSend={(message, conversationId) =>
              playgroundChat({ data: { siteId, message, conversationId } })
            }
            onCaptureLead={({ conversationId, name, email, note }) =>
              captureLead({
                data: { publicId: site.publicId, conversationId, name, email, note },
              }).then(() => undefined)
            }
          />
        </div>
      </div>
    </div>
  );
}