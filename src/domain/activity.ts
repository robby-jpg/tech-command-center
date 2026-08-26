import { z } from "zod";
import { entityId, isoDateTime, type Tone } from "./common";

/**
 * A single audit entry. Deliberately denormalised: it carries the label and
 * href it needs to render, so the activity stream never has to resolve
 * references across five collections to paint a row.
 */

export const ACTIVITY_ENTITY_TYPES = [
  "ticket",
  "project",
  "system",
  "diagram",
  "article",
  "task",
  "milestone",
] as const;

export const activityEntityTypeSchema = z.enum(ACTIVITY_ENTITY_TYPES);
export type ActivityEntityType = z.infer<typeof activityEntityTypeSchema>;

export const ACTIVITY_ENTITY_META: Record<
  ActivityEntityType,
  { label: string; plural: string; icon: string; tone: Tone }
> = {
  ticket: { label: "Ticket", plural: "Tickets", icon: "Ticket", tone: "info" },
  project: {
    label: "Project",
    plural: "Projects",
    icon: "FolderKanban",
    tone: "brand",
  },
  system: { label: "System", plural: "Systems", icon: "Server", tone: "accent" },
  diagram: {
    label: "Diagram",
    plural: "Diagrams",
    icon: "Workflow",
    tone: "neutral",
  },
  article: {
    label: "Documentation",
    plural: "Documentation",
    icon: "BookOpen",
    tone: "neutral",
  },
  task: { label: "Task", plural: "Tasks", icon: "CircleCheck", tone: "neutral" },
  milestone: {
    label: "Milestone",
    plural: "Milestones",
    icon: "Flag",
    tone: "success",
  },
};

export const ACTIVITY_ACTIONS = [
  "created",
  "updated",
  "status_changed",
  "assigned",
  "resolved",
  "reopened",
  "commented",
  "completed",
  "published",
  "health_changed",
  "linked",
  "deleted",
] as const;

export const activityActionSchema = z.enum(ACTIVITY_ACTIONS);
export type ActivityAction = z.infer<typeof activityActionSchema>;

export const activityEventSchema = z.object({
  id: entityId,
  entityType: activityEntityTypeSchema,
  entityId: entityId,
  /** e.g. "KHT-1042" or "Fabric Analytics Migration". */
  entityLabel: z.string(),
  action: activityActionSchema,
  /**
   * Null when the source system did not record who acted. Imported history is
   * frequently in that position; the UI says "Someone" rather than crediting
   * the wrong person.
   */
  actorId: entityId.nullable(),
  /** Full sentence, already written for a human. */
  summary: z.string(),
  detail: z.string().nullable(),
  href: z.string(),
  createdAt: isoDateTime,
  /** Raises the row visually when something genuinely notable happened. */
  significant: z.boolean(),
});
export type ActivityEvent = z.infer<typeof activityEventSchema>;
