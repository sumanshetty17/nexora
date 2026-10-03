import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"span"> & { tone?: "default" | "ok" | "warn" | "danger" | "inverse" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        tone === "default" && "bg-bg text-muted border border-border",
        tone === "ok" && "bg-primary/10 text-primary",
        tone === "warn" && "bg-warn/10 text-warn",
        tone === "danger" && "bg-danger/10 text-danger",
        tone === "inverse" && "bg-sidebar-fg/10 text-sidebar-fg",
        className,
      )}
      {...props}
    />
  );
}
