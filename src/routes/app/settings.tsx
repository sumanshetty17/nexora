import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { Card } from "@/components/ui/card";
import { getUsage } from "@/lib/server/sites";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

const INTENDED = {
  sites: 3,
  conversations30d: 5000,
  emails30d: 500,
  knowledgeChars: 500_000,
};

function Meter({ label, value, cap, suffix }: { label: string; value: number; cap: number; suffix?: string }) {
  const pct = Math.min(100, Math.round((value / cap) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted">
          {value.toLocaleString()}
          {suffix} / {cap.toLocaleString()}
          {suffix}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SettingsPage() {
  const user = useCurrentUser();
  const usage = useQuery({ queryKey: ["usage"], queryFn: () => getUsage() });
  const u = usage.data;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl tracking-tight">Settings</h1>
      <Card>
        <p className="text-xs uppercase tracking-wider text-muted">Account</p>
        <p className="mt-2 font-medium">{user?.displayName ?? "Owner"}</p>
        <p className="text-sm text-muted">{user?.primaryEmail ?? "Signed in"}</p>
      </Card>
      <Card>
        <p className="text-xs uppercase tracking-wider text-muted">Plan</p>
        <h2 className="mt-2 font-display text-2xl">Launch preview — everything unlocked</h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Caps below are the intended commercial shape — conversations, sites, and
          knowledge size — plus email as an add-on. None of that is billed yet.
        </p>
        <div className="mt-6 space-y-4">
          <Meter label="Assistants" value={u?.sites ?? 0} cap={INTENDED.sites} />
          <Meter label="Conversations · 30d" value={u?.conversations30d ?? 0} cap={INTENDED.conversations30d} />
          <Meter label="Email replies · 30d" value={u?.emails30d ?? 0} cap={INTENDED.emails30d} />
          <Meter
            label="Knowledge"
            value={Math.round((u?.knowledgeChars ?? 0) / 1000)}
            cap={Math.round(INTENDED.knowledgeChars / 1000)}
            suffix="k chars"
          />
        </div>
      </Card>
    </div>
  );
}