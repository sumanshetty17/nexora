import { Link, useParams, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Inbox,
  LayoutDashboard,
  LineChart,
  Mail,
  MessageSquare,
  Plus,
  Settings,
} from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";
import type { Site } from "@/lib/types";
import type { ReactNode } from "react";

const links = [
  { to: ".", label: "Overview", icon: LayoutDashboard, suffix: "" },
  { to: "knowledge", label: "Knowledge", icon: BookOpen, suffix: "/knowledge" },
  { to: "conversations", label: "Inbox", icon: MessageSquare, suffix: "/conversations" },
  { to: "insights", label: "Insights", icon: LineChart, suffix: "/insights" },
  { to: "email", label: "Email", icon: Mail, suffix: "/email" },
  { to: "install", label: "Install", icon: Inbox, suffix: "/install" },
] as const;

export function AppShell({
  sites,
  children,
}: {
  sites: Site[];
  children: ReactNode;
}) {
  const { user, isPending } = useCurrentUserState();
  const params = useParams({ strict: false }) as { siteId?: string };
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const siteId = params.siteId;
  const current = sites.find((s) => s.id === siteId) ?? sites[0];

  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg">
        <div className="h-10 w-40 animate-pulse rounded-lg bg-ink/10" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;

  function hrefFor(suffix: string) {
    if (!current) return "/app";
    return suffix === "" ? `/app/${current.id}` : `/app/${current.id}${suffix}`;
  }

  function isActive(suffix: string) {
    if (!current) return false;
    const href = hrefFor(suffix);
    return pathname === href;
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden flex-col bg-sidebar text-sidebar-fg lg:flex">
        <div className="px-5 py-5">
          <Link to="/">
            <BrandMark invert />
          </Link>
        </div>
        <div className="px-3">
          <p className="px-2 pb-2 text-[11px] uppercase tracking-[0.16em] text-sidebar-muted">Assistants</p>
          <div className="space-y-1">
            {sites.map((s) => (
              <Link
                key={s.id}
                to="/app/$siteId"
                params={{ siteId: s.id }}
                className={cn(
                  "block truncate rounded-lg px-3 py-2 text-sm",
                  s.id === current?.id ? "bg-white/10" : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-fg",
                )}
              >
                {s.name}
              </Link>
            ))}
            <Link
              to="/app"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-muted hover:bg-white/5 hover:text-sidebar-fg"
            >
              <Plus className="size-3.5" />
              New assistant
            </Link>
          </div>
        </div>
        {current ? (
          <nav className="mt-6 space-y-1 px-3">
            {links.map((l) => (
              <Link
                key={l.label}
                to={hrefFor(l.suffix)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                  isActive(l.suffix)
                    ? "bg-white/10 text-sidebar-fg"
                    : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-fg",
                )}
              >
                <l.icon className="size-4" />
                {l.label}
              </Link>
            ))}
          </nav>
        ) : null}
        <div className="mt-auto space-y-1 p-3">
          <Link
            to="/app/settings"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
              pathname === "/app/settings"
                ? "bg-white/10 text-sidebar-fg"
                : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-fg",
            )}
          >
            <Settings className="size-4" />
            Settings
          </Link>
          <div className="flex items-center justify-between px-2 py-2">
            <span className="truncate text-xs text-sidebar-muted">{user.displayName ?? user.primaryEmail}</span>
            <UserButton />
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
          <BrandMark />
          <UserButton />
        </div>
        {current ? (
          <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-2 py-2 lg:hidden">
            {links.map((l) => (
              <Link
                key={l.label}
                to={hrefFor(l.suffix)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-2 text-xs",
                  isActive(l.suffix) ? "bg-primary text-primary-fg" : "text-muted",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        ) : null}
        <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
      </div>
    </div>
  );
}
