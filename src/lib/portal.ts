import {
  DEPARTMENTS,
  isActivityVisibleToRequester,
  isVisibleToRequester,
  requesterStage,
  toPortalProject,
  toPortalTicket,
  type DepartmentKey,
  type PortalProject,
  type PortalTicket,
  type Project,
  type RequesterStage,
  type TicketActivity,
  type TicketComment,
  type User,
} from "@/domain";
import type { WorkspaceSnapshot } from "./data/types";
import { sortBy } from "./utils";

/**
 * Everything the Employee Portal reads.
 *
 * Deliberately its own module rather than more of `selectors.ts`. The portal is
 * meant to be lifted out of this application and dropped into the Sales,
 * Project Consultant and Production portals; when that happens this file, the
 * `portal` domain module and `components/portal` go with it, and nothing else
 * has to. A selector shared with the Command Center would quietly undo that.
 *
 * Every function here takes the viewer explicitly. None of them read
 * `snapshot.currentUserId` — in a department's own portal the viewer is whoever
 * signed in over there, and a portal that assumes it is being looked at by the
 * Tech Department is a portal that cannot move.
 */

const RESOLVED_WINDOW_DAYS = 45;

/* -------------------------------------------------------------------------- */
/* Scope                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Whose requests the viewer is looking at.
 *
 * `mine` is what a portal normally shows. `department` exists because of an
 * awkward fact about the data: most of the imported tickets have no requester
 * at all — ClickUp's copy of the intake form threw the name away, so all that
 * is known is the list it landed in. Those requests are real, they are
 * somebody's, and under a `mine`-only portal nobody would ever see them again.
 *
 * It is also the more useful lens for a manager, and it is how somebody finds
 * out their problem has already been reported.
 */
export type PortalScope = "mine" | "department";

export const PORTAL_SCOPE_META: Record<
  PortalScope,
  { label: string; description: string }
> = {
  mine: {
    label: "My requests",
    description: "Requests raised in your name.",
  },
  department: {
    label: "My department",
    description: "Every request from your team, however it was raised.",
  },
};

/* -------------------------------------------------------------------------- */
/* The view                                                                   */
/* -------------------------------------------------------------------------- */

export type PortalGroup = {
  stage: RequesterStage;
  tickets: PortalTicket[];
};

export type PortalView = {
  viewer: User;
  scope: PortalScope;
  departmentName: string;
  /** Open requests grouped by stage, in ladder order, empty groups dropped. */
  groups: PortalGroup[];
  /** Waiting on the viewer. Surfaced above everything else. */
  needsYou: PortalTicket[];
  /** Open requests, however far along. */
  open: PortalTicket[];
  /** Finished inside the recent window; older ones stay searchable, not shown. */
  recentlyDone: PortalTicket[];
  counts: { open: number; needsYou: number; done: number; unattributed: number };
  /** True when the viewer personally has nothing but their department does. */
  emptyForViewer: boolean;
};

type ScopedTicket = { requesterId: string | null; requesterDepartment: DepartmentKey };

/**
 * The teams a request belongs to.
 *
 * Two departments, not one, because `requesterDepartment` does not mean what
 * its name suggests: it is the ClickUp list the request landed in, which is
 * often not the team the person asking is on. Lindsay Jo is Production and four
 * of her five open requests are filed under Leadership.
 *
 * Reading only the field would hide a teammate's request from their own team.
 * Reading only the requester's department would lose the 127 imported tickets
 * that have no requester at all. Both, and a request is your team's if either
 * says so.
 *
 * Worth revisiting once intake goes through this portal rather than through
 * ClickUp — a submission from here carries the submitter, so the two answers
 * stop disagreeing.
 */
function teamsFor(snap: WorkspaceSnapshot, ticket: ScopedTicket): Set<DepartmentKey> {
  const teams = new Set<DepartmentKey>([ticket.requesterDepartment]);
  if (ticket.requesterId) {
    const requester = snap.users.find((u) => u.id === ticket.requesterId);
    if (requester) teams.add(requester.department);
  }
  return teams;
}

function inScope(
  snap: WorkspaceSnapshot,
  ticket: ScopedTicket,
  viewer: User,
  scope: PortalScope,
): boolean {
  if (scope === "mine") return ticket.requesterId === viewer.id;
  return teamsFor(snap, ticket).has(viewer.department);
}

export function portalView(
  snap: WorkspaceSnapshot,
  viewer: User,
  scope: PortalScope,
): PortalView {
  const cutoff =
    new Date(snap.now).getTime() - RESOLVED_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const visible = snap.tickets
    .filter((t) => inScope(snap, t, viewer, scope))
    .map(toPortalTicket);

  const open = sortBy(
    visible.filter((t) => t.stage !== "done"),
    // Anything waiting on the viewer comes first — it is the only thing on the
    // page they can actually do something about.
    (a, b) => Number(b.stage === "needs_you") - Number(a.stage === "needs_you"),
    (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  );

  const done = sortBy(
    visible.filter((t) => t.stage === "done"),
    (a, b) => (b.resolvedAt ?? b.updatedAt).localeCompare(a.resolvedAt ?? a.updatedAt),
  );

  const recentlyDone = done.filter(
    (t) => new Date(t.resolvedAt ?? t.updatedAt).getTime() >= cutoff,
  );

  const needsYou = open.filter((t) => t.stage === "needs_you");

  const mineCount = snap.tickets.filter((t) => t.requesterId === viewer.id).length;
  const deptCount = snap.tickets.filter((t) =>
    inScope(snap, t, viewer, "department"),
  ).length;

  const groups: PortalGroup[] = (["needs_you", "in_progress", "received"] as const)
    .map((stage) => ({ stage, tickets: open.filter((t) => t.stage === stage) }))
    .filter((g) => g.tickets.length > 0);

  return {
    viewer,
    scope,
    departmentName: DEPARTMENTS[viewer.department].name,
    groups,
    needsYou,
    open,
    recentlyDone,
    counts: {
      open: open.length,
      needsYou: needsYou.length,
      done: done.length,
      unattributed: visible.filter((t) => t.requesterId === null).length,
    },
    emptyForViewer: mineCount === 0 && deptCount > 0,
  };
}

/* -------------------------------------------------------------------------- */
/* One request                                                                */
/* -------------------------------------------------------------------------- */

export type PortalTimelineEntry =
  | { type: "comment"; at: string; comment: TicketComment; fromTech: boolean }
  | { type: "activity"; at: string; activity: TicketActivity };

export type PortalRequest = {
  ticket: PortalTicket;
  timeline: PortalTimelineEntry[];
  /** Set when the Tech team is waiting on a reply. Drives the reply prompt. */
  awaitingReply: boolean;
};

/**
 * Whether this viewer is allowed to open this request at all.
 *
 * The portal reads from the same snapshot the Command Center does, so a URL is
 * the only thing standing between somebody and any ticket in the company. This
 * is the check that makes a guessed id a not-found rather than a leak. It runs
 * on the client today because there is no server yet; when the data layer moves
 * behind Postgres it becomes the where-clause on the query, in one place.
 */
export function canViewRequest(
  snap: WorkspaceSnapshot,
  ticket: ScopedTicket,
  viewer: User,
): boolean {
  // Exactly the union of the two tabs, so a request that is listed can always
  // be opened and one that is not can never be reached by guessing at a URL.
  return (
    inScope(snap, ticket, viewer, "mine") ||
    inScope(snap, ticket, viewer, "department")
  );
}

export function portalRequest(
  snap: WorkspaceSnapshot,
  ticketId: string,
  viewer: User,
): PortalRequest | null {
  const raw = snap.tickets.find((t) => t.id === ticketId);
  if (!raw || !canViewRequest(snap, raw, viewer)) return null;

  const techTeam = new Set(snap.users.filter((u) => u.isTechTeam).map((u) => u.id));

  const entries: PortalTimelineEntry[] = [
    ...snap.ticketComments
      .filter((c) => c.ticketId === ticketId && isVisibleToRequester(c))
      .map((comment) => ({
        type: "comment" as const,
        at: comment.createdAt,
        comment,
        fromTech: techTeam.has(comment.authorId),
      })),
    ...snap.ticketActivity
      .filter((a) => a.ticketId === ticketId && isActivityVisibleToRequester(a))
      .map((activity) => ({
        type: "activity" as const,
        at: activity.createdAt,
        activity,
      })),
  ];

  return {
    ticket: toPortalTicket(raw),
    timeline: sortBy(entries, (a, b) => a.at.localeCompare(b.at)),
    awaitingReply: requesterStage(raw.status) === "needs_you",
  };
}

/* -------------------------------------------------------------------------- */
/* Who can be previewed                                                       */
/* -------------------------------------------------------------------------- */

/**
 * People to offer in the preview switcher, most-requests-first.
 *
 * Ordering by volume is not cosmetic. Previewing as somebody with no history
 * shows a correct but uninformative empty portal, and whoever is being shown
 * this needs to meet the populated case first.
 */
export function previewablePeople(
  snap: WorkspaceSnapshot,
): { user: User; requestCount: number }[] {
  const counts = new Map<string, number>();
  for (const t of snap.tickets) {
    if (t.requesterId) counts.set(t.requesterId, (counts.get(t.requesterId) ?? 0) + 1);
  }

  return sortBy(
    snap.users.map((user) => ({ user, requestCount: counts.get(user.id) ?? 0 })),
    (a, b) => b.requestCount - a.requestCount,
    (a, b) => a.user.name.localeCompare(b.user.name),
  );
}

/* -------------------------------------------------------------------------- */
/* Projects and the roadmap                                                   */
/* -------------------------------------------------------------------------- */

export type PortalRoadmap = {
  /** Projects the viewer is personally named on, first. */
  yours: PortalProject[];
  /** Everything else their department has a stake in. */
  department: PortalProject[];
  departmentName: string;
  /** Delivered work, held back from the main list — see the note below. */
  delivered: PortalProject[];
};

/**
 * Which projects a department has a stake in.
 *
 * `departmentsImpacted` is the field that ought to answer this, and on the
 * imported data it is empty on every project — nothing populated it, because
 * the ClickUp folders it came from do not carry the concept. Scoping on it
 * alone would show every department an empty roadmap, which is accurate about
 * the field and wrong about the business.
 *
 * So a project reaches a department three ways: the field says so; somebody
 * from that department is named on it; or that department has raised tickets
 * against it. The third is the one that carries the real data today, and it is
 * a fair definition of a stake — a team that keeps reporting problems with the
 * scorecards has an interest in the scorecards being rebuilt.
 *
 * As `departmentsImpacted` gets filled in, the first clause takes over and this
 * narrows on its own without anything here changing.
 */
function departmentStake(
  snap: WorkspaceSnapshot,
  project: Project,
  department: DepartmentKey,
): boolean {
  if (project.departmentsImpacted.includes(department)) return true;

  const named = [project.ownerId, ...project.contributorIds];
  if (named.some((id) => snap.users.find((u) => u.id === id)?.department === department)) {
    return true;
  }

  return snap.tickets.some(
    (t) => t.relatedProjectId === project.id && teamsFor(snap, t).has(department),
  );
}

/**
 * What one person sees of what Technology is building.
 *
 * Delivered projects are separated rather than dropped. "Did that ever ship?"
 * is a question people ask, and a roadmap that silently forgets everything it
 * finished reads as a department that never finishes anything.
 */
export function portalRoadmap(snap: WorkspaceSnapshot, viewer: User): PortalRoadmap {
  const named = (p: Project) =>
    p.ownerId === viewer.id || p.contributorIds.includes(viewer.id);

  const visible = snap.projects.filter(
    (p) => named(p) || departmentStake(snap, p, viewer.department),
  );

  const projected = visible.map((p) =>
    toPortalProject(p, viewer.id, named(p) ? "named" : "department"),
  );

  const rank: Record<PortalProject["stage"], number> = {
    arriving: 0,
    building: 1,
    considering: 2,
    done: 3,
  };

  const order = (a: PortalProject, b: PortalProject) => rank[a.stage] - rank[b.stage];

  const live = projected.filter((p) => p.stage !== "done");

  return {
    yours: sortBy(
      live.filter((p) => p.youAreOn),
      order,
    ),
    department: sortBy(
      live.filter((p) => !p.youAreOn),
      order,
    ),
    departmentName: DEPARTMENTS[viewer.department].name,
    delivered: projected.filter((p) => p.stage === "done"),
  };
}
