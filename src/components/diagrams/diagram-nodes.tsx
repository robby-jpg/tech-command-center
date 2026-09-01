"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import * as Icons from "lucide-react";
import { Square } from "lucide-react";
import * as React from "react";
import { DIAGRAM_NODE_KIND_META, type DiagramNodeKind } from "@/domain";
import { cn } from "@/lib/utils";

export type DiagramNodeData = {
  kind: DiagramNodeKind;
  label: string;
  description: string;
  systemId: string | null;
  systemHealthy: boolean;
};

function Icon({ name, className }: { name: string; className?: string }) {
  const Resolved =
    (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ??
    Square;
  return <Resolved className={className} />;
}

const TONE_STYLES: Record<string, string> = {
  success: "border-success-border bg-success-bg text-success",
  info: "border-info-border bg-info-bg text-info",
  warning: "border-warning-border bg-warning-bg text-warning",
  brand: "border-teal-200 bg-teal-50 text-teal-700",
  accent: "border-accent/25 bg-accent-bg text-accent",
  neutral: "border-line bg-surface text-fg-body",
  critical: "border-critical-border bg-critical-bg text-critical",
};

/**
 * One node renderer for every kind.
 *
 * Shape carries meaning here — a diamond reads as a decision without anyone
 * having to read the label — so kind drives geometry rather than only colour.
 */
export function DiagramNode({ data, selected }: NodeProps<Node<DiagramNodeData>>) {
  const meta = DIAGRAM_NODE_KIND_META[data.kind];
  const tone = TONE_STYLES[meta.tone] ?? TONE_STYLES.neutral;

  const handles = (
    <>
      <Handle type="target" position={Position.Left} className="!size-2 !border-2 !bg-navy-300" />
      <Handle type="source" position={Position.Right} className="!size-2 !border-2 !bg-navy-300" />
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!size-2 !border-2 !bg-navy-300"
      />
      <Handle
        type="target"
        id="top"
        position={Position.Top}
        className="!size-2 !border-2 !bg-navy-300"
      />
    </>
  );

  const ring = selected ? "ring-2 ring-teal-500/40 ring-offset-1" : "";

  if (meta.shape === "diamond") {
    return (
      <div className={cn("relative flex size-32 items-center justify-center", ring && "rounded-sm")}>
        {handles}
        <div
          className={cn(
            "absolute inset-0 rotate-45 rounded-md border shadow-xs transition-shadow",
            tone,
            selected && "ring-2 ring-teal-500/40",
          )}
        />
        <div className="relative z-10 max-w-[86px] px-1 text-center">
          <p className="text-[10px] leading-3.5 font-medium break-words text-fg">
            {data.label}
          </p>
        </div>
      </div>
    );
  }

  if (meta.shape === "pill") {
    return (
      <div
        className={cn(
          "relative flex items-center gap-1.5 rounded-full border px-3.5 py-2 shadow-xs",
          tone,
          ring,
        )}
      >
        {handles}
        <Icon name={meta.icon} className="size-3 shrink-0" />
        <span className="text-[11px] leading-4 font-semibold whitespace-nowrap">
          {data.label}
        </span>
      </div>
    );
  }

  // A sticky is deliberately the least formal thing on any canvas: no icon, no
  // border, a square-ish block of colour that reads as handwriting rather than
  // documentation. Whiteboards are made almost entirely of these.
  if (meta.shape === "sticky") {
    return (
      <div
        className={cn(
          "relative flex min-h-28 w-44 items-start rounded-sm bg-warning-bg px-3 py-2.5 shadow-sm",
          "border-b-2 border-warning-border/60",
          ring,
        )}
      >
        {handles}
        <div className="min-w-0">
          <p className="text-[12px] leading-4.5 font-medium break-words text-fg">
            {data.label}
          </p>
          {data.description && (
            <p className="mt-1 text-[10px] leading-3.5 break-words text-fg-muted">
              {data.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (meta.shape === "note") {
    return (
      <div
        className={cn(
          "relative max-w-52 rounded-sm border border-warning-border bg-warning-bg/60 px-2.5 py-2 shadow-xs",
          ring,
        )}
      >
        {handles}
        <p className="text-[10px] leading-4 text-fg-body italic">{data.label}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-44 rounded-md border px-2.5 py-2 shadow-xs transition-shadow",
        tone,
        ring,
      )}
    >
      {handles}
      <div className="flex items-start gap-2">
        <Icon name={meta.icon} className="mt-px size-3.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] leading-4 font-semibold text-fg">{data.label}</p>
          {data.description && (
            <p className="mt-0.5 line-clamp-2 text-[9px] leading-3 text-fg-muted">
              {data.description}
            </p>
          )}
        </div>
      </div>
      {data.systemId && (
        <span
          className={cn(
            "absolute -top-1 -right-1 size-2 rounded-full ring-2 ring-surface",
            data.systemHealthy ? "bg-teal-500" : "bg-warning",
          )}
          title={data.systemHealthy ? "Linked system is healthy" : "Linked system is not operational"}
        />
      )}
    </div>
  );
}

export const diagramNodeTypes = { diagram: DiagramNode };
