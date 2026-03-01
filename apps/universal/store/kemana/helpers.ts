import type { Updater } from "./types";

export function resolveUpdater<T>(next: Updater<T>, prev: T): T {
  return typeof next === "function" ? (next as (value: T) => T)(prev) : next;
}
