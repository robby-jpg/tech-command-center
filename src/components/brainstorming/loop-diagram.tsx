"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { Circle } from "lucide-react";
import { LOOP_STAGE_META, LOOP_STAGE_ORDER, TONE_CLASSES, type LoopStage } from "@/domain";
import { cn } from "@/lib/utils";

/**
 * The loop, drawn.
 *
 * Not a React Flow diagram. This one has a fixed six-node shape that never
 * changes, so an editable canvas would only invite somebody to break it — and
 * a fixed drawing can carry things a generic node cannot: who owns the stage,
 * what it produces, and where the current cycle actually is.
 *
 * The editable version of this exists too, as a `workflow` diagram in the
 * catalogue, for when somebody wants to argue with the shape rather than
 * follow it.
 */

function Icon({ name, className }: { name: string; className?: string }) {
  const Resolved =
    (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ??
    Circle;
  return <Resolved className={className} />;
}

/** What each stage hands to the next one. The arrow labels, effectively. */
const HANDOFF: Record<LoopStage, string> = {
  discovery: "Answers, resources, pain",
  gather: "The actual data",
  analyze: "Pain points worth building against",
  build: "Something to show",
  demo: "Reactions",
  feedback: "The next set of questions",
};

export function LoopDiagram({
  activeStage,
  className,
}: {
  /** Highlights where the current cycle sits, when there is one. */
  activeStage?: LoopStage | null;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-line bg-surface", className)}>
      <div className="border-b border-line-soft px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">The loop</h2>
        <p className="mt-0.5 text-xs text-fg-muted">
          One turn every two weeks. The session is the top of it, and the end of the previous
          one.
        </p>
      </div>

      <div className="scrollbar-slim overflow-x-auto px-4 pt-4 pb-2">
        <ol className="flex min-w-max items-stretch gap-0">
          {LOOP_STAGE_ORDER.map((stage, i) => {
            const meta = LOOP_STAGE_META[stage];
            const tone = TONE_CLASSES[meta.tone];
            const active = activeStage === stage;
            const last = i === LOOP_STAGE_ORDER.length - 1;

            return (
              <li key={stage} className="flex items-stretch">
                <div
                  className={cn(
                    "flex w-44 flex-col rounded-md border px-3 py-2.5 transition-shadow",
                    active
                      ? cn(tone.border, tone.bg, "shadow-sm ring-2 ring-teal-500/30")
                      : "border-line bg-canvas",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                        active ? tone.solid : "bg-subtle text-fg-muted",
                      )}
                    >
                      {i + 1}
                    </span>
                    <Icon
                      name={meta.icon}
                      className={cn("size-3.5 shrink-0", active ? tone.text : "text-fg-subtle")}
                    />
                    <span className="truncate text-xs font-semibold text-fg">{meta.label}</span>
                  </div>

                  <p className="mt-1.5 text-[10px] leading-3.5 text-fg-muted">
                    {meta.description}
                  </p>

                  <span
                    className={cn(
                      "mt-auto inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-px pt-2 text-[9px] font-medium",
                      meta.owner === "Tech" ? "text-teal-700" : "text-fg-subtle",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        meta.owner === "Tech" ? "bg-teal-500" : "bg-navy-300",
                      )}
                    />
                    {meta.owner}
                  </span>
                </div>

                {!last && (
                  <div className="flex w-16 shrink-0 flex-col items-center justify-center px-1">
                    <span className="text-center text-[8px] leading-2.5 text-fg-subtle">
                      {HANDOFF[stage]}
                    </span>
                    <Icons.ArrowRight className="mt-1 size-3 text-navy-300" />
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {/* The return leg. Drawn rather than described, because the fact that it
            closes is the only genuinely important thing about this diagram. */}
        <div className="relative mt-1 min-w-max">
          <svg
            className="w-full"
            height="34"
            viewBox="0 0 1000 34"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M 985 2 L 985 20 Q 985 30 972 30 L 28 30 Q 15 30 15 20 L 15 8"
              fill="none"
              stroke="var(--color-navy-300)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M 10 12 L 15 4 L 20 12"
              fill="none"
              stroke="var(--color-navy-300)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span className="pointer-events-none absolute inset-x-0 top-3 text-center text-[9px] font-medium text-fg-subtle">
            {HANDOFF.feedback} — the next session opens with what this one changed
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * A compact stage picker, used on a session to move it round the loop.
 *
 * Deliberately shows every stage rather than only the next one: cycles go
 * backwards in practice — a demo sends you back to gather more often than
 * anyone plans for — and a control that only moves forwards would quietly
 * make the log lie.
 */
export function LoopStagePicker({
  value,
  onChange,
  disabled,
}: {
  value: LoopStage;
  onChange: (stage: LoopStage) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-md border border-line bg-canvas p-1">
      {LOOP_STAGE_ORDER.map((stage) => {
        const meta = LOOP_STAGE_META[stage];
        const active = value === stage;
        return (
          <button
            key={stage}
            type="button"
            disabled={disabled}
            onClick={() => onChange(stage)}
            aria-pressed={active}
            className={cn(
              "rounded px-2 py-1 text-2xs font-medium transition-colors disabled:opacity-50",
              active
                ? cn(TONE_CLASSES[meta.tone].solid)
                : "text-fg-muted hover:bg-subtle hover:text-fg",
            )}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
