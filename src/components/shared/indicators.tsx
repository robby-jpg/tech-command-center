"use client";

import Link from "next/link";
import * as React from "react";
import {
  AVATAR_ACCENT_CLASSES,
  MILESTONE_STATUS_META,
  PROJECT_HEALTH_META,
  PROJECT_STATUS_META,
  SLA_STATE_META,
  SYSTEM_CRITICALITY_META,
  SYSTEM_HEALTH_META,
  TASK_STATUS_META,
  TICKET_PRIORITY_META,
  TICKET_STATUS_META,
  type MilestoneStatus,
  type ProjectHealth,
  type ProjectStatus,
  type SLAEvaluation,
  type SystemCriticality,
  type SystemHealth,
  type TaskStatus,
  type TechSystem,
  type TicketPriority,
  type TicketStatus,
  type User,
} from "@/domain";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge, Dot } from "@/components/ui/badge";
import { Hint } from "@/components/ui/primitives";

/* -------------------------------------------------------------------------- */
/* People                                                                     */
/* -------------------------------------------------------------------------- */

const AVATAR_SIZES = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-2xs",
  md: "size-7 text-2xs",
  lg: "size-9 text-xs",
} as const;

export function UserAvatar({
  user,
  size = "sm",
  className,
}: {
  user: User | null;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  if (!user) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong text-fg-subtle",
          AVATAR_SIZES[size],
          className,
        )}
        aria-hidden
      >
        ?
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        AVATAR_ACCENT_CLASSES[user.accent],
        AVATAR_SIZES[size],
        className,
      )}
      title={user.name}
    >
      {user.initials}
    </span>
  );
}

export function UserChip({
  user,
  size = "sm",
  muted = false,
  className,
}: {
  user: User | null;
  size?: keyof typeof AVATAR_SIZES;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)}>
      <UserAvatar user={user} size={size} />
      <span
        className={cn(
          "truncate text-xs",
          muted || !user ? "text-fg-subtle" : "text-fg-body",
        )}
      >
        {user?.name ?? "Unassigned"}
      </span>
    </span>
  );
}

export function AvatarStack({ users, max = 4 }: { users: User[]; max?: number }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <span className="flex items-center -space-x-1.5">
      {shown.map((u) => (
        <UserAvatar key={u.id} user={u} size="sm" className="ring-2 ring-surface" />
      ))}
      {extra > 0 && (
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-subtle text-2xs font-semibold text-fg-muted ring-2 ring-surface">
          +{extra}
        </span>
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Status badges                                                              */
/* -------------------------------------------------------------------------- */

export function TicketStatusBadge({
  status,
  className,
}: {
  status: TicketStatus;
  className?: string;
}) {
  const meta = TICKET_STATUS_META[status];
  return (
    <Badge tone={meta.tone} className={className}>
      {meta.label}
    </Badge>
  );
}

/**
 * Priority reads as a coloured word rather than a filled pill. Critical earns
 * a solid badge; anything lower would drown the table in colour.
 */
export function PriorityBadge({
  priority,
  className,
}: {
  priority: TicketPriority;
  className?: string;
}) {
  const meta = TICKET_PRIORITY_META[priority];
  if (priority === "normal" || priority === "low") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-fg-muted", className)}>
        <Dot tone="neutral" className="size-1.5" />
        {meta.label}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        priority === "critical" ? "text-critical" : "text-warning",
        className,
      )}
    >
      <Dot tone={meta.tone} className="size-1.5" pulse={priority === "critical"} />
      {meta.label}
    </span>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const meta = PROJECT_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const meta = TASK_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  const meta = MILESTONE_STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

/**
 * Health is shown as a word with a state light, never as a bare colour — a
 * colour alone fails for anyone who cannot distinguish it.
 */
export function ProjectHealthBadge({
  health,
  note,
}: {
  health: ProjectHealth;
  note?: string | null;
}) {
  const meta = PROJECT_HEALTH_META[health];
  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-2xs font-medium",
        health === "on_track" && "bg-success-bg text-success",
        health === "at_risk" && "bg-warning-bg text-warning",
        health === "blocked" && "bg-critical-bg text-critical",
      )}
    >
      <Dot tone={meta.tone} className="size-1.5" />
      {meta.label}
    </span>
  );

  if (!note) return badge;
  return <Hint label={note}>{badge}</Hint>;
}

export function HealthIndicator({
  health,
  note,
  showLabel = true,
  className,
}: {
  health: SystemHealth;
  note?: string | null;
  showLabel?: boolean;
  className?: string;
}) {
  const meta = SYSTEM_HEALTH_META[health];
  const body = (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Dot
        tone={meta.tone}
        className="size-2"
        pulse={health === "outage" || health === "partial_outage"}
      />
      {showLabel && (
        <span
          className={cn(
            "text-xs",
            health === "operational" ? "text-fg-muted" : "font-medium text-fg-body",
          )}
        >
          {meta.label}
        </span>
      )}
    </span>
  );

  return note ? <Hint label={note}>{body}</Hint> : body;
}

export function CriticalityBadge({ criticality }: { criticality: SystemCriticality }) {
  const meta = SYSTEM_CRITICALITY_META[criticality];
  return (
    <Badge tone={meta.tone} variant={criticality === "critical" ? "soft" : "plain"}>
      {meta.label}
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/* SLA                                                                        */
/* -------------------------------------------------------------------------- */

export function SLAIndicator({
  evaluation,
  variant = "compact",
}: {
  evaluation: SLAEvaluation;
  variant?: "compact" | "full";
}) {
  const meta = SLA_STATE_META[evaluation.state];
  const remaining = evaluation.minutesRemaining;

  const detail =
    evaluation.state === "met"
      ? "Resolved inside target"
      : evaluation.state === "paused"
        ? "Clock held — waiting on requester"
        : remaining === null
          ? meta.label
          : remaining < 0
            ? `${formatDuration(remaining)} over`
            : `${formatDuration(remaining)} left`;

  const clock = evaluation.awaitingFirstResponse ? "First response" : "Resolution";

  if (variant === "compact") {
    return (
      <Hint label={`${clock} target: ${evaluation.target[evaluation.awaitingFirstResponse ? "firstResponseLabel" : "resolutionLabel"]} · ${detail}`}>
        <span className="inline-flex items-center gap-1.5">
          <Dot tone={meta.tone} className="size-1.5" pulse={evaluation.state === "breached"} />
          <span
            className={cn(
              "text-xs",
              evaluation.state === "breached" && "font-medium text-critical",
              evaluation.state === "risk" && "font-medium text-warning",
              (evaluation.state === "healthy" || evaluation.state === "met" || evaluation.state === "paused") &&
                "text-fg-subtle",
            )}
          >
            {evaluation.state === "met" ? "Met" : evaluation.state === "paused" ? "On hold" : detail}
          </span>
        </span>
      </Hint>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border px-2.5 py-2",
        evaluation.state === "breached" && "border-critical-border bg-critical-bg",
        evaluation.state === "risk" && "border-warning-border bg-warning-bg",
        (evaluation.state === "healthy" || evaluation.state === "met" || evaluation.state === "paused") &&
          "border-line bg-subtle",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5">
          <Dot tone={meta.tone} className="size-1.5" />
          <span className="text-xs font-medium text-fg">{meta.label}</span>
        </span>
        <span className="text-2xs text-fg-muted">{detail}</span>
      </div>
      <p className="mt-1 text-2xs text-fg-muted">
        {clock} target ·{" "}
        {evaluation.awaitingFirstResponse
          ? evaluation.target.firstResponseLabel
          : evaluation.target.resolutionLabel}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Systems                                                                    */
/* -------------------------------------------------------------------------- */

export function SystemBadge({
  system,
  href,
  showHealth = false,
}: {
  system: TechSystem;
  href?: string;
  showHealth?: boolean;
}) {
  const content = (
    <>
      {showHealth && (
        <Dot tone={SYSTEM_HEALTH_META[system.health].tone} className="size-1.5" />
      )}
      {system.shortName}
    </>
  );

  const className =
    "inline-flex items-center gap-1.5 rounded-sm border border-line bg-subtle px-1.5 py-0.5 text-2xs font-medium text-fg-body transition-colors";

  if (href) {
    return (
      <Link href={href} className={cn(className, "hover:border-line-strong hover:bg-sunken")}>
        {content}
      </Link>
    );
  }
  return <span className={className}>{content}</span>;
}

/* -------------------------------------------------------------------------- */
/* Progress                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A progress bar tinted by health rather than by fill. Progress alone says
 * nothing about whether a project is in trouble, so the two are shown together.
 */
export function ProgressBar({
  value,
  health,
  className,
  showValue = false,
}: {
  value: number;
  health?: ProjectHealth;
  className?: string;
  showValue?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            health === "blocked"
              ? "bg-critical"
              : health === "at_risk"
                ? "bg-warning"
                : "bg-teal-500",
          )}
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        />
      </div>
      {showValue && (
        <span className="tabular w-8 shrink-0 text-right text-2xs text-fg-muted">
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}
