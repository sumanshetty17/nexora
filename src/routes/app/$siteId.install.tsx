import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { getSite, updateSite } from "@/lib/server/sites";

export const Route = createFileRoute("/app/$siteId/install")({ component: InstallPage });

function InstallPage() {
  const { siteId } = Route.useParams();
  const qc = useQueryClient();
  const siteQ = useQuery({ queryKey: ["site", siteId], queryFn: () => getSite({ data: siteId }) });
  const site = siteQ.data;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const snippet = site
    ? `<script src="${origin}/widget.js" data-nexora="${site.publicId}" data-color="${site.brandColor}"></script>`
    : "";

  const [copied, setCopied] = useState(false);
  const [color, setColor] = useState<string | null>(null);
  const [origins, setOrigins] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      updateSite({
        data: {
          siteId,
          brandColor: color ?? site?.brandColor,
          allowedOrigins: origins ?? site?.allowedOrigins,
        },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["site", siteId] });
      toast.success("Widget look saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const goLive = useMutation({
    mutationFn: () => updateSite({ data: { siteId, status: "live" } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["site", siteId] });
      toast.success("Assistant is live");
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Install</h1>
        <p className="mt-2 max-w-xl text-muted">
          Paste this before the closing body tag on your site. The bubble opens a
          Nexora frame — customers stay on your domain. If the assistant cannot
          answer, it asks for an email so the lead lands in your dashboard.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <p className="text-xs uppercase tracking-wider text-muted">Embed snippet</p>
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-sidebar p-4 text-sm text-sidebar-fg">
            <code>{snippet}</code>
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(snippet);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied" : "Copy snippet"}
            </Button>
            {site?.status !== "live" ? (
              <Button variant="secondary" onClick={() => goLive.mutate()}>
                Mark live
              </Button>
            ) : null}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Brand color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Brand color"
                  className="size-11 cursor-pointer rounded-lg border border-border bg-bg p-1"
                  value={color ?? site?.brandColor ?? "#21564A"}
                  onChange={(e) => setColor(e.target.value)}
                />
                <Input
                  value={color ?? site?.brandColor ?? ""}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Allowed origins</Label>
              <Input
                value={origins ?? site?.allowedOrigins ?? "*"}
                onChange={(e) => setOrigins(e.target.value)}
                placeholder="https://yourcompany.com, *"
              />
            </div>
          </div>
          <Button className="mt-4" type="button" onClick={() => save.mutate()} disabled={save.isPending}>
            Save widget
          </Button>
        </Card>
        <Card className="overflow-hidden p-0">
          <p className="px-5 pt-5 text-xs uppercase tracking-wider text-muted">Live preview</p>
          {site ? (
            <iframe
              title="Widget preview"
              src={`/w/${site.publicId}`}
              className="mt-3 h-[520px] w-full border-t border-border bg-surface"
            />
          ) : null}
        </Card>
      </div>
      <Card>
        <p className="text-xs uppercase tracking-wider text-muted">Direct link</p>
        <p className="mt-2 text-sm text-muted">Preview the widget as a standalone page:</p>
        <a className="mt-2 inline-block text-sm text-primary" href={site ? `/w/${site.publicId}` : "#"}>
          {site ? `${origin}/w/${site.publicId}` : ""}
        </a>
      </Card>
    </div>
  );
}