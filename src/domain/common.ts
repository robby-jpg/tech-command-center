import { z } from "zod";

/**
 * Shared primitives.
 *
 * Timestamps are ISO-8601 strings rather than Date objects so that records
 * cross the server/client boundary without serialisation loss, and so a
 * Postgres row maps onto a domain object without a transform step.
 */
export const isoDateTime = z.string().min(1);
export const entityId = z.string().min(1);

export type ISODateTime = string;
export type EntityId = string;

/**
 * The visual vocabulary shared by every badge, indicator and chart in the
 * application. Components map a Tone to colour; domain modules declare the
 * Tone. This is the only place the two concerns meet, which is what keeps
 * severity colour consistent across otherwise unrelated features.
 */
export type Tone =
  | "critical"
  | "warning"
  | "success"
  | "info"
  | "neutral"
  | "brand"
  | "accent";

export const TONE_CLASSES: Record<
  Tone,
  { text: string; bg: string; border: string; dot: string; solid: string }
> = {
  critical: {
    text: "text-critical",
    bg: "bg-critical-bg",
    border: "border-critical-border",
    dot: "bg-critical",
    solid: "bg-critical text-white",
  },
  warning: {
    text: "text-warning",
    bg: "bg-warning-bg",
    border: "border-warning-border",
    dot: "bg-warning",
    solid: "bg-warning text-white",
  },
  success: {
    text: "text-success",
    bg: "bg-success-bg",
    border: "border-success-border",
    dot: "bg-success",
    solid: "bg-success text-white",
  },
  info: {
    text: "text-info",
    bg: "bg-info-bg",
    border: "border-info-border",
    dot: "bg-info",
    solid: "bg-info text-white",
  },
  neutral: {
    text: "text-fg-muted",
    bg: "bg-neutral-bg",
    border: "border-neutral-border",
    dot: "bg-fg-subtle",
    solid: "bg-fg-muted text-white",
  },
  brand: {
    text: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
    dot: "bg-teal-500",
    solid: "bg-teal-500 text-white",
  },
  accent: {
    text: "text-accent",
    bg: "bg-accent-bg",
    border: "border-accent/25",
    dot: "bg-accent",
    solid: "bg-accent text-white",
  },
};

/** Ordered chart palette. Brand first, then hues that stay distinguishable. */
export const CHART_SERIES = [
  "var(--color-navy-600)",
  "var(--color-teal-500)",
  "var(--color-navy-300)",
  "var(--color-warning)",
  "var(--color-accent)",
  "var(--color-info)",
  "var(--color-teal-700)",
  "var(--color-fg-subtle)",
] as const;

export type OptionMeta<T extends string> = {
  value: T;
  label: string;
  tone: Tone;
  description?: string;
};

/** Turns a Record-of-metadata into the ordered option list a filter needs. */
export function toOptions<T extends string>(
  meta: Record<T, { label: string; tone: Tone; description?: string }>,
  order: readonly T[],
): OptionMeta<T>[] {
  return order.map((value) => ({ value, ...meta[value] }));
}
