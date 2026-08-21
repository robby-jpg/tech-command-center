import { z } from "zod";
import { entityId, isoDateTime, type Tone } from "./common";

/* -------------------------------------------------------------------------- */
/* Diagram type                                                               */
/* -------------------------------------------------------------------------- */

export const DIAGRAM_TYPE_ORDER = [
  "architecture",
  "workflow",
  "troubleshooting",
  "data_flow",
] as const;

export const diagramTypeSchema = z.enum(DIAGRAM_TYPE_ORDER);
export type DiagramType = z.infer<typeof diagramTypeSchema>;

export const DIAGRAM_TYPE_META: Record<
  DiagramType,
  { label: string; tone: Tone; description: string; icon: string }
> = {
  architecture: {
    label: "Architecture",
    tone: "info",
    description: "How a set of systems fits together.",
    icon: "Network",
  },
  workflow: {
    label: "Workflow",
    tone: "brand",
    description: "How work moves from a trigger to an outcome.",
    icon: "Workflow",
  },
  troubleshooting: {
    label: "Troubleshooting",
    tone: "warning",
    description: "A decision tree for diagnosing a recurring problem.",
    icon: "GitBranch",
  },
  data_flow: {
    label: "Data Flow",
    tone: "accent",
    description: "Where a piece of data originates and where it ends up.",
    icon: "ArrowRightLeft",
  },
};

/* -------------------------------------------------------------------------- */
/* Nodes                                                                      */
/* -------------------------------------------------------------------------- */

export const DIAGRAM_NODE_KIND_ORDER = [
  "start",
  "process",
  "decision",
  "system",
  "database",
  "person",
  "note",
  "end",
] as const;

export const diagramNodeKindSchema = z.enum(DIAGRAM_NODE_KIND_ORDER);
export type DiagramNodeKind = z.infer<typeof diagramNodeKindSchema>;

export const DIAGRAM_NODE_KIND_META: Record<
  DiagramNodeKind,
  { label: string; tone: Tone; icon: string; shape: "rounded" | "diamond" | "pill" | "note" }
> = {
  start: { label: "Start", tone: "success", icon: "Play", shape: "pill" },
  process: { label: "Process", tone: "info", icon: "Square", shape: "rounded" },
  decision: {
    label: "Decision",
    tone: "warning",
    icon: "Diamond",
    shape: "diamond",
  },
  system: { label: "System", tone: "brand", icon: "Server", shape: "rounded" },
  database: { label: "Database", tone: "accent", icon: "Database", shape: "rounded" },
  person: { label: "Person / Team", tone: "neutral", icon: "Users", shape: "rounded" },
  note: { label: "Note", tone: "neutral", icon: "StickyNote", shape: "note" },
  end: { label: "End", tone: "neutral", icon: "CircleStop", shape: "pill" },
};

export const diagramNodeSchema = z.object({
  id: entityId,
  kind: diagramNodeKindSchema,
  label: z.string(),
  description: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  /** Links the node back to a real system in the catalogue, when it is one. */
  systemId: entityId.nullable(),
});
export type DiagramNode = z.infer<typeof diagramNodeSchema>;

export const diagramEdgeSchema = z.object({
  id: entityId,
  source: entityId,
  target: entityId,
  label: z.string(),
  /** Dashed edges read as "not a live technical link". */
  dashed: z.boolean(),
});
export type DiagramEdge = z.infer<typeof diagramEdgeSchema>;

/* -------------------------------------------------------------------------- */
/* Diagram                                                                    */
/* -------------------------------------------------------------------------- */

export const diagramSchema = z.object({
  id: entityId,
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  type: diagramTypeSchema,
  nodes: z.array(diagramNodeSchema),
  edges: z.array(diagramEdgeSchema),
  relatedSystemIds: z.array(entityId),
  relatedProjectIds: z.array(entityId),
  relatedTicketIds: z.array(entityId),
  relatedArticleIds: z.array(entityId),
  createdById: entityId,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
export type Diagram = z.infer<typeof diagramSchema>;

/**
 * The persisted shape is intentionally renderer-agnostic: positions, labels and
 * kinds only, with no React Flow types leaking in. Export to PNG/SVG, or a
 * swap to a different canvas library, needs no migration.
 */
export type DiagramDocument = Pick<Diagram, "nodes" | "edges">;
