import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: unknown): string {
  if (!value) return "—";
  const d = new Date(value as string | number | Date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: unknown): string {
  if (!value) return "—";
  const d = new Date(value as string | number | Date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(value: unknown): string {
  if (!value) return "—";
  const d = new Date(value as string | number | Date);
  if (Number.isNaN(d.getTime())) return "—";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

export function initials(firstName?: string, lastName?: string): string {
  return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase() || "?";
}

export function formatMoney(amount: number, currency?: string): string {
  const cur = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: cur === "KES" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${cur} ${amount}`;
  }
}

export function formatMoneyList(items?: { currency: string; amount: number }[] | null): string {
  if (!items || items.length === 0) return "—";
  return items.map((r) => formatMoney(r.amount, r.currency)).join(" · ");
}

export function displayName(user?: { name?: string; firstName?: string; lastName?: string; email?: string } | null): string {
  if (!user) return "—";
  return (
    user.name ||
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    user.email ||
    "—"
  );
}
