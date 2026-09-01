"use server";

import { revalidatePath } from "next/cache";
import type { DepartmentKey } from "@/domain";
import { setProjectDepartments } from "@/lib/project-departments";

/**
 * Records which departments a project affects.
 *
 * A server action rather than a store mutation because this has to survive the
 * nightly dataset refresh — it is the field the Employee Portal scopes its
 * roadmap on, so losing it means every department's roadmap silently empties
 * overnight. See `lib/project-departments.ts`.
 */
export async function setProjectDepartmentsAction(input: {
  projectId: string;
  departments: DepartmentKey[];
}) {
  await setProjectDepartments(input.projectId, input.departments);

  // The portal reads the roadmap off the same snapshot, so it has to be told.
  revalidatePath("/projects");
  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath("/portal");
  revalidatePath("/roadmap");
}
