import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/primitives";

/**
 * Empty, loading and error states.
 *
 * Written once and shared so that every surface behaves the same way when it
 * has nothing to show — which matters more once real APIs are connected and
 * these stop being hypothetical.
 */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        className,
      )}
    >
      {Icon && (
        <span className="mb-3 inline-flex size-9 items-center justify-center rounded-full bg-subtle text-fg-subtle">
          <Icon className="size-4" />
        </span>
      )}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-xs leading-5 text-fg-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-3 inline-flex size-9 items-center justify-center rounded-full bg-critical-bg text-critical">
        <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
          <path
            d="M10 6.5v4M10 13.5h.01M8.6 2.9 1.7 15a1.6 1.6 0 0 0 1.4 2.4h13.8a1.6 1.6 0 0 0 1.4-2.4L11.4 2.9a1.6 1.6 0 0 0-2.8 0Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs leading-5 text-fg-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 8, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-line-soft">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-2.5">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-3.5", c === 1 ? "flex-1" : "w-16")}
              style={{ opacity: 1 - r * 0.06 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-line bg-surface p-4", className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-16" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  );
}

export function ChartSkeleton({ height = 180 }: { height?: number }) {
  return (
    <div className="flex items-end gap-1.5 px-4 pb-4" style={{ height }}>
      {[38, 62, 48, 74, 55, 82, 60, 70, 45, 66, 52, 78].map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-lg border border-line bg-surface">
          <div className="border-b border-line-soft px-4 py-3">
            <Skeleton className="h-3.5 w-32" />
          </div>
          <TableSkeleton rows={6} />
        </div>
        <div className="rounded-lg border border-line bg-surface">
          <div className="border-b border-line-soft px-4 py-3">
            <Skeleton className="h-3.5 w-24" />
          </div>
          <ChartSkeleton />
        </div>
      </div>
    </div>
  );
}
