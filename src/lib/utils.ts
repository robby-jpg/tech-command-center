import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Conditional class names with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Stable id for records created during a session. */
export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export function pluralise(count: number, one: string, many = `${one}s`): string {
  return count === 1 ? one : many;
}

/** "3 tickets" / "1 ticket" */
export function countLabel(count: number, one: string, many?: string): string {
  return `${count} ${pluralise(count, one, many)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Percentage change, guarding the divide-by-zero that makes a KPI read "Infinity%". */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function average(values: number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

export function groupBy<T, K extends string>(
  items: T[],
  key: (item: T) => K,
): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

/** Sorts a copy; the input array is never mutated. */
export function sortBy<T>(items: T[], ...comparators: ((a: T, b: T) => number)[]): T[] {
  return [...items].sort((a, b) => {
    for (const compare of comparators) {
      const result = compare(a, b);
      if (result !== 0) return result;
    }
    return 0;
  });
}

export function byDateDesc<T>(get: (item: T) => string | null) {
  return (a: T, b: T) => (get(b) ?? "").localeCompare(get(a) ?? "");
}

export function byDateAsc<T>(get: (item: T) => string | null) {
  return (a: T, b: T) => (get(a) ?? "").localeCompare(get(b) ?? "");
}

export function byNumber<T>(get: (item: T) => number) {
  return (a: T, b: T) => get(a) - get(b);
}
