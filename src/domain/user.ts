import { z } from "zod";
import { entityId } from "./common";

/**
 * Departments at Kind Home Solutions. A ticket requester belongs to one; the
 * Tech Department is itself a department so internal work is not a special
 * case.
 */
export const DEPARTMENT_KEYS = [
  "tech",
  "sales",
  "production",
  "operations",
  "marketing",
  "finance",
  "customer_experience",
  "holiday_lights",
  "leadership",
] as const;

export const departmentKeySchema = z.enum(DEPARTMENT_KEYS);
export type DepartmentKey = z.infer<typeof departmentKeySchema>;

export const departmentSchema = z.object({
  id: departmentKeySchema,
  name: z.string(),
  shortName: z.string(),
});
export type Department = z.infer<typeof departmentSchema>;

export const DEPARTMENTS: Record<DepartmentKey, Department> = {
  tech: { id: "tech", name: "Technology", shortName: "Tech" },
  sales: { id: "sales", name: "Sales", shortName: "Sales" },
  production: { id: "production", name: "Production", shortName: "Production" },
  operations: { id: "operations", name: "Operations", shortName: "Ops" },
  marketing: { id: "marketing", name: "Marketing", shortName: "Marketing" },
  finance: { id: "finance", name: "Finance", shortName: "Finance" },
  customer_experience: {
    id: "customer_experience",
    name: "Customer Experience",
    shortName: "CX",
  },
  holiday_lights: {
    id: "holiday_lights",
    name: "Holiday Lights",
    shortName: "Holiday",
  },
  leadership: { id: "leadership", name: "Leadership", shortName: "Leadership" },
};

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
