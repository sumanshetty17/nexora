import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { listSites, getDataStore } from "@/lib/server/sites";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/app")({ component: AppLayout });

function AppLayout() {
  const { user, isPending } = useCurrentUserState();
  const sites = useQuery({
    queryKey: ["sites"],
    queryFn: () => listSites(),
    enabled: Boolean(user),
  });

  const store = useQuery({
    queryKey: ["data-store"],
    queryFn: () => getDataStore(),
    enabled: Boolean(user),
  });

  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-10 w-40 animate-pulse rounded-lg bg-ink/10" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;

  return (
    <AppShell sites={sites.data ?? []}>
      {store.data && !store.data.persistent ? (
        <p className="mb-6 rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          This preview is not saving workspaces yet. Create an assistant to try the flow — it can disappear on the next visit until a database is connected.
        </p>
      ) : null}
      <Outlet />
    </AppShell>
  );
}
