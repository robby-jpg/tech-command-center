"use client";

import * as React from "react";
import type { WorkspaceSnapshot } from "@/lib/data/types";
import { WorkspaceProvider } from "@/lib/store/workspace-store";
import { TooltipProvider } from "@/components/ui/primitives";

/**
 * State every surface needs, and nothing either of them can see.
 *
 * The Command Center and the Employee Portal are two different applications
 * reading the same working set: one is the department's own tooling, the other
 * is what the rest of the company sees. They share the data and the tooltip
 * layer; they share no chrome, no navigation and no assumption about who is
 * looking. That separation is why the portal can be lifted into a department's
 * own portal later without dragging this application behind it.
 */
export function AppProviders({
  snapshot,
  children,
}: {
  snapshot: WorkspaceSnapshot;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider initial={snapshot}>
      <TooltipProvider delayDuration={280} skipDelayDuration={120}>
        {children}
      </TooltipProvider>
    </WorkspaceProvider>
  );
}
