import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { cloneHarborDemo, createSite, getUsage, listSites } from "@/lib/server/sites";

export const Route = createFileRoute("/app/")({ component: AppHome });

function AppHome() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const sites = useQuery({ queryKey: ["sites"], queryFn: () => listSites() });
  const usage = useQuery({ queryKey: ["usage"], queryFn: () => getUsage() });
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createSite({
        data: { name, websiteUrl: url, description, industry: "general" },
      }),
    onSuccess: async (site) => {
      await qc.invalidateQueries({ queryKey: ["sites"] });
      toast.success("Assistant created");
      nav({ to: "/app/$siteId/knowledge", params: { siteId: site.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clone = useMutation({
    mutationFn: () => cloneHarborDemo(),
    onSuccess: async (site) => {
      await qc.invalidateQueries({ queryKey: ["sites"] });
      toast.success("Harbor & Oak copied into your workspace");
      nav({ to: "/app/$siteId", params: { siteId: site.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const u = usage.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Workspace</h1>
        <p className="mt-2 text-muted">
          Create an assistant, train it on your site, then install the widget.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Assistants", u?.sites ?? 0],
          ["Chats · 30d", u?.conversations30d ?? 0],
          ["Email replies · 30d", u?.emails30d ?? 0],
          ["Knowledge", `${Math.round((u?.knowledgeChars ?? 0) / 1000)}k chars`],
        ].map(([label, value]) => (
          <Card key={String(label)} className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
            <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-display text-2xl tracking-tight">New assistant</h2>
        <p className="mt-1 text-sm text-muted">Start from your company, or copy the Harbor & Oak demo.</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="co">Company name</Label>
              <Input id="co" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Northwind Goods" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">What should it know on day one?</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="We sell X, hours are Y, shipping is Z, returns within 30 days…"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create assistant"}
            </Button>
            <Button type="button" variant="secondary" disabled={clone.isPending} onClick={() => clone.mutate()}>
              {clone.isPending ? "Copying…" : "Copy Harbor & Oak demo"}
            </Button>
          </div>
        </form>
      </Card>

      {sites.data && sites.data.length > 0 ? (
        <div className="grid gap-3">
          {sites.data.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => nav({ to: "/app/$siteId", params: { siteId: s.id } })}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface px-5 py-4 text-left hover:border-primary/30"
            >
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted">
                  {s.status} · {s.docCount ?? 0} sources · {s.conversationCount ?? 0} conversations
                </p>
              </div>
              <span className="text-sm text-primary">Open</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
