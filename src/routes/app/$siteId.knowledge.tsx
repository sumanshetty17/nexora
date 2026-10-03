import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { addKnowledge, deleteDoc, ingestWebsite, listDocs } from "@/lib/server/knowledge";
import { getSite } from "@/lib/server/sites";

export const Route = createFileRoute("/app/$siteId/knowledge")({ component: KnowledgePage });

function KnowledgePage() {
  const { siteId } = Route.useParams();
  const qc = useQueryClient();
  const site = useQuery({ queryKey: ["site", siteId], queryFn: () => getSite({ data: siteId }) });
  const docs = useQuery({ queryKey: ["docs", siteId], queryFn: () => listDocs({ data: siteId }) });
  const [url, setUrl] = useState(site.data?.websiteUrl ?? "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const crawl = useMutation({
    mutationFn: () => ingestWebsite({ data: { siteId, url } }),
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey: ["docs", siteId] });
      toast.success(`Read ${r.imported} page${r.imported === 1 ? "" : "s"}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const add = useMutation({
    mutationFn: () =>
      addKnowledge({
        data: { siteId, kind: "note", title: title || "Notes", content },
      }),
    onSuccess: async () => {
      setTitle("");
      setContent("");
      await qc.invalidateQueries({ queryKey: ["docs", siteId] });
      toast.success("Indexed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (docId: string) => deleteDoc({ data: { siteId, docId } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["docs", siteId] });
    },
  });

  async function onFile(file: File) {
    const text = await file.text();
    try {
      await addKnowledge({
        data: { siteId, kind: "file", title: file.name, content: text },
      });
      await qc.invalidateQueries({ queryKey: ["docs", siteId] });
      toast.success(`Indexed ${file.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file");
    }
  }

  const chars = docs.data?.reduce((n, d) => n + d.charCount, 0) ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Knowledge</h1>
        <p className="mt-2 text-muted">
          The assistant only answers from what you put here. {chars.toLocaleString()} characters indexed.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl tracking-tight">Read a website</h2>
          <p className="mt-1 text-sm text-muted">Public pages only. We fetch the homepage and a few same-host links.</p>
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              crawl.mutate();
            }}
          >
            <Input
              type="url"
              required
              placeholder="https://yourcompany.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button type="submit" disabled={crawl.isPending}>
              {crawl.isPending ? "Reading…" : "Crawl and index"}
            </Button>
          </form>
        </Card>
        <Card>
          <h2 className="font-display text-2xl tracking-tight">Paste or upload</h2>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Shipping policy" />
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Hours, FAQs, product facts, return policy…"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => add.mutate()} disabled={add.isPending || content.trim().length < 12}>
                Add to knowledge
              </Button>
              <label className="inline-flex h-11 cursor-pointer items-center rounded-lg border border-border px-4 text-sm">
                Upload text file
                <input
                  type="file"
                  accept=".txt,.md,.csv,.json,.html"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onFile(file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        {(docs.data ?? []).map((d) => (
          <div key={d.id} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{d.title}</p>
                <p className="text-xs text-muted">
                  {d.kind} · {d.charCount.toLocaleString()} chars
                  {d.sourceUrl ? ` · ${d.sourceUrl}` : ""}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(d.id)}>
                Remove
              </Button>
            </div>
            <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-muted">{d.content}</p>
          </div>
        ))}
        {docs.data?.length === 0 ? (
          <p className="text-sm text-muted">Nothing indexed yet. Crawl your site or paste the policies people ask about.</p>
        ) : null}
      </div>
    </div>
  );
}
