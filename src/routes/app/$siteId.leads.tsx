import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listLeads, updateLead } from "@/lib/server/leads";
import type { Lead } from "@/lib/types";

export const Route = createFileRoute("/app/$siteId/leads")({ component: LeadsPage });

function tone(status: Lead["status"]) {
  if (status === "closed") return "ok" as const;
  if (status === "contacted") return "warn" as const;
  return "danger" as const;
}

function LeadsPage() {
  const { siteId } = Route.useParams();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["leads", siteId], queryFn: () => listLeads({ data: siteId }) });
  const setStatus = useMutation({
    mutationFn: (input: { leadId: string; status: Lead["status"] }) =>
      updateLead({ data: { siteId, ...input } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["leads", siteId] });
    },
  });

  const rows = list.data ?? [];
  const openCount = rows.filter((l) => l.status === "new").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Leads</h1>
        <p className="mt-2 max-w-xl text-muted">
          When the assistant cannot resolve a question, visitors can leave an email.
          {openCount ? ` ${openCount} waiting.` : " None waiting."}
        </p>
      </div>
      <div className="space-y-3">
        {rows.map((lead) => (
          <article key={lead.id} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{lead.name || lead.email}</p>
                <p className="text-sm text-muted">
                  <a href={`mailto:${lead.email}`} className="underline-offset-2 hover:underline">
                    {lead.email}
                  </a>
                  {lead.topic ? ` · ${lead.topic}` : ""}
                  {" · "}
                  {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                </p>
              </div>
              <Badge tone={tone(lead.status)}>{lead.status}</Badge>
            </div>
            {lead.note ? <p className="mt-3 text-sm leading-relaxed">{lead.note}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {lead.status === "new" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setStatus.mutate({ leadId: lead.id, status: "contacted" })}
                >
                  Mark contacted
                </Button>
              ) : null}
              {lead.status !== "closed" ? (
                <Button size="sm" onClick={() => setStatus.mutate({ leadId: lead.id, status: "closed" })}>
                  Close
                </Button>
              ) : null}
            </div>
          </article>
        ))}
        {rows.length === 0 ? (
          <p className="text-sm text-muted">
            No leads yet. If the assistant is unsure, the widget asks for an email so you can follow up.
          </p>
        ) : null}
      </div>
    </div>
  );
}
