import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** The standard page gutter. Every route uses it so nothing drifts. */
export function PageBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("space-y-5 px-6 py-5", className)}>{children}</div>;
}

export function SectionHeader({
  title,
  description,
  action,
  href,
  hrefLabel = "View all",
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        {href && (
          <Link
            href={href}
            className="group inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
          >
            {hrefLabel}
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

/** A row of labelled values, used in detail sidebars. */
export function DetailRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 py-1.5", className)}>
      <span className="shrink-0 pt-0.5 text-2xs text-fg-muted">{label}</span>
      <span className="min-w-0 text-right text-xs text-fg-body">{children}</span>
    </div>
  );
}
