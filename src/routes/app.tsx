import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { listSites } from "@/lib/server/sites";
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
      <Outlet />
    </AppShell>
  );
}
