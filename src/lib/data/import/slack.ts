import {
  DEFAULT_SLA_CONFIG,
  slaDeadline,
  slaTargetFor,
  type BusinessImpact,
  type DepartmentKey,
  type Ticket,
  type TicketPriority,
  type Urgency,
} from "@/domain";
import { userBySlackId } from "../mock/users";
import { inferCategory } from "./clickup";

/**
 * Slack intake import.
 *
 * Requests are raised through a per-department form in Slack, which posts a
 * structured message into `#it-ticketing-{cams,production,sales,sdr}`. Those
 * messages are the originals. A Zapier automation copies each one into ClickUp,
 * and that copy loses most of what the form captured — the submitter, the
 * request type, the impact and the stated priority all become part of one
 * unattributed blob of text.
 *
 * So Slack is the source of truth for *what was asked and by whom*.
 *
 * It is not the source of truth for everything. Slack has no notion of status:
 * nothing in the channel says whether a request was ever done. That lives only
 * in ClickUp. Neither system is complete on its own, which is why the two are
 * reconciled rather than one being picked — see `reconcile.ts`.
 */

export type SlackIntakeMessage = {
  /** Message timestamp, seconds with microseconds. The join key to ClickUp. */
  ts: string;
  channelId: string;
  channelName: string;
  /** CAM, PM, EST or SDR — which form was used. */
  formName: string;
  department: string;
  submitterSlackId: string;
  requestType: string;
  request: string;
  impact: string;
  statedPriority: "High" | "Medium" | "Low";
  replyCount: number;
  permalink: string;
};

/* -------------------------------------------------------------------------- */
/* Field mapping                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The form allows more than one impact to be ticked, so "Cannot work at all,
 * Major slowdown" is a real answer. The most severe wins.
 */
export function mapSlackImpact(impact: string): BusinessImpact {
  const text = impact.toLowerCase();
  if (text.includes("cannot work")) return "department";
  if (text.includes("major slowdown")) return "team";
  return "individual";
}

/**
 * Priority.
 *
 * The form's own answer is the starting point, but an outage that stops people
 * working is Critical whatever was ticked. Reserving Critical for genuine
 * operational impact only works if it reflects impact rather than wording —
 * and a lot of requesters tick High out of politeness.
 */
export function mapSlackPriority(message: SlackIntakeMessage): TicketPriority {
  const isOutage = /outage/i.test(message.requestType);
  const stopsWork = message.impact.toLowerCase().includes("cannot work");

  if (isOutage && stopsWork) return "critical";
  if (message.statedPriority === "High") return "high";
  if (message.statedPriority === "Low") return "low";
  if (isOutage) return "high";
  return "normal";
}

export function mapSlackUrgency(message: SlackIntakeMessage): Urgency {
  if (message.impact.toLowerCase().includes("cannot work")) return "immediate";
  if (/outage/i.test(message.requestType)) return "urgent";
  if (message.statedPriority === "High") return "urgent";
  if (message.statedPriority === "Low") return "can_wait";
  return "soon";
}

/** Splits a request body into a scannable title and the remainder. */
function splitRequest(text: string): { title: string; description: string } {
  const firstLine = text.split("\n")[0]?.trim() ?? text.trim();
  const collapsed = firstLine.replace(/\s+/g, " ");
  const hasMore = text.trim().length > firstLine.length;

  if (collapsed.length <= 96) {
    return { title: collapsed, description: hasMore ? text.trim() : "" };
  }

  const sentenceEnd = collapsed.slice(0, 120).search(/[.!?]\s/);
  const cut =
    sentenceEnd > 24
      ? sentenceEnd + 1
      : collapsed.lastIndexOf(" ", 92) > 40
        ? collapsed.lastIndexOf(" ", 92)
        : 92;

  return {
    title: `${collapsed.slice(0, cut).trim().replace(/[,;:]$/, "")}…`,
    description: text.trim(),
  };
}

/* -------------------------------------------------------------------------- */
/* Import                                                                     */
/* -------------------------------------------------------------------------- */

export type SlackImportResult = {
  tickets: Ticket[];
  /** Slack ids seen on a request that match nobody in the directory. */
  unknownSubmitters: string[];
};

/**
 * Turns intake messages into tickets.
 *
 * Status is deliberately left as `new` and `resolvedAt` as null: Slack does not
 * know. Reconciliation fills both in from the ClickUp mirror where one exists,
 * and anything with no mirror is genuinely unknown rather than assumed open.
 */
export function importSlackIntake(
  messages: SlackIntakeMessage[],
): SlackImportResult {
  const unknownSubmitters = new Set<string>();

  const tickets = messages.map((message) => {
    const submitter = userBySlackId(message.submitterSlackId);
    if (!submitter) unknownSubmitters.add(message.submitterSlackId);

    const createdAt = new Date(Number(message.ts) * 1000).toISOString();
    const priority = mapSlackPriority(message);
    const target = slaTargetFor(priority, DEFAULT_SLA_CONFIG);
    const { title, description } = splitRequest(message.request);

    return {
      id: `t-sl-${message.ts.replace(".", "-")}`,
      // Placeholder; reconciliation assigns the real sequence once both
      // sources have been merged and counted.
      ticketNumber: "KHT-0000",
      title,
      description,
      status: "new" as const,
      priority,
      category: inferCategory(message.request),
      requesterId: submitter?.id ?? null,
      requesterDepartment: message.department as DepartmentKey,
      assigneeId: null,
      createdAt,
      updatedAt: createdAt,
      firstResponseAt: null,
      resolvedAt: null,
      dueDate: null,
      slaDueAt: slaDeadline(
        target,
        new Date(createdAt),
        target.resolutionMinutes,
      ).toISOString(),
      estimatedEffortHours: null,
      actualTimeSpentHours: null,
      businessImpact: mapSlackImpact(message.impact),
      urgency: mapSlackUrgency(message),
      source: "slack" as const,
      tags: [
        message.formName.toLowerCase(),
        ...message.requestType
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      ],
      relatedSystemIds: [],
      relatedProjectId: null,
      relatedTicketIds: [],
      relatedArticleIds: [],
      attachments: [],
      watcherIds: [],
      reopenCount: 0,
      externalRefs: [
        {
          source: "slack" as const,
          role: "origin" as const,
          id: message.ts,
          url: message.permalink,
          label: `#${message.channelName}`,
          // The conversation lives in that thread. Recorded so the ticket can
          // say so before the replies themselves are pulled across.
          commentCount: message.replyCount,
        },
      ],
    } satisfies Ticket;
  });

  return { tickets, unknownSubmitters: [...unknownSubmitters] };
}
