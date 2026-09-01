"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@/domain";
import { useSnapshot } from "@/lib/store/workspace-store";
import { previewablePeople } from "@/lib/portal";

/**
 * Who the portal thinks it is talking to.
 *
 * This is the single seam between the portal and identity, and it is the only
 * file that has to change when the portal moves into a department's own
 * application: over there the viewer arrives from that portal's session, and
 * everything below reads it from here without noticing the difference.
 *
 * Today there is no authentication anywhere in this application, so the viewer
 * comes from a `?as=` parameter and a switcher in the preview bar. That is not
 * a security model and is not pretending to be one — it is how the Tech
 * Department looks at what somebody else would see. The check that actually
 * matters, `canViewRequest`, is enforced on every request either way.
 */

type PortalViewerContext = {
  viewer: User;
  /** Everyone who can be previewed, most-requests-first. */
  people: { user: User; requestCount: number }[];
  setViewer: (userId: string) => void;
  /** True while the portal is being previewed from inside the Command Center. */
  previewing: boolean;
};

const Ctx = React.createContext<PortalViewerContext | null>(null);

export function usePortalViewer(): PortalViewerContext {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("usePortalViewer must be used inside <PortalViewerProvider>.");
  return ctx;
}

/**
 * Who the portal opens as when nobody has chosen.
 *
 * Not the signed-in user, on purpose. The Tech Department raises almost nothing
 * through the ticket queue, so opening the portal as a Tech person shows a
 * blank page and says nothing about what the portal is for. It opens instead as
 * the person with the most requests, and the preview bar says whose view it is.
 */
function defaultViewer(people: { user: User; requestCount: number }[]): User {
  return (people.find((p) => !p.user.isTechTeam && p.requestCount > 0) ?? people[0]).user;
}

export function PortalViewerProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSnapshot();
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("as");

  const people = React.useMemo(() => previewablePeople(snapshot), [snapshot]);

  const viewer =
    (requested ? people.find((p) => p.user.id === requested)?.user : null) ??
    defaultViewer(people);

  const setViewer = React.useCallback(
    (userId: string) => {
      const next = new URLSearchParams(params.toString());
      next.set("as", userId);
      // Switching who you are previewing should not send you back through the
      // requests you were reading as somebody else.
      router.push(`/portal?${next.toString()}`);
    },
    [params, router],
  );

  const value = React.useMemo(
    () => ({ viewer, people, setViewer, previewing: true }),
    [viewer, people, setViewer],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Keeps `?as=` on internal portal links so the preview survives navigation. */
export function usePortalHref(): (path: string) => string {
  const { viewer } = usePortalViewer();
  return React.useCallback(
    (path: string) => `${path}?as=${encodeURIComponent(viewer.id)}`,
    [viewer.id],
  );
}
