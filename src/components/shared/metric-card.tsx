"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDelta } from "@/lib/format";
import type { Tone } from "@/domain";
import { TONE_CLASSES } from "@/domain";

type Direction = "up-good" | "down-good" | "neutral";

export function MetricCard({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  direction = "neutral",
  href,
  tone,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  /** Percentage change against the comparison period. */
  delta?: number | null;
  deltaLabel?: string;
  direction?: Direction;
  href?: string;
  /** Tints the figure. Reserved for values that genuinely need attention. */
  tone?: Tone;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  const showDelta = delta != null && Number.isFinite(delta);
  const rounded = showDelta ? Number(delta.toFixed(0)) : 0;

  // Whether a movement is good depends on the metric: more open tickets is bad,
  // faster resolution is good. The caller declares which.
  const good =
    direction === "neutral" || rounded === 0
      ? null
      : direction === "up-good"
        ? rounded > 0
        : rounded < 0;

  const DeltaIcon = rounded === 0 ? Minus : rounded > 0 ? ArrowUpRight : ArrowDownRight;

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-fg-muted">{label}</span>
        {Icon && <Icon className="size-3.5 shrink-0 text-fg-subtle" />}
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={cn(
            "tabular text-3xl leading-none font-semibold tracking-tight",
            tone ? TONE_CLASSES[tone].text : "text-fg",
          )}
        >
          {value}
        </span>
        {unit && <span className="text-xs text-fg-muted">{unit}</span>}
      </div>

      {(showDelta || deltaLabel) && (
        <div className="mt-2 flex items-center gap-1">
          {showDelta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-2xs font-medium",
                good === null && "text-fg-subtle",
                good === true && "text-success",
                good === false && "text-critical",
              )}
            >
              <DeltaIcon className="size-3" />
              {formatDelta(delta)}
            </span>
          )}
          {deltaLabel && <span className="text-2xs text-fg-subtle">{deltaLabel}</span>}
        </div>
      )}

      {hint && <p className="mt-1.5 text-2xs leading-4 text-fg-subtle">{hint}</p>}
    </>
  );

  const shell = cn(
    "rounded-lg border border-line bg-surface px-3.5 py-3 shadow-xs",
    href && "card-interactive block",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}

/** A compact figure used in rows of small stats rather than as a headline. */
export function StatTile({
  label,
  value,
  sublabel,
  tone,
  href,
}: {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  tone?: Tone;
  href?: string;
}) {
  const body = (
    <>
      <div
        className={cn(
          "tabular text-xl leading-tight font-semibold",
          tone ? TONE_CLASSES[tone].text : "text-fg",
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-2xs text-fg-muted">{label}</div>
      {sublabel && <div className="mt-0.5 text-2xs text-fg-subtle">{sublabel}</div>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-md px-2.5 py-2 transition-colors hover:bg-subtle"
      >
        {body}
      </Link>
    );
  }
  return <div className="px-2.5 py-2">{body}</div>;
}
