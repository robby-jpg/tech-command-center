import { z } from "zod";
import { entityId, isoDateTime, type Tone } from "./common";
import { departmentKeySchema } from "./user";

/* -------------------------------------------------------------------------- */
/* Status                                                                     */
/* -------------------------------------------------------------------------- */

export const TICKET_STATUS_ORDER = [
  "new",
  "triaged",
  "in_progress",
  "waiting_on_requester",
  "blocked",
  "testing",
  "resolved",
] as const;

export const ticketStatusSchema = z.enum(TICKET_STATUS_ORDER);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const TICKET_STATUS_META: Record<
  TicketStatus,
  { label: string; tone: Tone; description: string; open: boolean }
> = {
  new: {
    label: "New",
    tone: "info",
    description: "Submitted, not yet looked at.",
    open: true,
  },
  triaged: {
    label: "Triaged",
    tone: "info",
    description: "Understood and prioritised, not yet started.",
    open: true,
  },
  in_progress: {
    label: "In Progress",
    tone: "brand",
    description: "Actively being worked.",
    open: true,
  },
  waiting_on_requester: {
    label: "Waiting on Requester",
    tone: "warning",
    description: "Blocked on information from the person who asked.",
    open: true,
  },
  blocked: {
    label: "Blocked",
    tone: "critical",
    description: "Blocked on something outside the Tech Department.",
    open: true,
  },
  testing: {
    label: "Testing",
    tone: "accent",
    description: "Fixed, being verified before it is called done.",
    open: true,
  },
  resolved: {
    label: "Resolved",
    tone: "success",
    description: "Done. No further action expected.",
    open: false,
  },
};

/** Statuses that still represent work owned by the department. */
export const OPEN_TICKET_STATUSES = TICKET_STATUS_ORDER.filter(
  (s) => TICKET_STATUS_META[s].open,
);

/* -------------------------------------------------------------------------- */
/* Priority                                                                   */
/* -------------------------------------------------------------------------- */

export const TICKET_PRIORITY_ORDER = ["critical", "high", "normal", "low"] as const;

export const ticketPrioritySchema = z.enum(TICKET_PRIORITY_ORDER);
export type TicketPriority = z.infer<typeof ticketPrioritySchema>;

export const TICKET_PRIORITY_META: Record<
  TicketPriority,
  { label: string; tone: Tone; description: string; weight: number }
> = {
  critical: {
    label: "Critical",
    tone: "critical",
    description: "Operational impact right now. Reserved for genuine stoppages.",
    weight: 0,
  },
  high: {
    label: "High",
    tone: "warning",
    description: "A team is materially slowed.",
    weight: 1,
  },
  normal: {
    label: "Normal",
    tone: "neutral",
    description: "Standard request.",
    weight: 2,
  },
  low: {
    label: "Low",
    tone: "neutral",
    description: "Nice to have, no deadline pressure.",
    weight: 3,
  },
};

/* -------------------------------------------------------------------------- */
/* Category                                                                   */
/* -------------------------------------------------------------------------- */

export const TICKET_CATEGORY_ORDER = [
  "salesforce",
  "power_bi",
  "microsoft_fabric",
  "zapier",
  "hardware",
  "accounts",
  "permissions",
  "website",
  "bart",
  "other",
] as const;

export const ticketCategorySchema = z.enum(TICKET_CATEGORY_ORDER);
export type TicketCategory = z.infer<typeof ticketCategorySchema>;

export const TICKET_CATEGORY_META: Record<
  TicketCategory,
  { label: string; systemSlug: string | null }
> = {
  salesforce: { label: "Salesforce", systemSlug: "salesforce" },
  power_bi: { label: "Power BI", systemSlug: "power-bi" },
  microsoft_fabric: { label: "Microsoft Fabric", systemSlug: "microsoft-fabric" },
  zapier: { label: "Zapier", systemSlug: "zapier" },
  hardware: { label: "Hardware", systemSlug: null },
  accounts: { label: "Accounts", systemSlug: "google-workspace" },
  permissions: { label: "Permissions", systemSlug: null },
  website: { label: "Website", systemSlug: "websites" },
  bart: { label: "BART", systemSlug: "bart" },
  other: { label: "Other", systemSlug: null },
};

/* -------------------------------------------------------------------------- */
/* Source — the channel a request arrived through                             */
/* -------------------------------------------------------------------------- */

export const TICKET_SOURCE_ORDER = [
  "command_center",
  "sales_portal",
  "project_consultant_portal",
  "production_portal",
  "slack",
  "email",
  "api",
  "automation",
  "other",
] as const;

export const ticketSourceSchema = z.enum(TICKET_SOURCE_ORDER);
export type TicketSource = z.infer<typeof ticketSourceSchema>;

/**
 * Whether a source can actually put a ticket into the queue today.
 *
 * `preview` is its own state rather than a shade of `live`: the Employee
 * Portal is real and reachable, but it is reachable from inside this
 * application rather than from the department's own, so a submission through it
 * is a rehearsal. Calling that "Live" on the settings page would misreport the
 * rollout to the person reading it.
 */
export type SourceStatus = "live" | "preview" | "planned";

export const SOURCE_STATUS_META: Record<
  SourceStatus,
  { label: string; tone: Tone }
> = {
  live: { label: "Live", tone: "success" },
  preview: { label: "Preview", tone: "accent" },
  planned: { label: "Planned", tone: "neutral" },
};

export const TICKET_SOURCE_META: Record<
  TicketSource,
  { label: string; status: SourceStatus }
> = {
  command_center: { label: "Tech Command Center", status: "live" },
  sales_portal: { label: "Sales Portal", status: "preview" },
  project_consultant_portal: {
    label: "Project Consultant Portal",
    status: "preview",
  },
  production_portal: { label: "Production Portal", status: "preview" },
  slack: { label: "Slack", status: "planned" },
  email: { label: "Email", status: "planned" },
  api: { label: "API", status: "planned" },
  automation: { label: "Automation", status: "planned" },
  other: { label: "Other", status: "live" },
};

/* -------------------------------------------------------------------------- */
/* Impact and urgency — the two inputs a triage decision is made from         */
/* -------------------------------------------------------------------------- */

export const BUSINESS_IMPACT_ORDER = [
  "company",
  "department",
  "team",
  "individual",
] as const;
export const businessImpactSchema = z.enum(BUSINESS_IMPACT_ORDER);
export type BusinessImpact = z.infer<typeof businessImpactSchema>;

export const BUSINESS_IMPACT_META: Record<
  BusinessImpact,
  { label: string; tone: Tone }
> = {
  company: { label: "Company-wide", tone: "critical" },
  department: { label: "Whole department", tone: "warning" },
  team: { label: "A team", tone: "info" },
  individual: { label: "One person", tone: "neutral" },
};

export const URGENCY_ORDER = ["immediate", "urgent", "soon", "can_wait"] as const;
export const urgencySchema = z.enum(URGENCY_ORDER);
export type Urgency = z.infer<typeof urgencySchema>;

export const URGENCY_META: Record<Urgency, { label: string; tone: Tone }> = {
  immediate: { label: "Work has stopped", tone: "critical" },
  urgent: { label: "Urgent", tone: "warning" },
  soon: { label: "Soon", tone: "info" },
  can_wait: { label: "Can wait", tone: "neutral" },
};

/* -------------------------------------------------------------------------- */
/* Conversation                                                               */
/* -------------------------------------------------------------------------- */

export const attachmentSchema = z.object({
  id: entityId,
  name: z.string(),
  /** Bytes. Metadata only — V1 does not store file contents. */
  size: z.number(),
  contentType: z.string(),
  uploadedById: entityId,
  uploadedAt: isoDateTime,
});
export type Attachment = z.infer<typeof attachmentSchema>;

export const ticketCommentSchema = z.object({
  id: entityId,
  ticketId: entityId,
  authorId: entityId,
  body: z.string(),
  createdAt: isoDateTime,
  /** Internal notes are hidden from requesters once portals exist. */
  internal: z.boolean(),
  attachments: z.array(attachmentSchema),
});
export type TicketComment = z.infer<typeof ticketCommentSchema>;

export const TICKET_ACTIVITY_KINDS = [
  "created",
  "status_changed",
  "priority_changed",
  "assigned",
  "unassigned",
  "linked_project",
  "linked_system",
  "linked_ticket",
  "attachment_added",
  "sla_first_response",
  "sla_breached",
  "watcher_added",
  "resolved",
  "reopened",
  "note",
] as const;

export const ticketActivitySchema = z.object({
  id: entityId,
  ticketId: entityId,
  kind: z.enum(TICKET_ACTIVITY_KINDS),
  /** Null when the source system did not record who acted. */
  actorId: entityId.nullable(),
  /** Human-readable, already resolved to display labels. */
  from: z.string().nullable(),
  to: z.string().nullable(),
  detail: z.string().nullable(),
  createdAt: isoDateTime,
});
export type TicketActivity = z.infer<typeof ticketActivitySchema>;

/** One merged, chronologically-sorted conversation entry. */
export type TicketTimelineEntry =
  | { type: "comment"; at: string; comment: TicketComment }
  | { type: "activity"; at: string; activity: TicketActivity };

/* -------------------------------------------------------------------------- */
/* Provenance                                                                 */
/* -------------------------------------------------------------------------- */

export const EXTERNAL_SOURCES = [
  "slack",
  "clickup",
  "salesforce",
  "jotform",
  "other",
] as const;

export const externalRefSchema = z.object({
  source: z.enum(EXTERNAL_SOURCES),
  /**
   * `origin` is where the request was actually raised. `mirror` is a copy some
   * automation made of it — real, findable, but not authoritative.
   */
  role: z.enum(["origin", "mirror"]),
  id: z.string(),
  url: z.string().nullable(),
  /** Human-readable location, e.g. "#it-ticketing-cams". */
  label: z.string().nullable(),
  /** Replies held over there, where the source reports them. */
  commentCount: z.number().nullable(),
});
export type ExternalRef = z.infer<typeof externalRefSchema>;

export const EXTERNAL_SOURCE_META: Record<
  (typeof EXTERNAL_SOURCES)[number],
  { label: string }
> = {
  slack: { label: "Slack" },
  clickup: { label: "ClickUp" },
  salesforce: { label: "Salesforce" },
  jotform: { label: "Jotform" },
  other: { label: "Other" },
};

/* -------------------------------------------------------------------------- */
/* Ticket                                                                     */
/* -------------------------------------------------------------------------- */

export const ticketSchema = z.object({
  id: entityId,
  /** Display key, e.g. KHT-1042. */
  ticketNumber: z.string().regex(/^KHT-\d+$/),
  title: z.string().min(1),
  description: z.string(),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  category: ticketCategorySchema,
  /**
   * Null when the source system did not record who asked.
   *
   * Most historical ClickUp tickets are in that position: the request was
   * pasted in without attribution, and the only thing actually known is the
   * department whose list it landed in. Naming a person there would be a
   * guess, and a guess about who reported something is worse than a blank.
   */
  requesterId: entityId.nullable(),
  requesterDepartment: departmentKeySchema,
  assigneeId: entityId.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  firstResponseAt: isoDateTime.nullable(),
  resolvedAt: isoDateTime.nullable(),
  dueDate: isoDateTime.nullable(),
  slaDueAt: isoDateTime.nullable(),
  estimatedEffortHours: z.number().nullable(),
  actualTimeSpentHours: z.number().nullable(),
  businessImpact: businessImpactSchema,
  urgency: urgencySchema,
  source: ticketSourceSchema,
  tags: z.array(z.string()),
  relatedSystemIds: z.array(entityId),
  relatedProjectId: entityId.nullable(),
  relatedTicketIds: z.array(entityId),
  relatedArticleIds: z.array(entityId),
  attachments: z.array(attachmentSchema),
  watcherIds: z.array(entityId),
  /** Set when a resolved ticket is reopened; drives the reopened-rate metric. */
  reopenCount: z.number(),
  /**
   * Every place this same request exists outside the application.
   *
   * A list rather than a single reference, because one request genuinely does
   * live in more than one system: a Slack intake message is copied into ClickUp
   * by an automation, so the same thing has two homes. Recording both — one
   * marked `origin`, the rest `mirror` — is what lets the application show a
   * single ticket instead of two, and lets a re-import recognise what it has
   * already seen rather than duplicating it again.
   */
  externalRefs: z.array(externalRefSchema),
});
export type Ticket = z.infer<typeof ticketSchema>;

/**
 * Everything needed to create a ticket. The long tail of fields is optional on
 * purpose — the form asks for four things and infers the rest.
 */
export const createTicketInputSchema = z.object({
  title: z.string().min(4, "Give the ticket a title someone else would understand."),
  description: z.string().default(""),
  priority: ticketPrioritySchema.default("normal"),
  category: ticketCategorySchema.default("other"),
  requesterId: entityId,
  requesterDepartment: departmentKeySchema.default("tech"),
  assigneeId: entityId.nullable().default(null),
  businessImpact: businessImpactSchema.default("individual"),
  urgency: urgencySchema.default("soon"),
  source: ticketSourceSchema.default("command_center"),
  relatedSystemIds: z.array(entityId).default([]),
  relatedProjectId: entityId.nullable().default(null),
  tags: z.array(z.string()).default([]),
});
export type CreateTicketInput = z.input<typeof createTicketInputSchema>;

export function isOpen(ticket: Ticket): boolean {
  return TICKET_STATUS_META[ticket.status].open;
}
