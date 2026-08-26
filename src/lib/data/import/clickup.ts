import {
  DEFAULT_SLA_CONFIG,
  departmentForClickUpList,
  slaDeadline,
  slaTargetFor,
  type BusinessImpact,
  type Task,
  type TaskStatus,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type Urgency,
} from "@/domain";
import { userByClickUpId, userBySlackHandle } from "../mock/users";

/**
 * ClickUp import.
 *
 * This is the durable half of getting real data into the application: the
 * shapes ClickUp returns, and the rules for turning them into domain records.
 * It runs today against a captured snapshot and will run unchanged against the
 * live API — the only thing that changes is where the array comes from.
 *
 * Two things about the source data are worth stating plainly, because they
 * decide most of what follows:
 *
 *  1. **There is no description field.** ClickUp's `name` holds the entire
 *     request, sometimes eighty words of it. Title and description have to be
 *     split back apart here.
 *
 *  2. **There are two eras of ticket.** Newer ones arrive through a Slack
 *     intake form and carry requester, request type, impact and priority as
 *     text inside that name. Older ones are a raw pasted message with none of
 *     it. The parser handles both and is honest about which it got.
 */

/* -------------------------------------------------------------------------- */
/* The shape ClickUp returns                                                  */
/* -------------------------------------------------------------------------- */

export type ClickUpTask = {
  id: string;
  name: string;
  status: string;
  url: string;
  priority: string | null;
  assignees: { id: number; username: string }[];
  tags: { name: string }[];
  /** Epoch milliseconds, as a string. ClickUp sends these as strings. */
  due_date: string | null;
  date_closed: string | null;
  date_created?: string | null;
  list: { id: string; name: string };
};

/* -------------------------------------------------------------------------- */
/* The intake form                                                            */
/* -------------------------------------------------------------------------- */

export type ParsedIntake = {
  /** True when the ticket came through the structured Slack form. */
  structured: boolean;
  requesterHandle: string | null;
  requestType: "Outage" | "Support" | "Request" | null;
  impact: string | null;
  statedPriority: "High" | "Medium" | "Low" | null;
  title: string;
  description: string;
};

const INTAKE_HEADER = /TICKET SUBMITTED BY\s+@?([\w.\-]+)/i;

/** Pulls the body of one `*Label:*` section out of the intake template. */
function section(text: string, label: string): string | null {
  const pattern = new RegExp(
    `\\*${label}:\\*\\s*\\n?([\\s\\S]*?)(?=\\n\\s*\\*[A-Za-z ]+:\\*|$)`,
    "i",
  );
  const match = pattern.exec(text);
  const value = match?.[1]?.trim();
  return value ? value : null;
}

/**
 * Splits a raw ClickUp name into a scannable title and the rest.
 *
 * A ticket list is unreadable when every row is a paragraph, so the first
 * sentence becomes the title and the whole original text is kept as the
 * description. Nothing is discarded.
 */
function splitRawText(text: string): { title: string; description: string } {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 96) return { title: clean, description: "" };

  // Prefer a sentence boundary; fall back to a word boundary near the limit.
  const sentenceEnd = clean.slice(0, 120).search(/[.!?]\s/);
  const cut =
    sentenceEnd > 24
      ? sentenceEnd + 1
      : clean.lastIndexOf(" ", 92) > 40
        ? clean.lastIndexOf(" ", 92)
        : 92;

  return {
    title: `${clean.slice(0, cut).trim().replace(/[,;:]$/, "")}…`,
    description: text.trim(),
  };
}

export function parseIntake(name: string): ParsedIntake {
  const header = INTAKE_HEADER.exec(name);

  if (!header) {
    const { title, description } = splitRawText(name);
    return {
      structured: false,
      requesterHandle: null,
      requestType: null,
      impact: null,
      statedPriority: null,
      title,
      description,
    };
  }

  const request = section(name, "Request");
  const requestType = section(name, "Request Type");
  const impact = section(name, "Impact");
  const priority = section(name, "Priority");

  const { title, description } = splitRawText(request ?? name);

  return {
    structured: true,
    requesterHandle: header[1] ?? null,
    requestType:
      requestType === "Outage" || requestType === "Support" || requestType === "Request"
        ? requestType
        : null,
    impact,
    statedPriority:
      priority === "High" || priority === "Medium" || priority === "Low"
        ? priority
        : null,
    // Keep the full original when the request itself was long enough to split.
    title,
    description: description || (request && request !== title ? request : ""),
  };
}

/* -------------------------------------------------------------------------- */
/* Field mapping                                                              */
/* -------------------------------------------------------------------------- */

/**
 * ClickUp statuses, including the misspelling that is genuinely in the
 * workspace. Mapping it rather than correcting it upstream means the import
 * keeps working whether or not anybody ever fixes it.
 */
const STATUS_MAP: Record<string, TicketStatus> = {
  recieved: "new",
  received: "new",
  "to do": "triaged",
  planning: "triaged",
  idea: "triaged",
  "in progress": "in_progress",
  blocked: "blocked",
  review: "testing",
  testing: "testing",
  complete: "resolved",
  completed: "resolved",
  closed: "resolved",
  "not doing": "resolved",
};

export function mapStatus(clickUpStatus: string): TicketStatus {
  return STATUS_MAP[clickUpStatus.trim().toLowerCase()] ?? "new";
}

/**
 * Category, inferred from what the request talks about.
 *
 * ClickUp has no category field, so this is the only way to get one without
 * asking somebody to re-triage several hundred tickets. Order matters — the
 * first match wins, so the more specific systems are listed first.
 */
const CATEGORY_PATTERNS: [TicketCategory, RegExp][] = [
  ["bart", /\bbart\b|crew sheet|elevation|measure(ment)?s?\b|3\.[23]\b/i],
  ["microsoft_fabric", /\bfabric\b|lakehouse|\betl\b|\belt\b|silver stage|bronze/i],
  ["power_bi", /power ?bi|looker|scorecard|dashboard|report(ing)?\b/i],
  ["zapier", /\bzap(s|ier|ping)?\b|automation/i],
  ["website", /gravity form|website|landing page|\bkhp\b.*form/i],
  ["accounts", /passkey|password|log ?in|sign ?in|\bmfa\b|email account|username/i],
  [
    "permissions",
    // "add X to the crew slack channel" is not a permissions request, so the
    // "add … to" shape has to name something access-like to count.
    /permission|\baccess\b|profile|licen[cs]e|share.*drive|add .{0,30}\b(to|into)\b .{0,20}(salesforce|pandadoc|hubstaff|jotform|the roster|drive|scorecard)/i,
  ],
  ["hardware", /laptop|monitor|dock|keyboard|printer|hardware/i],
  ["salesforce", /salesforce|\bsf\b|opportunit|\blead\b|contact|account|record type|field/i],
];

export function inferCategory(text: string): TicketCategory {
  for (const [category, pattern] of CATEGORY_PATTERNS) {
    if (pattern.test(text)) return category;
  }
  return "other";
}

/** Impact wording from the intake form, mapped onto the domain scale. */
export function mapImpact(impact: string | null): BusinessImpact {
  if (!impact) return "individual";
  const text = impact.toLowerCase();
  if (text.includes("cannot work")) return "department";
  if (text.includes("major slowdown")) return "team";
  if (text.includes("minor")) return "individual";
  return "individual";
}

/**
 * Priority.
 *
 * The form's own High/Medium/Low is the starting point, but an outage that
 * stops people working is Critical regardless of what was ticked — the whole
 * point of reserving Critical is that it reflects operational impact rather
 * than how the request was worded.
 */
export function mapPriority(parsed: ParsedIntake): TicketPriority {
  const stopsWork = parsed.impact?.toLowerCase().includes("cannot work") ?? false;

  if (parsed.requestType === "Outage" && (stopsWork || parsed.statedPriority === "High")) {
    return "critical";
  }
  if (parsed.statedPriority === "High") return "high";
  if (parsed.statedPriority === "Low") return "low";
  if (parsed.statedPriority === "Medium") return "normal";
  if (parsed.requestType === "Outage") return "high";
  return "normal";
}

export function mapUrgency(parsed: ParsedIntake): Urgency {
  if (parsed.impact?.toLowerCase().includes("cannot work")) return "immediate";
  if (parsed.requestType === "Outage") return "urgent";
  if (parsed.statedPriority === "High") return "urgent";
  if (parsed.statedPriority === "Low") return "can_wait";
  return "soon";
}

const TASK_STATUS_MAP: Record<string, TaskStatus> = {
  "to do": "todo",
  planning: "todo",
  idea: "todo",
  "in progress": "in_progress",
  blocked: "blocked",
  review: "review",
  complete: "done",
  completed: "done",
  "not doing": "done",
};

export function mapTaskStatus(clickUpStatus: string): TaskStatus {
  return TASK_STATUS_MAP[clickUpStatus.trim().toLowerCase()] ?? "todo";
}

/* -------------------------------------------------------------------------- */
/* Mappers                                                                    */
/* -------------------------------------------------------------------------- */

function epoch(value: string | null | undefined): string | null {
  if (!value) return null;
  const ms = Number(value);
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null;
}

export type ImportWarning = {
  clickUpId: string;
  field: string;
  reason: string;
};

export type TicketImportResult = {
  tickets: Ticket[];
  warnings: ImportWarning[];
  stats: {
    total: number;
    structured: number;
    unstructured: number;
    requesterResolved: number;
    requesterUnknown: number;
  };
};

/**
 * Turns ClickUp tasks from the IT Tickets folder into domain tickets.
 *
 * `fallbackCreatedAt` exists because ClickUp's filter endpoint does not return
 * a creation date. The due date is the closest available proxy — the intake
 * automation sets it from the moment the request arrives — and where even that
 * is missing the ticket is dated from its closure. Every substitution is
 * recorded as a warning rather than silently assumed, so the gap is visible
 * rather than baked in.
 */
export function importTickets(
  tasks: ClickUpTask[],
  options: { ticketNumberStart?: number; now?: Date } = {},
): TicketImportResult {
  const now = options.now ?? new Date();
  const warnings: ImportWarning[] = [];
  const tickets: Ticket[] = [];
  let number = options.ticketNumberStart ?? 1000;
  let structured = 0;
  let requesterResolved = 0;

  // Oldest first, so ticket numbers ascend the way a real sequence would.
  const ordered = [...tasks].sort(
    (a, b) => Number(a.due_date ?? 0) - Number(b.due_date ?? 0),
  );

  for (const task of ordered) {
    const parsed = parseIntake(task.name);
    if (parsed.structured) structured += 1;

    // The due date doubles as a creation proxy only while it is in the past.
    // On the newest tickets the intake automation sets it a day or two ahead,
    // and taking it literally produced tickets that claimed to have been
    // created tomorrow — negative ages and "updated in 7 hours".
    const dueEpoch = epoch(task.due_date);
    const dueIsFuture = dueEpoch !== null && new Date(dueEpoch) > now;

    const createdAt =
      epoch(task.date_created) ??
      (dueIsFuture ? null : dueEpoch) ??
      epoch(task.date_closed) ??
      (dueIsFuture ? now.toISOString() : null);

    if (!createdAt) {
      warnings.push({
        clickUpId: task.id,
        field: "createdAt",
        reason: "No creation, due or close date. Ticket skipped.",
      });
      continue;
    }
    if (!task.date_created) {
      warnings.push({
        clickUpId: task.id,
        field: "createdAt",
        reason: dueIsFuture
          ? "No creation date, and the due date is in the future. Dated from now."
          : "ClickUp did not return a creation date; used the due date.",
      });
    }

    const requester = parsed.requesterHandle
      ? userBySlackHandle(parsed.requesterHandle)
      : null;
    if (requester) requesterResolved += 1;
    else if (parsed.requesterHandle) {
      warnings.push({
        clickUpId: task.id,
        field: "requester",
        reason: `Unknown Slack handle "@${parsed.requesterHandle}".`,
      });
    }

    const assignee = task.assignees[0]
      ? userByClickUpId(task.assignees[0].id)
      : null;

    const status = mapStatus(task.status);
    const resolvedAt = status === "resolved" ? epoch(task.date_closed) : null;
    const priority = mapPriority(parsed);
    const target = slaTargetFor(priority, DEFAULT_SLA_CONFIG);
    const department = departmentForClickUpList(task.list.name);

    number += 1;

    tickets.push({
      id: `t-cu-${task.id}`,
      ticketNumber: `KHT-${number}`,
      title: parsed.title,
      description: parsed.description,
      status,
      priority,
      category: inferCategory(task.name),
      // Where the form did not name a requester, the department that owns the
      // list is the only thing we know. Attributing it to a specific person
      // would be a guess.
      requesterId: requester?.id ?? null,
      requesterDepartment: department,
      assigneeId: assignee?.id ?? null,
      createdAt,
      updatedAt: resolvedAt ?? createdAt,
      // ClickUp records no first-response time. Anything resolved was clearly
      // responded to, so resolution stands in; open tickets are left null
      // rather than inventing one.
      firstResponseAt: resolvedAt,
      resolvedAt,
      // Only a real deadline when it is still ahead of us; otherwise it was
      // standing in for the creation date and is not a due date at all.
      dueDate: dueIsFuture ? dueEpoch : null,
      slaDueAt: slaDeadline(
        target,
        new Date(createdAt),
        target.resolutionMinutes,
      ).toISOString(),
      estimatedEffortHours: null,
      actualTimeSpentHours: null,
      businessImpact: mapImpact(parsed.impact),
      urgency: mapUrgency(parsed),
      source: parsed.structured ? "slack" : "other",
      tags: task.tags.map((t) => t.name),
      relatedSystemIds: [],
      relatedProjectId: null,
      relatedTicketIds: [],
      relatedArticleIds: [],
      attachments: [],
      watcherIds: [],
      reopenCount: 0,
      externalRefs: [
        {
          source: "clickup" as const,
          // Reconciliation may demote this to a mirror once a Slack original
          // is found for it.
          role: "origin" as const,
          id: task.id,
          url: task.url,
          label: task.list.name,
          commentCount: null,
        },
      ],
    });
  }

  return {
    tickets,
    warnings,
    stats: {
      total: tickets.length,
      structured,
      unstructured: tickets.length - structured,
      requesterResolved,
      requesterUnknown: tickets.length - requesterResolved,
    },
  };
}

/** Turns ClickUp tasks from a project list into domain tasks. */
export function importTasks(tasks: ClickUpTask[], projectId: string): Task[] {
  return tasks.map((task, index) => ({
    id: `tk-cu-${task.id}`,
    projectId,
    parentTaskId: null,
    milestoneId: null,
    title: task.name.replace(/\s+/g, " ").trim(),
    description: "",
    ownerId: task.assignees[0]
      ? (userByClickUpId(task.assignees[0].id)?.id ?? null)
      : null,
    status: mapTaskStatus(task.status),
    priority:
      task.priority === "urgent" || task.priority === "high"
        ? "high"
        : task.priority === "low"
          ? "low"
          : "normal",
    dueDate: epoch(task.due_date),
    estimatedHours: null,
    actualHours: null,
    dependsOnTaskIds: [],
    createdAt: epoch(task.due_date) ?? new Date().toISOString(),
    updatedAt: epoch(task.date_closed) ?? epoch(task.due_date) ?? new Date().toISOString(),
    order: index + 1,
  }));
}
