import { z } from "zod";
import { entityId, isoDateTime, type Tone } from "./common";

/* -------------------------------------------------------------------------- */
/* Status                                                                     */
/* -------------------------------------------------------------------------- */

export const PROJECT_STATUS_ORDER = [
  "idea",
  "backlog",
  "planning",
  "in_progress",
  "testing",
  "rollout",
  "complete",
  "on_hold",
] as const;

export const projectStatusSchema = z.enum(PROJECT_STATUS_ORDER);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; tone: Tone; active: boolean; roadmapLane: string }
> = {
  idea: { label: "Idea", tone: "neutral", active: false, roadmapLane: "Planned" },
  backlog: {
    label: "Backlog",
    tone: "neutral",
    active: false,
    roadmapLane: "Planned",
  },
  planning: {
    label: "Planning",
    tone: "info",
    active: true,
    roadmapLane: "Planned",
  },
  in_progress: {
    label: "In Progress",
    tone: "brand",
    active: true,
    roadmapLane: "In Progress",
  },
  testing: {
    label: "Testing",
    tone: "accent",
    active: true,
    roadmapLane: "Testing",
  },
  rollout: {
    label: "Rollout",
    tone: "warning",
    active: true,
    roadmapLane: "Launching",
  },
  complete: {
    label: "Complete",
    tone: "success",
    active: false,
    roadmapLane: "Completed",
  },
  on_hold: {
    label: "On Hold",
    tone: "neutral",
    active: false,
    roadmapLane: "Planned",
  },
};

export const ROADMAP_LANES = [
  "Planned",
  "In Progress",
  "Testing",
  "Launching",
  "Completed",
] as const;
export type RoadmapLane = (typeof ROADMAP_LANES)[number];

/* -------------------------------------------------------------------------- */
/* Health — deliberately independent of both status and progress              */
/* -------------------------------------------------------------------------- */

export const PROJECT_HEALTH_ORDER = ["blocked", "at_risk", "on_track"] as const;
export const projectHealthSchema = z.enum(PROJECT_HEALTH_ORDER);
export type ProjectHealth = z.infer<typeof projectHealthSchema>;

export const PROJECT_HEALTH_META: Record<
  ProjectHealth,
  { label: string; tone: Tone; description: string }
> = {
  blocked: {
    label: "Blocked",
    tone: "critical",
    description: "Cannot move until something outside the team changes.",
  },
  at_risk: {
    label: "At Risk",
    tone: "warning",
    description: "Still moving, but the date is in doubt.",
  },
  on_track: {
    label: "On Track",
    tone: "success",
    description: "Moving as planned.",
  },
};

/* -------------------------------------------------------------------------- */
/* Tasks                                                                      */
/* -------------------------------------------------------------------------- */

export const TASK_STATUS_ORDER = [
  "todo",
  "in_progress",
  "blocked",
  "review",
  "done",
] as const;
export const taskStatusSchema = z.enum(TASK_STATUS_ORDER);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; tone: Tone; done: boolean }
> = {
  todo: { label: "To Do", tone: "neutral", done: false },
  in_progress: { label: "In Progress", tone: "brand", done: false },
  blocked: { label: "Blocked", tone: "critical", done: false },
  review: { label: "Review", tone: "accent", done: false },
  done: { label: "Done", tone: "success", done: true },
};

export const TASK_PRIORITY_ORDER = ["high", "normal", "low"] as const;
export const taskPrioritySchema = z.enum(TASK_PRIORITY_ORDER);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const taskSchema = z.object({
  id: entityId,
  projectId: entityId,
  /** Set for subtasks. Top-level tasks are null. */
  parentTaskId: entityId.nullable(),
  milestoneId: entityId.nullable(),
  title: z.string(),
  description: z.string(),
  ownerId: entityId.nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  dueDate: isoDateTime.nullable(),
  estimatedHours: z.number().nullable(),
  actualHours: z.number().nullable(),
  dependsOnTaskIds: z.array(entityId),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  order: z.number(),
});
export type Task = z.infer<typeof taskSchema>;

/* -------------------------------------------------------------------------- */
/* Milestones                                                                 */
/* -------------------------------------------------------------------------- */

export const MILESTONE_STATUS_ORDER = [
  "not_started",
  "in_progress",
  "complete",
  "at_risk",
] as const;
export const milestoneStatusSchema = z.enum(MILESTONE_STATUS_ORDER);
export type MilestoneStatus = z.infer<typeof milestoneStatusSchema>;

export const MILESTONE_STATUS_META: Record<
  MilestoneStatus,
  { label: string; tone: Tone }
> = {
  not_started: { label: "Not started", tone: "neutral" },
  in_progress: { label: "In progress", tone: "brand" },
  complete: { label: "Complete", tone: "success" },
  at_risk: { label: "At risk", tone: "warning" },
};

export const milestoneSchema = z.object({
  id: entityId,
  projectId: entityId,
  name: z.string(),
  description: z.string(),
  targetDate: isoDateTime,
  completedAt: isoDateTime.nullable(),
  status: milestoneStatusSchema,
  order: z.number(),
});
export type Milestone = z.infer<typeof milestoneSchema>;

/* -------------------------------------------------------------------------- */
/* Project                                                                    */
/* -------------------------------------------------------------------------- */

export const projectSchema = z.object({
  id: entityId,
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  /** Why the company is paying for this, in one sentence. */
  businessGoal: z.string(),
  expectedImpact: z.string(),
  ownerId: entityId,
  contributorIds: z.array(entityId),
  status: projectStatusSchema,
  health: projectHealthSchema,
  /** Present when health is not on_track. Shown wherever health is shown. */
  healthNote: z.string().nullable(),
  priority: z.enum(["critical", "high", "normal", "low"]),
  startDate: isoDateTime,
  targetDate: isoDateTime,
  completedAt: isoDateTime.nullable(),
  /** 0–100. Never used on its own to communicate health. */
  progress: z.number().min(0).max(100),
  estimatedHoursSavedMonthly: z.number(),
  /** Measured after launch. Null until then. */
  actualHoursSavedMonthly: z.number().nullable(),
  manualProcessesEliminated: z.number(),
  automationsCreated: z.number(),
  departmentsImpacted: z.array(z.string()),
  systemIds: z.array(entityId),
  tags: z.array(z.string()),
  /** Other projects that must land first. */
  dependsOnProjectIds: z.array(entityId),
  relatedArticleIds: z.array(entityId),
  relatedDiagramIds: z.array(entityId),
  /** Strategic grouping used by the roadmap. */
  initiative: z.string(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
export type Project = z.infer<typeof projectSchema>;

export const createProjectInputSchema = z.object({
  name: z.string().min(3, "Name the project."),
  description: z.string().default(""),
  businessGoal: z.string().default(""),
  ownerId: entityId,
  status: projectStatusSchema.default("planning"),
  health: projectHealthSchema.default("on_track"),
  priority: z.enum(["critical", "high", "normal", "low"]).default("normal"),
  targetDate: isoDateTime,
  systemIds: z.array(entityId).default([]),
  initiative: z.string().default("Unassigned"),
});
export type CreateProjectInput = z.input<typeof createProjectInputSchema>;

/** Which calendar quarter a date falls in, e.g. "Q3 2026". */
export function quarterOf(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
}
