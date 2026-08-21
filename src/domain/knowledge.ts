import { z } from "zod";
import { entityId, isoDateTime } from "./common";

export const KNOWLEDGE_CATEGORY_ORDER = [
  "salesforce",
  "power_bi",
  "microsoft_fabric",
  "zapier",
  "bart",
  "accounts_access",
  "hardware",
  "websites",
  "integrations",
  "troubleshooting",
  "processes",
  "architecture",
] as const;

export const knowledgeCategorySchema = z.enum(KNOWLEDGE_CATEGORY_ORDER);
export type KnowledgeCategory = z.infer<typeof knowledgeCategorySchema>;

export const KNOWLEDGE_CATEGORY_META: Record<
  KnowledgeCategory,
  { label: string; icon: string }
> = {
  salesforce: { label: "Salesforce", icon: "Cloud" },
  power_bi: { label: "Power BI", icon: "ChartNoAxesColumn" },
  microsoft_fabric: { label: "Microsoft Fabric", icon: "Layers" },
  zapier: { label: "Zapier", icon: "Zap" },
  bart: { label: "BART", icon: "Calculator" },
  accounts_access: { label: "Accounts & Access", icon: "KeyRound" },
  hardware: { label: "Hardware", icon: "Laptop" },
  websites: { label: "Websites", icon: "Globe" },
  integrations: { label: "Integrations", icon: "Cable" },
  troubleshooting: { label: "Troubleshooting", icon: "LifeBuoy" },
  processes: { label: "Processes", icon: "ListChecks" },
  architecture: { label: "Architecture", icon: "Network" },
};

export const knowledgeArticleSchema = z.object({
  id: entityId,
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  /** Markdown. Rendered by a deliberately small renderer — see lib/markdown.ts. */
  content: z.string(),
  authorId: entityId,
  category: knowledgeCategorySchema,
  tags: z.array(z.string()),
  relatedSystemIds: z.array(entityId),
  relatedProjectIds: z.array(entityId),
  relatedDiagramIds: z.array(entityId),
  relatedTicketIds: z.array(entityId),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  /** How often the article has been opened. Drives "most useful" ordering. */
  views: z.number(),
});
export type KnowledgeArticle = z.infer<typeof knowledgeArticleSchema>;

/** Roughly 200 words per minute, floored at one. */
export function readingMinutes(content: string): number {
  return Math.max(1, Math.round(content.trim().split(/\s+/).length / 200));
}
