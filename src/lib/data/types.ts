import type {
  ActivityEvent,
  Diagram,
  KnowledgeArticle,
  Milestone,
  Project,
  SLAConfig,
  SystemConnection,
  Task,
  TechSystem,
  Ticket,
  TicketActivity,
  TicketComment,
  User,
} from "@/domain";

/**
 * Everything the application knows, at one moment.
 *
 * The whole working set is small — a few thousand records — so V1 loads it
 * once and derives every view from it. That is what makes filtering, search
 * and the command palette instant, and what lets an interaction update the
 * screen without a round trip.
 *
 * It is also the boundary that matters for the future: replacing the mock
 * provider with Postgres means implementing `DataSource` against real tables.
 * When the working set outgrows a single snapshot, the granular methods below
 * are already the seam to push filtering down into SQL.
 */
export type WorkspaceSnapshot = {
  /** The application's notion of "now". Mock data is anchored; see mock/now.ts. */
  now: string;
  currentUserId: string;
  users: User[];
  systems: TechSystem[];
  connections: SystemConnection[];
  tickets: Ticket[];
  ticketComments: TicketComment[];
  ticketActivity: TicketActivity[];
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  diagrams: Diagram[];
  articles: KnowledgeArticle[];
  activity: ActivityEvent[];
  slaConfig: SLAConfig;
  systemMapLayout: Record<string, { x: number; y: number }>;
};

export type TicketQuery = {
  status?: Ticket["status"][];
  priority?: Ticket["priority"][];
  category?: Ticket["category"][];
  assigneeId?: string | null;
  requesterDepartment?: string[];
  systemId?: string;
  projectId?: string;
  search?: string;
  openOnly?: boolean;
};

export type SystemGraph = {
  systems: TechSystem[];
  connections: SystemConnection[];
  layout: Record<string, { x: number; y: number }>;
};

export type SearchResultType =
  | "ticket"
  | "project"
  | "system"
  | "article"
  | "diagram";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  href: string;
  /** Higher is a better match. Used only for ordering. */
  score: number;
  badge?: string;
};

/**
 * The contract every data provider satisfies.
 *
 * Implementations available:
 *   - `mock`     — in-memory fixtures (V1)
 *   - `postgres` — planned; see prisma/schema.prisma for the intended shape
 *
 * External systems that remain their own source of truth (Salesforce, Fabric,
 * Power BI, Zapier) are expected to arrive as *adapters* composed behind this
 * interface rather than as a parallel access path, so that a page never learns
 * where a given record physically lives.
 */
export interface DataSource {
  readonly name: string;
  getSnapshot(): Promise<WorkspaceSnapshot>;
  getTickets(query?: TicketQuery): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | null>;
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  getSystems(): Promise<TechSystem[]>;
  getSystem(slugOrId: string): Promise<TechSystem | null>;
  getSystemGraph(): Promise<SystemGraph>;
  getDiagrams(): Promise<Diagram[]>;
  getDiagram(idOrSlug: string): Promise<Diagram | null>;
  getArticles(): Promise<KnowledgeArticle[]>;
  getArticle(idOrSlug: string): Promise<KnowledgeArticle | null>;
  getActivity(limit?: number): Promise<ActivityEvent[]>;
  searchEverything(query: string, limit?: number): Promise<SearchResult[]>;
}
