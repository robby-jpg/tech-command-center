import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { DEPARTMENT_KEYS, type DepartmentKey } from "@/domain";
import type { WorkspaceSnapshot } from "./data/types";

/**
 * Which departments each project actually affects.
 *
 * `Project.departmentsImpacted` is the right field for this and it is empty on
 * every imported project — nothing populated it, because the ClickUp folders
 * the projects came from have no concept of an affected department. That was
 * invisible until the Employee Portal tried to answer "what is being built for
 * my team" and correctly answered "nothing", for everybody.
 *
 * It cannot live in the client store: that is localStorage, and the nightly
 * `refresh-intake` run wipes it. So it is a file, read server-side and merged
 * over whatever the provider returns — the same shape as sessions and kept
 * whiteboards.
 *
 * An override map rather than an edit to the fixtures, because the fixtures are
 * a captured import that a scheduled agent rewrites. Anything hand-authored has
 * to sit beside them, not inside them.
 */

const FILE = path.join(process.cwd(), "data", "project-departments.json");

const schema = z.record(z.string(), z.array(z.enum(DEPARTMENT_KEYS)));

export type ProjectDepartments = Record<string, DepartmentKey[]>;

export async function readProjectDepartments(): Promise<ProjectDepartments> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.warn(
        "[project-departments] the override file is malformed and was ignored:",
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      );
      return {};
    }
    return parsed.data;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
}

export async function setProjectDepartments(
  projectId: string,
  departments: DepartmentKey[],
): Promise<void> {
  const current = await readProjectDepartments();

  // An empty list is stored as a deletion rather than as an empty array, so the
  // file stays a list of decisions rather than accumulating a row per project.
  if (departments.length === 0) {
    delete current[projectId];
  } else {
    current[projectId] = [...new Set(departments)].sort();
  }

  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, `${JSON.stringify(current, null, 2)}\n`, "utf8");
}

/**
 * Merges the overrides onto a snapshot.
 *
 * The override wins outright rather than merging with the fixture's own value.
 * A half-and-half rule would make it impossible to *remove* a department that
 * the import got wrong, and the file is meant to be the human answer.
 */
export function applyProjectDepartments(
  snapshot: WorkspaceSnapshot,
  overrides: ProjectDepartments,
): WorkspaceSnapshot {
  if (Object.keys(overrides).length === 0) return snapshot;

  return {
    ...snapshot,
    projects: snapshot.projects.map((project) =>
      overrides[project.id]
        ? { ...project, departmentsImpacted: overrides[project.id] }
        : project,
    ),
  };
}
