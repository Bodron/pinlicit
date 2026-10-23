"use client";
import { useSyncExternalStore } from "react";
const key = "pinbind.searches",
  event = "pinbind:searches";
const empty: string[] = [];
let raw: string | null = null,
  snapshot = empty;
function read() {
  try {
    const next = localStorage.getItem(key);
    if (next !== raw) {
      raw = next;
      const value: unknown = JSON.parse(next ?? "[]");
      snapshot = Array.isArray(value)
        ? value
            .filter(
              (v): v is string => typeof v === "string" && v.length <= 120,
            )
            .slice(0, 8)
        : empty;
    }
    return snapshot;
  } catch {
    return empty;
  }
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(event, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(event, listener);
  };
}
export function useSavedSearches() {
  return useSyncExternalStore(subscribe, read, () => empty);
}
export function saveSearch(value: string) {
  const text = value.trim().slice(0, 120);
  if (!text) return;
  localStorage.setItem(
    key,
    JSON.stringify(
      [
        text,
        ...read().filter(
          (q) => q.toLocaleLowerCase() !== text.toLocaleLowerCase(),
        ),
      ].slice(0, 8),
    ),
  );
  window.dispatchEvent(new Event(event));
}
export function removeSearch(value: string) {
  localStorage.setItem(key, JSON.stringify(read().filter((q) => q !== value)));
  window.dispatchEvent(new Event(event));
}
