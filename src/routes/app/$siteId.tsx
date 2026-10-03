import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/$siteId")({ component: SiteLayout });

function SiteLayout() {
  return <Outlet />;
}
