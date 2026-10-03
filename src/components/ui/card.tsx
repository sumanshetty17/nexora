import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-3xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]", className)}
      {...props}
    />
  );
}
