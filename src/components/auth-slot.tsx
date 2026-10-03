import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";

export function AuthSlot({ inverse = false }: { inverse?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-11 w-24 animate-pulse rounded-lg bg-ink/10" />;
  }
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Button asChild size="sm" variant={inverse ? "inverse" : "default"}>
          <Link to="/app">Dashboard</Link>
        </Button>
        <UserButton />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" variant={inverse ? "ghost" : "ghost"}>
        <Link to="/login" className={inverse ? "text-sidebar-fg" : undefined}>
          Sign in
        </Link>
      </Button>
      <Button asChild size="sm" variant={inverse ? "inverse" : "default"}>
        <Link to="/login">Start free</Link>
      </Button>
    </div>
  );
}
