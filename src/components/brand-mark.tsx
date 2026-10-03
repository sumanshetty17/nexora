import { cn } from "@/lib/utils";

export function BrandMark({ className, invert = false }: { className?: string; invert?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <rect width="22" height="22" rx="6" fill={invert ? "#F4F1EA" : "#21564A"} />
        <path
          d="M6 14.5c2.2-4.4 3.4-6.6 5-9.5 1.6 2.9 2.8 5.1 5 9.5"
          fill="none"
          stroke={invert ? "#21564A" : "#F4F1EA"}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="11" cy="14.6" r="1.15" fill={invert ? "#21564A" : "#F4F1EA"} />
      </svg>
      <span className={cn("font-display text-lg tracking-tight", invert ? "text-sidebar-fg" : "text-ink")}>
        Nexora
      </span>
    </span>
  );
}
