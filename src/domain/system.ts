import { z } from "zod";
import { entityId, isoDateTime, type Tone } from "./common";

/* -------------------------------------------------------------------------- */
/* Health                                                                     */
/* -------------------------------------------------------------------------- */

export const SYSTEM_HEALTH_ORDER = [
  "outage",
  "partial_outage",
  "degraded",
  "maintenance",
  "operational",
] as const;

export const systemHealthSchema = z.enum(SYSTEM_HEALTH_ORDER);
export type SystemHealth = z.infer<typeof systemHealthSchema>;

export const SYSTEM_HEALTH_META: Record<
  SystemHealth,
  { label: string; tone: Tone; description: string; rank: number }
> = {
  outage: {
    label: "Outage",
    tone: "critical",
    description: "Unavailable. Work that depends on it has stopped.",
    rank: 0,
  },
  partial_outage: {
    label: "Partial Outage",
    tone: "critical",
    description: "Some capability is unavailable.",
    rank: 1,
  },
  degraded: {
    label: "Degraded",
    tone: "warning",
    description: "Working, but slower or less reliably than normal.",
    rank: 2,
  },
  maintenance: {
    label: "Maintenance",
    tone: "info",
    description: "Planned work in progress.",
    rank: 3,
  },
  operational: {
    label: "Operational",
    tone: "success",
    description: "Behaving normally.",
    rank: 4,
  },
};

/* -------------------------------------------------------------------------- */
/* Criticality                                                                */
/* -------------------------------------------------------------------------- */

export const SYSTEM_CRITICALITY_ORDER = [
  "critical",
  "high",
  "standard",
  "low",
] as const;

export const systemCriticalitySchema = z.enum(SYSTEM_CRITICALITY_ORDER);
export type SystemCriticality = z.infer<typeof systemCriticalitySchema>;

export const SYSTEM_CRITICALITY_META: Record<
  SystemCriticality,
  { label: string; tone: Tone; description: string }
> = {
  critical: {
    label: "Critical",
    tone: "critical",
    description: "The company cannot operate normally without it.",
  },
  high: {
    label: "High",
    tone: "warning",
    description: "A department is materially blocked without it.",
  },
  standard: {
    label: "Standard",
    tone: "neutral",
    description: "Meaningful, with a workaround available.",
  },
  low: {
    label: "Low",
    tone: "neutral",
    description: "Limited impact if unavailable.",
  },
};

/* -------------------------------------------------------------------------- */
/* Node kind — shared by the Systems Hub and the System Map                   */
/* -------------------------------------------------------------------------- */

export const SYSTEM_KIND_ORDER = [
  "application",
  "database",
  "automation",
  "website",
  "external_service",
  "internal_tool",
  "manual_process",
] as const;

export const systemKindSchema = z.enum(SYSTEM_KIND_ORDER);
export type SystemKind = z.infer<typeof systemKindSchema>;

export const SYSTEM_KIND_META: Record<
  SystemKind,
  { label: string; tone: Tone; icon: string }
> = {
  application: { label: "Application", tone: "info", icon: "AppWindow" },
  database: { label: "Database", tone: "accent", icon: "Database" },
  automation: { label: "Automation", tone: "warning", icon: "Zap" },
  website: { label: "Website", tone: "brand", icon: "Globe" },
  external_service: { label: "External Service", tone: "neutral", icon: "Cloud" },
  internal_tool: { label: "Internal Tool", tone: "brand", icon: "Wrench" },
  manual_process: { label: "Manual Process", tone: "neutral", icon: "Hand" },
};

/* -------------------------------------------------------------------------- */
/* System                                                                     */
/* -------------------------------------------------------------------------- */

export const systemChangeSchema = z.object({
  id: entityId,
  at: isoDateTime,
  actorId: entityId,
  summary: z.string(),
  kind: z.enum(["config", "health", "access", "integration", "release"]),
});
export type SystemChange = z.infer<typeof systemChangeSchema>;

export const techSystemSchema = z.object({
  id: entityId,
  /** URL-safe identifier used in routes: /systems/salesforce */
  slug: z.string(),
  name: z.string(),
  shortName: z.string(),
  description: z.string(),
  purpose: z.string(),
  kind: systemKindSchema,
  health: systemHealthSchema,
  /** Why it is not operational. Null when healthy. */
  healthNote: z.string().nullable(),
  healthChangedAt: isoDateTime,
  criticality: systemCriticalitySchema,
  ownerId: entityId,
  ownerTeam: z.string(),
  /** Departments that depend on this system day to day. */
  businessTeams: z.array(z.string()),
  vendor: z.string().nullable(),
  /**
   * Where the system is administered. A link only — never a credential.
   */
  adminUrl: z.string().nullable(),
  /**
   * Name of the environment variable holding this system's API credentials,
   * for the day integrations are wired up. The value is never stored here and
   * never reaches the browser; this is a pointer, not a secret.
   */
  credentialEnvKey: z.string().nullable(),
  tags: z.array(z.string()),
  changeLog: z.array(systemChangeSchema),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
export type TechSystem = z.infer<typeof techSystemSchema>;

/* -------------------------------------------------------------------------- */
/* Connections between systems                                                */
/* -------------------------------------------------------------------------- */

export const CONNECTION_METHOD_ORDER = [
  "api",
  "webhook",
  "database",
  "scheduled_sync",
  "automation",
  "file_transfer",
  "manual",
  "other",
] as const;

export const connectionMethodSchema = z.enum(CONNECTION_METHOD_ORDER);
export type ConnectionMethod = z.infer<typeof connectionMethodSchema>;

export const CONNECTION_METHOD_META: Record<
  ConnectionMethod,
  { label: string; tone: Tone; dashed: boolean }
> = {
  api: { label: "API", tone: "info", dashed: false },
  webhook: { label: "Webhook", tone: "brand", dashed: false },
  database: { label: "Database", tone: "accent", dashed: false },
  scheduled_sync: { label: "Scheduled Sync", tone: "neutral", dashed: true },
  automation: { label: "Automation", tone: "warning", dashed: false },
  file_transfer: { label: "File Transfer", tone: "neutral", dashed: true },
  manual: { label: "Manual", tone: "neutral", dashed: true },
  other: { label: "Other", tone: "neutral", dashed: true },
};

export const systemConnectionSchema = z.object({
  id: entityId,
  sourceSystemId: entityId,
  targetSystemId: entityId,
  method: connectionMethodSchema,
  /** What actually moves across the link. */
  dataDescription: z.string(),
  frequency: z.string(),
  direction: z.enum(["one_way", "bidirectional"]),
  ownerId: entityId,
  description: z.string(),
  health: systemHealthSchema,
});
export type SystemConnection = z.infer<typeof systemConnectionSchema>;

/** Rolls a set of system healths up into the single worst state present. */
export function worstHealth(healths: SystemHealth[]): SystemHealth {
  return healths.reduce<SystemHealth>(
    (worst, h) =>
      SYSTEM_HEALTH_META[h].rank < SYSTEM_HEALTH_META[worst].rank ? h : worst,
    "operational",
  );
}
