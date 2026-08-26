import { z } from "zod";
import { entityId } from "./common";

/**
 * Departments at Kind Home Solutions.
 *
 * These are the real ones, taken from how work is actually organised: the IT
 * Tickets folder in ClickUp is split into Leadership, CAM, Production, Sales
 * and SDR lists, and the project folders add EST, PM, Marketing and
 * Accounting/HR. Technology is itself a department so internal work is not a
 * special case.
 *
 * CAM is Customer Account Management; SDR is Sales Development; EST is the
 * estimating team; PM is project management.
 */
export const DEPARTMENT_KEYS = [
  "tech",
  "leadership",
  "sales",
  "sdr",
  "cam",
  "est",
  "production",
  "pm",
  "marketing",
  "accounting_hr",
] as const;

export const departmentKeySchema = z.enum(DEPARTMENT_KEYS);
export type DepartmentKey = z.infer<typeof departmentKeySchema>;

export const departmentSchema = z.object({
  id: departmentKeySchema,
  name: z.string(),
  shortName: z.string(),
  /** Matches the ClickUp list a ticket arrives in, where one exists. */
  clickUpList: z.string().nullable(),
});
export type Department = z.infer<typeof departmentSchema>;

export const DEPARTMENTS: Record<DepartmentKey, Department> = {
  tech: { id: "tech", name: "Technology", shortName: "Tech", clickUpList: null },
  leadership: {
    id: "leadership",
    name: "Leadership",
    shortName: "Leadership",
    clickUpList: "Leadership Tickets",
  },
  sales: {
    id: "sales",
    name: "Sales",
    shortName: "Sales",
    clickUpList: "Sales Tickets",
  },
  sdr: {
    id: "sdr",
    name: "Sales Development",
    shortName: "SDR",
    clickUpList: "SDR Tickets",
  },
  cam: {
    id: "cam",
    name: "Customer Account Management",
    shortName: "CAM",
    clickUpList: "CAM Tickets",
  },
  est: { id: "est", name: "Estimating", shortName: "EST", clickUpList: null },
  production: {
    id: "production",
    name: "Production",
    shortName: "Production",
    clickUpList: "Production Tickets",
  },
  pm: { id: "pm", name: "Project Management", shortName: "PM", clickUpList: null },
  marketing: {
    id: "marketing",
    name: "Marketing",
    shortName: "Marketing",
    clickUpList: null,
  },
  accounting_hr: {
    id: "accounting_hr",
    name: "Accounting & HR",
    shortName: "Acct/HR",
    clickUpList: null,
  },
};

/** Resolves a ClickUp list name back to the department that owns it. */
export function departmentForClickUpList(listName: string): DepartmentKey {
  const match = DEPARTMENT_KEYS.find(
    (key) => DEPARTMENTS[key].clickUpList === listName,
  );
  return match ?? "leadership";
}

export const userSchema = z.object({
  id: entityId,
  name: z.string(),
  initials: z.string(),
  email: z.string(),
  title: z.string(),
  department: departmentKeySchema,
  /** Members of the Tech Department can be assigned work. */
  isTechTeam: z.boolean(),
  /**
   * Slack member id. The intake form carries the submitter as a real mention,
   * so this is the reliable join between a request and a person.
   */
  slackId: z.string().nullable(),
  /** Numeric ClickUp member id, where the person has an account. */
  clickUpId: z.number().nullable(),
  /**
   * Avatar tint. Chosen from a fixed set so avatars stay distinguishable
   * without introducing colours outside the token file.
   */
  accent: z.enum(["navy", "teal", "info", "accent", "warning", "success"]),
});
export type User = z.infer<typeof userSchema>;

export const AVATAR_ACCENT_CLASSES: Record<User["accent"], string> = {
  navy: "bg-navy-100 text-navy-700",
  teal: "bg-teal-100 text-teal-700",
  info: "bg-info-bg text-info",
  accent: "bg-accent-bg text-accent",
  warning: "bg-warning-bg text-warning",
  success: "bg-success-bg text-success",
};
