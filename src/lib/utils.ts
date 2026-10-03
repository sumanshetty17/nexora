import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

export function nid(prefix = ""): string {
  const raw = crypto.randomUUID().replaceAll("-", "");
  return prefix ? `${prefix}_${raw.slice(0, 16)}` : raw;
}

export function publicId(): string {
  return `nx_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export function clampText(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}
