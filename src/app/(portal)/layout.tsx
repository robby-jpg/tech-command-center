import type { Metadata } from "next";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { PortalViewerProvider } from "@/components/portal/portal-context";
import { PortalShell } from "@/components/portal/portal-shell";

export const metadata: Metadata = {
  title: { default: "Technology Help", template: "%s · Technology Help" },
};

/**
 * The Employee Portal's shell.
 *
 * A sibling of the Command Center group rather than a page inside it: the two
 * share the workspace snapshot from the root layout and nothing else. Lifting
 * this into the Sales, Project Consultant or Production portal means taking
 * this folder, `components/portal`, `lib/portal.ts` and `domain/portal.ts`, and
 * pointing PortalViewerProvider at that application's session.
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  // The viewer is read from the URL, which puts useSearchParams below this.
  return (
    <Suspense>
      <PortalViewerProvider>
        <PortalShell>{children}</PortalShell>
      </PortalViewerProvider>
    </Suspense>
  );
}
