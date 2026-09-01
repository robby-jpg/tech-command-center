import "server-only";

import { MockDataSource } from "./mock-source";
import {
  applyProjectDepartments,
  readProjectDepartments,
} from "../project-departments";
import type { DataSource, TicketQuery } from "./types";

export type * from "./types";

/**
 * The data layer's front door.
 *
 * Nothing above this module knows which provider is in use, and no component
 * imports a mock array. Swapping to Postgres, or putting a Salesforce adapter
 * behind part of the interface, happens here.
 *
 * `server-only` is imported at the top so that a mistaken import from a client
 * component fails at build time rather than shipping the whole dataset — and
 * eventually a database connection string — to the browser.
 */

const PROVIDERS: Record<string, () => DataSource> = {
  mock: () => new MockDataSource(),
};

let instance: DataSource | null = null;

export function getDataSource(): DataSource {
  if (instance) return instance;

  const requested = process.env.DATA_SOURCE?.trim() || "mock";
  const factory = PROVIDERS[requested];

  if (!factory) {
    throw new Error(
      `Unknown DATA_SOURCE "${requested}". Available: ${Object.keys(PROVIDERS).join(", ")}. ` +
        `A Postgres provider is planned — see prisma/schema.prisma and README.md.`,
    );
  }

  instance = factory();
  return instance;
}

/* -------------------------------------------------------------------------- */
/* Service functions                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The whole working set, with hand-authored overrides applied.
 *
 * `departmentsImpacted` is empty on every imported project, so the override
 * file in `data/` is merged on the way out. It sits here rather than inside the
 * mock provider because it is a fact about the business, not about the fixture
 * — a Postgres provider would want exactly the same treatment until the column
 * is populated for real. See `lib/project-departments.ts`.
 */
export const getWorkspaceSnapshot = async () => {
  const [snapshot, overrides] = await Promise.all([
    getDataSource().getSnapshot(),
    readProjectDepartments(),
  ]);
  return applyProjectDepartments(snapshot, overrides);
};
export const getTickets = (query?: TicketQuery) => getDataSource().getTickets(query);
export const getTicket = (id: string) => getDataSource().getTicket(id);
export const getProjects = async () => {
  const [projects, overrides] = await Promise.all([
    getDataSource().getProjects(),
    readProjectDepartments(),
  ]);
  return projects.map((p) =>
    overrides[p.id] ? { ...p, departmentsImpacted: overrides[p.id] } : p,
  );
};

export const getProject = async (id: string) => {
  const [project, overrides] = await Promise.all([
    getDataSource().getProject(id),
    readProjectDepartments(),
  ]);
  if (!project) return null;
  return overrides[project.id]
    ? { ...project, departmentsImpacted: overrides[project.id] }
    : project;
};
export const getSystems = () => getDataSource().getSystems();
export const getSystem = (slugOrId: string) => getDataSource().getSystem(slugOrId);
export const getSystemGraph = () => getDataSource().getSystemGraph();
export const getDiagrams = () => getDataSource().getDiagrams();
export const getDiagram = (idOrSlug: string) => getDataSource().getDiagram(idOrSlug);
export const getArticles = () => getDataSource().getArticles();
export const getArticle = (idOrSlug: string) => getDataSource().getArticle(idOrSlug);
export const getActivity = (limit?: number) => getDataSource().getActivity(limit);
export const searchEverything = (query: string, limit?: number) =>
  getDataSource().searchEverything(query, limit);

/**
 * The Command Center's data, assembled server-side.
 *
 * Returns the full snapshot because the overview genuinely draws on all of it
 * — attention queue, work queue, portfolio, impact, ticket trends, system
 * health and activity are each a different projection of the same moment.
 */
export const getDashboardData = () => getWorkspaceSnapshot();

/** The signed-in user. V1 has no authentication; see docs in mock/users.ts. */
export async function getCurrentUser() {
  const snap = await getWorkspaceSnapshot();
  const user = snap.users.find((u) => u.id === snap.currentUserId);
  if (!user) throw new Error("Current user is missing from the dataset.");
  return user;
}
