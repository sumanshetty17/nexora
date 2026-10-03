import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { Card } from "@/components/ui/card";
import { getUsage } from "@/lib/server/sites";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

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
          Intended commercial limits later: conversations per month, number of
          websites, knowledge-base size, and an extra fee for the email assistant.
          None of that is billed yet.
        </p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>Sites in use: {u?.sites ?? 0}</div>
          <div>Conversations (30d): {u?.conversations30d ?? 0}</div>
          <div>Email replies (30d): {u?.emails30d ?? 0}</div>
          <div>Knowledge: {u?.knowledgeChars ?? 0} characters</div>
        </dl>
      </Card>
    </div>
  );
}
