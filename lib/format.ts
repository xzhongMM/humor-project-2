import { TZ } from "./schema";
import type { Profile } from "./types";

export function displayName(p?: Profile | null, fallbackId?: string | null): string {
  if (p) {
    const full = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
    if (full) return full;
    return `user ${p.id.slice(0, 8)}`;
  }
  return fallbackId ? `user ${String(fallbackId).slice(0, 8)}` : "unknown";
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  month: "short",
  day: "numeric",
  year: "numeric",
});
const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}
export function fmtDateTime(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : dateTimeFmt.format(d);
}
export const fmtInt = (n: number) => n.toLocaleString("en-US");
export const fmtPct = (x: number, digits = 0) =>
  Number.isFinite(x) ? `${(x * 100).toFixed(digits)}%` : "—";

/** Strip characters that have meaning in PostgREST filter syntax. */
export function cleanSearch(q: string | undefined | null): string {
  return (q ?? "").replace(/[,()*%\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

export function pageNum(v: string | undefined): number {
  const n = parseInt(v ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
