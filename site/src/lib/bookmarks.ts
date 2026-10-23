"use client";
import { useSyncExternalStore } from "react";
const key = "pinbind.saved";
const eventName = "pinbind:bookmarks";
const empty: string[] = [];
let raw: string | null = null;
let snapshot = empty;
function read() {
  try {
    const next = localStorage.getItem(key);
    if (next !== raw) {
      raw = next;
      const parsed: unknown = JSON.parse(next ?? "[]");
      snapshot = Array.isArray(parsed)
        ? parsed
            .filter((value): value is string => typeof value === "string")
            .slice(0, 100)
        : empty;
    }
    return snapshot;
  } catch {
    return empty;
  }
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(eventName, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(eventName, listener);
  };
}
export function useBookmarks() {
  return useSyncExternalStore(subscribe, read, () => empty);
}
export function toggleBookmark(id: string) {
  const saved = read();
  const exists = saved.includes(id);
  const next = exists
    ? saved.filter((item) => item !== id)
    : [id, ...saved].slice(0, 100);
  localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new Event(eventName));
  return !exists;
}
