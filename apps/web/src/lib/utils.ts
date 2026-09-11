import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combines class names, resolving Tailwind conflicts with tailwind-merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateLabelFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

/** Formats a UTC ISO timestamp as HH:mm in the given IANA timezone. */
export function formatTimeInTimezone(iso: string, timeZone: string): string {
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(iso));
  // en-US hour12:false can produce "24:00" for midnight; normalize to "00:00".
  return time === "24:00" ? "00:00" : time;
}

/** Formats an ISO timestamp as a human-readable date label. */
export function formatDateLabel(iso: string): string {
  return dateLabelFormatter.format(new Date(iso));
}

/**
 * Formats a Date as YYYY-MM-DD in the given IANA timezone. Availability
 * queries treat the date parameter as a calendar day in the resource's
 * timezone, so the date picker must convert with the same timezone.
 */
export function toDateInputValue(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Returns today's calendar date in the given timezone as YYYY-MM-DD. */
export function todayInTimezone(timeZone: string): string {
  return toDateInputValue(new Date(), timeZone);
}