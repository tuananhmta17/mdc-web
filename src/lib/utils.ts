import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Vietnam Timezone (Asia/Ho_Chi_Minh)
export function formatVNDateTime(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const date = parseISO(isoString);
    return format(date, "HH:mm dd/MM/yyyy");
  } catch {
    return isoString;
  }
}

export function formatVNDate(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const date = parseISO(isoString);
    return format(date, "dd/MM/yyyy");
  } catch {
    return isoString;
  }
}

export function formatVNTime(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const date = parseISO(isoString);
    return format(date, "HH:mm");
  } catch {
    return isoString;
  }
}

export function isValidHttpUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
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
