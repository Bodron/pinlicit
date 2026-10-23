"use client";
import { useSyncExternalStore } from "react";
type Settings = { showMarkers: boolean; thresholds: Record<string, number> };
const empty: Settings = { showMarkers: true, thresholds: {} };
const cache = new Map<string, { raw: string | null; value: Settings }>();
const event = "pinbind:watch-settings";
function read(user: string) {
  try {
    const key = `pinbind.watch.${user}`;
    const raw = localStorage.getItem(key);
    const previous = cache.get(key);
    if (previous?.raw === raw) return previous.value;
    const parsed = JSON.parse(raw ?? "null");
    const thresholds: Record<string, number> = {};
    if (parsed?.thresholds && typeof parsed.thresholds === "object")
      for (const [id, value] of Object.entries(parsed.thresholds).slice(0, 200))
        if (
          /^[a-f\d]{24}$/i.test(id) &&
          Number.isSafeInteger(value) &&
          Number(value) >= 0
        )
          thresholds[id] = Number(value);
    const value = parsed
      ? { showMarkers: parsed.showMarkers !== false, thresholds }
      : empty;
    cache.set(key, { raw, value });
    return value;
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
export function useWatchSettings(user: string) {
  return useSyncExternalStore(
    subscribe,
    () => read(user),
    () => empty,
  );
}
export function updateWatchSettings(user: string, patch: Partial<Settings>) {
  localStorage.setItem(
    `pinbind.watch.${user}`,
    JSON.stringify({ ...read(user), ...patch }),
  );
  window.dispatchEvent(new Event(event));
}
