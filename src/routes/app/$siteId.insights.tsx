import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getInsights, recommendImprovements, seedTraffic } from "@/lib/server/insights";

export const Route = createFileRoute("/app/$siteId/insights")({ component: InsightsPage });

function InsightsPage() {
  const { siteId } = Route.useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["insights", siteId], queryFn: () => getInsights({ data: siteId }) });
  const data = q.data;

  const rec = useMutation({
    mutationFn: () => recommendImprovements({ data: siteId }),
    onError: (e: Error) => toast.error(e.message),
  });

  const seed = useMutation({
    mutationFn: () => seedTraffic({ data: siteId }),
    onSuccess: async (r) => {
      await qc.invalidateQueries({ queryKey: ["insights", siteId] });
      toast.success(r.added ? `Loaded ${r.added} sample threads` : "Already has traffic");
    },
  });

  const top = data?.topics[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Insights</h1>
          <p className="mt-2 max-w-xl text-muted">
            What customers keep asking — and where the assistant still loses them.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => seed.mutate()} disabled={seed.isPending}>
            Load sample traffic
          </Button>
          <Button onClick={() => rec.mutate()} disabled={rec.isPending}>
            {rec.isPending ? "Reading…" : "Recommend changes"}
          </Button>
        </div>
      </div>

      {top ? (
        <Card>
          <p className="text-xs uppercase tracking-wider text-muted">Signal</p>
          <p className="mt-2 font-display text-2xl tracking-tight">
            “{top.topic}” is the problem {top.hitCount} customers ran into.
          </p>
          <p className="mt-2 text-sm text-muted">
            {top.frustratedCount} sounded frustrated · {top.unresolvedCount} left unresolved
          </p>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-muted">
            No tagged questions yet. Chat in the playground, install the widget, or load sample traffic.
          </p>
        </Card>
      )}

      <Card className="h-80">
        <p className="mb-4 text-sm font-medium">Topic volume</p>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={data?.topics ?? []} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <XAxis dataKey="topic" tick={{ fontSize: 12, fill: "var(--color-muted)" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--color-muted)" }} />
            <Tooltip />
            <Bar dataKey="hitCount" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {data?.actions && data.actions.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {data.actions.map((action) => (
            <Card key={action.topic}>
              <p className="text-xs uppercase tracking-wider text-muted">{action.topic}</p>
              <p className="mt-2 font-display text-xl tracking-tight">{action.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{action.detail}</p>
            </Card>
          ))}
        </div>
      ) : null}

      {rec.data ? (
        <Card>
          <p className="text-xs uppercase tracking-wider text-muted">What to change in the business</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{rec.data.recommendation}</p>
        </Card>
      ) : null}

      <div>
        <h2 className="font-display text-2xl tracking-tight">Unresolved</h2>
        <ul className="mt-4 space-y-2">
          {(data?.unresolved ?? []).map((u) => (
            <li key={u.id} className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
              <p>{u.content}</p>
              <p className="mt-1 text-xs text-muted">{u.topic ?? "untagged"}</p>
            </li>
          ))}
          {data?.unresolved.length === 0 ? (
            <li className="text-sm text-muted">Nothing sitting unresolved.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
