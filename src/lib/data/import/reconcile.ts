import type { ExternalRef, Ticket } from "@/domain";
import type { ClickUpTask } from "./clickup";

/**
 * Reconciling Slack originals against their ClickUp copies.
 *
 * A Zapier automation copies every Slack intake message into ClickUp, so the
 * same request exists twice. Importing both without reconciling would double
 * the department's ticket count, double its workload in every chart, and show
 * two rows for one problem.
 *
 * ## The join
 *
 * ClickUp's `due_date` on these tickets is not a due date. The automation
 * writes the Slack message timestamp into it. That makes the match exact rather
 * than fuzzy — no comparing text, no guessing at near-duplicates:
 *
 *     clickUpTask.due_date  ===  slackMessage.ts × 1000
 *
 * ## Which side wins
 *
 * Neither, entirely — and that is the point.
 *
 *   Slack knows   who asked, what they asked, the request type, the impact,
 *                 the stated priority, when it was raised, and how much
 *                 conversation followed.
 *   ClickUp knows whether it was ever done, when, and who it sat with.
 *
 * The ClickUp copy destroys the first set: the submitter becomes anonymous and
 * the form fields collapse into one blob of text. Slack never had the second.
 * So Slack is authoritative for identity and intent, ClickUp for state, and the
 * merged ticket is the first place both have existed together.
 */

const SECOND_MS = 1000;

export type ReconcileResult = {
  tickets: Ticket[];
  stats: {
    slackOnly: number;
    clickUpOnly: number;
    merged: number;
    /** How many rows the department would have seen without this step. */
    duplicatesCollapsed: number;
  };
};

/** ClickUp writes the Slack timestamp into `due_date`, in whole milliseconds. */
function slackKeyFromClickUp(task: ClickUpTask): string | null {
  if (!task.due_date) return null;
  const ms = Number(task.due_date);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return String(Math.floor(ms / SECOND_MS));
}

function slackKeyFromTicket(ticket: Ticket): string | null {
  const origin = ticket.externalRefs.find((r) => r.source === "slack");
  return origin ? String(Math.floor(Number(origin.id))) : null;
}

/**
 * Merges the two imports into one set of tickets.
 *
 * `clickUpTickets` must be the output of `importTickets`, and `clickUpTasks`
 * the raw tasks it came from — the raw side is needed because the join key
 * lives in a field the domain ticket deliberately does not keep.
 */
export function reconcile(
  slackTickets: Ticket[],
  clickUpTickets: Ticket[],
  clickUpTasks: ClickUpTask[],
  options: { ticketNumberStart?: number } = {},
): ReconcileResult {
  // Slack key → the ClickUp ticket that mirrors it.
  const mirrorByKey = new Map<string, Ticket>();
  const taskById = new Map(clickUpTasks.map((t) => [t.id, t]));

  for (const ticket of clickUpTickets) {
    const clickUpRef = ticket.externalRefs.find((r) => r.source === "clickup");
    const task = clickUpRef ? taskById.get(clickUpRef.id) : undefined;
    const key = task ? slackKeyFromClickUp(task) : null;
    if (key) mirrorByKey.set(key, ticket);
  }

  const claimedMirrors = new Set<string>();
  const merged: Ticket[] = [];

  for (const slackTicket of slackTickets) {
    const key = slackKeyFromTicket(slackTicket);
    const mirror = key ? mirrorByKey.get(key) : undefined;

    if (!mirror) {
      merged.push(slackTicket);
      continue;
    }

    const mirrorRef = mirror.externalRefs.find((r) => r.source === "clickup");
    if (mirrorRef) claimedMirrors.add(mirrorRef.id);

    const refs: ExternalRef[] = [
      ...slackTicket.externalRefs,
      ...(mirrorRef ? [{ ...mirrorRef, role: "mirror" as const }] : []),
    ];

    merged.push({
      ...slackTicket,
      // ── From ClickUp: the lifecycle Slack has no record of ──────────────
      status: mirror.status,
      resolvedAt: mirror.resolvedAt,
      firstResponseAt: mirror.firstResponseAt,
      assigneeId: mirror.assigneeId,
      updatedAt: mirror.updatedAt,
      // ── From Slack, kept: everything about who asked and what for ───────
      // requesterId, priority, businessImpact, urgency, title, description
      // and category all stay as the intake form recorded them.
      externalRefs: refs,
      // Union of both sides' system links; the ClickUp side was inferred from
      // the same text so this rarely differs, but losing a link would be worse
      // than carrying a duplicate one.
      relatedSystemIds: Array.from(
        new Set([...slackTicket.relatedSystemIds, ...mirror.relatedSystemIds]),
      ),
      tags: Array.from(new Set([...slackTicket.tags, ...mirror.tags])),
    });
  }

  // ClickUp tickets with no Slack original. These predate the intake channels
  // or were pasted in directly, and they are genuinely their own tickets.
  const clickUpOnly = clickUpTickets.filter((ticket) => {
    const ref = ticket.externalRefs.find((r) => r.source === "clickup");
    return ref ? !claimedMirrors.has(ref.id) : true;
  });

  const all = [...merged, ...clickUpOnly].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

  // One sequence across the merged set, oldest first, so numbers ascend the
  // way a real ticket sequence would.
  let number = options.ticketNumberStart ?? 1000;
  const numbered = all.map((ticket) => {
    number += 1;
    return { ...ticket, ticketNumber: `KHT-${number}` };
  });

  return {
    tickets: numbered,
    stats: {
      slackOnly: merged.length - claimedMirrors.size,
      clickUpOnly: clickUpOnly.length,
      merged: claimedMirrors.size,
      duplicatesCollapsed: claimedMirrors.size,
    },
  };
}
