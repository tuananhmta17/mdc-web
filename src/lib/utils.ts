import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function vnInputToISO(value: string): string {
  return new Date(`${value}:00+07:00`).toISOString();
}

// Vietnam Timezone (Asia/Ho_Chi_Minh)
export function formatVNDateTime(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    return `${formatVNTime(isoString)} ${formatVNDate(isoString)}`;
  } catch {
    return isoString;
  }
}

export function formatVNDate(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function formatVNTime(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function isValidHttpUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function getDayNameVN(dayIndex: number): string {
  const days = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  return days[dayIndex] || "";
}
