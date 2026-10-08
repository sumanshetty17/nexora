import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { addKnowledge, deleteDoc, generateFaqs, ingestWebsite, listDocs, searchKnowledge } from "@/lib/server/knowledge";
import { getSite } from "@/lib/server/sites";

export const Route = createFileRoute("/app/$siteId/knowledge")({ component: KnowledgePage });

function KnowledgePage() {
  const { siteId } = Route.useParams();
  const qc = useQueryClient();
  const site = useQuery({ queryKey: ["site", siteId], queryFn: () => getSite({ data: siteId }) });
  const docs = useQuery({ queryKey: ["docs", siteId], queryFn: () => listDocs({ data: siteId }) });
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [probe, setProbe] = useState("");

  useEffect(() => {
    if (site.data?.websiteUrl && !url) setUrl(site.data.websiteUrl);
  }, [site.data?.websiteUrl, url]);

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

  const addFaq = useMutation({
    mutationFn: () =>
      addKnowledge({
        data: {
          siteId,
          kind: "faq",
          title: question.trim(),
          content: `Q: ${question.trim()}\nA: ${answer.trim()}`,
        },
      }),
    onSuccess: async () => {
      setQuestion("");
      setAnswer("");
      await qc.invalidateQueries({ queryKey: ["docs", siteId] });
      toast.success("FAQ indexed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const faqs = useMutation({
    mutationFn: () => generateFaqs({ data: siteId }),
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey: ["docs", siteId] });
      toast.success(`Added ${r.added} FAQs`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const probeQ = useMutation({
    mutationFn: () => searchKnowledge({ data: { siteId, query: probe } }),
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Knowledge</h1>
          <p className="mt-2 text-muted">
            The assistant only answers from what you put here. {chars.toLocaleString()} characters indexed.
          </p>
        </div>
        <Button variant="secondary" onClick={() => faqs.mutate()} disabled={faqs.isPending}>
          {faqs.isPending ? "Extracting…" : "Extract FAQs from sources"}
        </Button>
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
        <Card className="lg:col-span-2">
          <h2 className="font-display text-2xl tracking-tight">Test retrieval</h2>
          <p className="mt-1 text-sm text-muted">Ask the way a customer would. See which sources the assistant will cite.</p>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (probe.trim()) probeQ.mutate();
            }}
          >
            <Input
              value={probe}
              onChange={(e) => setProbe(e.target.value)}
              placeholder="Do you offer white-glove delivery to Seattle?"
            />
            <Button type="submit" variant="secondary" disabled={probeQ.isPending || probe.trim().length < 3}>
              {probeQ.isPending ? "Searching…" : "Search"}
            </Button>
          </form>
          {probeQ.data ? (
            <ul className="mt-4 space-y-2">
              {probeQ.data.map((hit, i) => (
                <li key={`${hit.title}-${i}`} className="rounded-2xl border border-border bg-bg px-4 py-3">
                  <p className="text-sm font-medium">{hit.title}</p>
                  <p className="mt-1 text-sm text-muted">{hit.excerpt}</p>
                </li>
              ))}
              {probeQ.data.length === 0 ? (
                <li className="text-sm text-muted">Nothing matched. Add a FAQ or a policy page covering that question.</li>
              ) : null}
            </ul>
          ) : null}
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="font-display text-2xl tracking-tight">Add a FAQ</h2>
          <p className="mt-1 text-sm text-muted">These become suggested questions in the widget.</p>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              addFaq.mutate();
            }}
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Question</Label>
              <Input
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Do you offer white-glove delivery?"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Answer</Label>
              <Textarea
                required
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Yes, within 40 miles of Portland for a quoted fee…"
              />
            </div>
            <Button type="submit" disabled={addFaq.isPending}>
              {addFaq.isPending ? "Saving…" : "Index FAQ"}
            </Button>
          </form>
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