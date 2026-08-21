"use client";

import * as React from "react";
import {
  DIAGRAM_TYPE_META,
  PROJECT_STATUS_META,
  TASK_STATUS_META,
  TICKET_PRIORITY_META,
  TICKET_STATUS_META,
  createTicketInputSchema,
  type ActivityEvent,
  type CreateTicketInput,
  type ConnectionMethod,
  type Diagram,
  type DiagramEdge,
  type DiagramNode,
  type DiagramType,
  type KnowledgeArticle,
  type Project,
  type SystemConnection,
  type SystemHealth,
  type Task,
  type TaskStatus,
  type TechSystem,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
} from "@/domain";
import type { WorkspaceSnapshot } from "@/lib/data/types";
import { newId } from "@/lib/utils";

/**
 * The working set, client-side.
 *
 * The server renders from the data layer; this holds the same snapshot in
 * memory so an interaction — changing a status, dragging a card, adding a
 * comment, moving a node — updates the screen immediately instead of waiting
 * on a round trip.
 *
 * Every mutation below is the shape the equivalent server action will take.
 * When Postgres arrives, each becomes an optimistic update followed by a
 * request; the components calling them do not change.
 */

const STORAGE_KEY = "tcc.workspace.v1";

type Ctx = {
  snapshot: WorkspaceSnapshot;
  actions: Actions;
  reset: () => void;
  /** True when the session has diverged from the seeded dataset. */
  dirty: boolean;
};

const WorkspaceContext = React.createContext<Ctx | null>(null);

export function useWorkspace(): Ctx {
  const ctx = React.useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used inside <WorkspaceProvider>.");
  }
  return ctx;
}

/** Convenience for the common case of reading the snapshot. */
export function useSnapshot(): WorkspaceSnapshot {
  return useWorkspace().snapshot;
}

export function useActions(): Actions {
  return useWorkspace().actions;
}

/* -------------------------------------------------------------------------- */
/* Reducer                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * `dirty` lives in the reducer rather than in its own `useState` so that
 * adopting the stored overlay is a single transition. Keeping it separate
 * meant the hydration effect had to call `setState` alongside the dispatch,
 * which triggers a cascading render.
 */
type State = { snapshot: WorkspaceSnapshot; dirty: boolean };

type Action =
  | { type: "adopt"; snapshot: WorkspaceSnapshot }
  | { type: "reset"; snapshot: WorkspaceSnapshot }
  | { type: "apply"; fn: (s: WorkspaceSnapshot) => WorkspaceSnapshot };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "adopt":
      return { snapshot: action.snapshot, dirty: true };
    case "reset":
      return { snapshot: action.snapshot, dirty: false };
    case "apply":
      return { snapshot: action.fn(state.snapshot), dirty: true };
  }
}

/* -------------------------------------------------------------------------- */
/* Provider                                                                   */
/* -------------------------------------------------------------------------- */

export function WorkspaceProvider({
  initial,
  children,
}: {
  initial: WorkspaceSnapshot;
  children: React.ReactNode;
}) {
  const [state, dispatch] = React.useReducer(reducer, {
    snapshot: initial,
    dirty: false,
  });
  const hydratedRef = React.useRef(false);

  // The stored overlay is adopted after mount, never during render — reading
  // localStorage while rendering would make the server and client markup
  // disagree and produce a hydration mismatch.
  React.useEffect(() => {
    let restored: WorkspaceSnapshot | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WorkspaceSnapshot;
        if (parsed?.now === initial.now) {
          restored = parsed;
        } else {
          // Seed data has moved on; the overlay would be inconsistent with it.
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // A corrupt or unavailable store is not worth failing the app over.
    }

    hydratedRef.current = true;
    if (restored) dispatch({ type: "adopt", snapshot: restored });
  }, [initial.now]);

  React.useEffect(() => {
    if (!hydratedRef.current || !state.dirty) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.snapshot));
    } catch {
      // Quota exceeded, private mode, and so on. The session still works.
    }
  }, [state.snapshot, state.dirty]);

  const mutate = React.useCallback(
    (fn: (s: WorkspaceSnapshot) => WorkspaceSnapshot) => {
      dispatch({ type: "apply", fn });
    },
    [],
  );

  const reset = React.useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    dispatch({ type: "reset", snapshot: initial });
  }, [initial]);

  const actions = React.useMemo(() => createActions(mutate), [mutate]);

  const value = React.useMemo<Ctx>(
    () => ({
      snapshot: state.snapshot,
      actions,
      reset,
      dirty: state.dirty,
    }),
    [state.snapshot, state.dirty, actions, reset],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

type Mutate = (fn: (s: WorkspaceSnapshot) => WorkspaceSnapshot) => void;

export type Actions = ReturnType<typeof createActions>;

function createActions(mutate: Mutate) {
  /** Records an audit entry alongside whatever else changed. */
  function withEvent(
    s: WorkspaceSnapshot,
    event: Omit<ActivityEvent, "id" | "createdAt"> & { createdAt?: string },
  ): WorkspaceSnapshot {
    const full: ActivityEvent = {
      id: newId("ae"),
      createdAt: event.createdAt ?? s.now,
      ...event,
    };
    return { ...s, activity: [full, ...s.activity] };
  }

  const mapTicket = (
    s: WorkspaceSnapshot,
    id: string,
    fn: (t: Ticket) => Ticket,
  ): Ticket[] => s.tickets.map((t) => (t.id === id ? fn(t) : t));

  return {
    /* ---------------------------------------------------------------- Tickets */

    createTicket(input: CreateTicketInput): string {
      const parsed = createTicketInputSchema.parse(input);
      const id = newId("t");

      mutate((s) => {
        // Continue the existing sequence rather than restarting it.
        const highest = s.tickets.reduce((max, t) => {
          const n = Number(t.ticketNumber.replace("KHT-", ""));
          return Number.isFinite(n) && n > max ? n : max;
        }, 1000);
        const ticketNumber = `KHT-${highest + 1}`;

        const target = s.slaConfig.targets[parsed.priority];
        const ticket: Ticket = {
          id,
          ticketNumber,
          title: parsed.title,
          description: parsed.description,
          status: "new",
          priority: parsed.priority,
          category: parsed.category,
          requesterId: parsed.requesterId,
          requesterDepartment: parsed.requesterDepartment,
          assigneeId: parsed.assigneeId,
          createdAt: s.now,
          updatedAt: s.now,
          firstResponseAt: null,
          resolvedAt: null,
          dueDate: null,
          slaDueAt: target
            ? new Date(
                new Date(s.now).getTime() + target.resolutionMinutes * 60_000,
              ).toISOString()
            : null,
          estimatedEffortHours: null,
          actualTimeSpentHours: null,
          businessImpact: parsed.businessImpact,
          urgency: parsed.urgency,
          source: parsed.source,
          tags: parsed.tags,
          relatedSystemIds: parsed.relatedSystemIds,
          relatedProjectId: parsed.relatedProjectId,
          relatedTicketIds: [],
          relatedArticleIds: [],
          attachments: [],
          watcherIds: [],
          reopenCount: 0,
        };

        return withEvent(
          {
            ...s,
            tickets: [ticket, ...s.tickets],
            ticketActivity: [
              ...s.ticketActivity,
              {
                id: newId("ta"),
                ticketId: id,
                kind: "created",
                actorId: parsed.requesterId,
                from: null,
                to: null,
                detail: null,
                createdAt: s.now,
              },
            ],
          },
          {
            entityType: "ticket",
            entityId: id,
            entityLabel: ticketNumber,
            action: "created",
            actorId: parsed.requesterId,
            summary: `submitted ${ticketNumber} — ${parsed.title}`,
            detail: null,
            href: `/tickets/${id}`,
            significant: parsed.priority === "critical",
          },
        );
      });

      return id;
    },

    setTicketStatus(id: string, status: TicketStatus, actorId?: string) {
      mutate((s) => {
        const before = s.tickets.find((t) => t.id === id);
        if (!before || before.status === status) return s;
        const actor = actorId ?? s.currentUserId;

        const tickets = mapTicket(s, id, (t) => ({
          ...t,
          status,
          updatedAt: s.now,
          // Resolving stamps the time; reopening clears it and counts the
          // reopen, which is what the reopened-rate metric reads.
          resolvedAt: status === "resolved" ? s.now : null,
          reopenCount:
            t.status === "resolved" && status !== "resolved"
              ? t.reopenCount + 1
              : t.reopenCount,
          // Any human touch counts as the first response.
          firstResponseAt: t.firstResponseAt ?? s.now,
        }));

        return withEvent(
          {
            ...s,
            tickets,
            ticketActivity: [
              ...s.ticketActivity,
              {
                id: newId("ta"),
                ticketId: id,
                kind: status === "resolved" ? "resolved" : "status_changed",
                actorId: actor,
                from: TICKET_STATUS_META[before.status].label,
                to: TICKET_STATUS_META[status].label,
                detail: null,
                createdAt: s.now,
              },
            ],
          },
          {
            entityType: "ticket",
            entityId: id,
            entityLabel: before.ticketNumber,
            action: status === "resolved" ? "resolved" : "status_changed",
            actorId: actor,
            summary:
              status === "resolved"
                ? `resolved ${before.ticketNumber} — ${before.title}`
                : `moved ${before.ticketNumber} to ${TICKET_STATUS_META[status].label}`,
            detail: before.title,
            href: `/tickets/${id}`,
            significant: status === "blocked" || status === "resolved",
          },
        );
      });
    },

    setTicketPriority(id: string, priority: TicketPriority) {
      mutate((s) => {
        const before = s.tickets.find((t) => t.id === id);
        if (!before || before.priority === priority) return s;

        // The SLA clock is a function of priority, so re-derive it.
        const target = s.slaConfig.targets[priority];
        const tickets = mapTicket(s, id, (t) => ({
          ...t,
          priority,
          updatedAt: s.now,
          slaDueAt: target
            ? new Date(
                new Date(t.createdAt).getTime() + target.resolutionMinutes * 60_000,
              ).toISOString()
            : t.slaDueAt,
        }));

        return {
          ...s,
          tickets,
          ticketActivity: [
            ...s.ticketActivity,
            {
              id: newId("ta"),
              ticketId: id,
              kind: "priority_changed",
              actorId: s.currentUserId,
              from: TICKET_PRIORITY_META[before.priority].label,
              to: TICKET_PRIORITY_META[priority].label,
              detail: null,
              createdAt: s.now,
            },
          ],
        };
      });
    },

    assignTicket(id: string, assigneeId: string | null) {
      mutate((s) => {
        const before = s.tickets.find((t) => t.id === id);
        if (!before || before.assigneeId === assigneeId) return s;
        const assignee = s.users.find((u) => u.id === assigneeId);

        return withEvent(
          {
            ...s,
            tickets: mapTicket(s, id, (t) => ({
              ...t,
              assigneeId,
              updatedAt: s.now,
              firstResponseAt: t.firstResponseAt ?? (assigneeId ? s.now : null),
            })),
            ticketActivity: [
              ...s.ticketActivity,
              {
                id: newId("ta"),
                ticketId: id,
                kind: assigneeId ? "assigned" : "unassigned",
                actorId: s.currentUserId,
                from: s.users.find((u) => u.id === before.assigneeId)?.name ?? null,
                to: assignee?.name ?? null,
                detail: null,
                createdAt: s.now,
              },
            ],
          },
          {
            entityType: "ticket",
            entityId: id,
            entityLabel: before.ticketNumber,
            action: "assigned",
            actorId: s.currentUserId,
            summary: assignee
              ? `assigned ${before.ticketNumber} to ${assignee.name}`
              : `unassigned ${before.ticketNumber}`,
            detail: before.title,
            href: `/tickets/${id}`,
            significant: false,
          },
        );
      });
    },

    updateTicket(id: string, patch: Partial<Ticket>) {
      mutate((s) => ({
        ...s,
        tickets: mapTicket(s, id, (t) => ({ ...t, ...patch, updatedAt: s.now })),
      }));
    },

    addComment(ticketId: string, body: string, internal = false) {
      const trimmed = body.trim();
      if (!trimmed) return;

      mutate((s) => {
        const ticket = s.tickets.find((t) => t.id === ticketId);
        return withEvent(
          {
            ...s,
            ticketComments: [
              ...s.ticketComments,
              {
                id: newId("c"),
                ticketId,
                authorId: s.currentUserId,
                body: trimmed,
                createdAt: s.now,
                internal,
                attachments: [],
              },
            ],
            tickets: mapTicket(s, ticketId, (t) => ({
              ...t,
              updatedAt: s.now,
              firstResponseAt: t.firstResponseAt ?? s.now,
            })),
          },
          {
            entityType: "ticket",
            entityId: ticketId,
            entityLabel: ticket?.ticketNumber ?? ticketId,
            action: "commented",
            actorId: s.currentUserId,
            summary: `commented on ${ticket?.ticketNumber ?? "a ticket"}`,
            detail: trimmed.slice(0, 120),
            href: `/tickets/${ticketId}`,
            significant: false,
          },
        );
      });
    },

    bulkAssign(ids: string[], assigneeId: string | null) {
      mutate((s) => ({
        ...s,
        tickets: s.tickets.map((t) =>
          ids.includes(t.id)
            ? {
                ...t,
                assigneeId,
                updatedAt: s.now,
                firstResponseAt: t.firstResponseAt ?? (assigneeId ? s.now : null),
              }
            : t,
        ),
      }));
    },

    bulkStatus(ids: string[], status: TicketStatus) {
      mutate((s) => ({
        ...s,
        tickets: s.tickets.map((t) =>
          ids.includes(t.id)
            ? {
                ...t,
                status,
                updatedAt: s.now,
                resolvedAt: status === "resolved" ? s.now : null,
                firstResponseAt: t.firstResponseAt ?? s.now,
              }
            : t,
        ),
      }));
    },

    linkTicketToProject(ticketId: string, projectId: string | null) {
      mutate((s) => ({
        ...s,
        tickets: mapTicket(s, ticketId, (t) => ({
          ...t,
          relatedProjectId: projectId,
          updatedAt: s.now,
        })),
      }));
    },

    toggleTicketSystem(ticketId: string, systemId: string) {
      mutate((s) => ({
        ...s,
        tickets: mapTicket(s, ticketId, (t) => ({
          ...t,
          relatedSystemIds: t.relatedSystemIds.includes(systemId)
            ? t.relatedSystemIds.filter((id) => id !== systemId)
            : [...t.relatedSystemIds, systemId],
          updatedAt: s.now,
        })),
      }));
    },

    toggleWatcher(ticketId: string, userId: string) {
      mutate((s) => ({
        ...s,
        tickets: mapTicket(s, ticketId, (t) => ({
          ...t,
          watcherIds: t.watcherIds.includes(userId)
            ? t.watcherIds.filter((id) => id !== userId)
            : [...t.watcherIds, userId],
        })),
      }));
    },

    /* --------------------------------------------------------------- Projects */

    createProject(input: {
      name: string;
      description?: string;
      businessGoal?: string;
      ownerId: string;
      status?: Project["status"];
      priority?: Project["priority"];
      targetDate?: string;
      systemIds?: string[];
      initiative?: string;
    }): string {
      const id = newId("p");
      mutate((s) => {
        const project: Project = {
          id,
          slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          name: input.name,
          description: input.description ?? "",
          businessGoal: input.businessGoal ?? "",
          expectedImpact: "",
          ownerId: input.ownerId,
          contributorIds: [],
          status: input.status ?? "planning",
          health: "on_track",
          healthNote: null,
          priority: input.priority ?? "normal",
          startDate: s.now,
          targetDate:
            input.targetDate ??
            new Date(new Date(s.now).getTime() + 60 * 86_400_000).toISOString(),
          completedAt: null,
          progress: 0,
          estimatedHoursSavedMonthly: 0,
          actualHoursSavedMonthly: null,
          manualProcessesEliminated: 0,
          automationsCreated: 0,
          departmentsImpacted: [],
          systemIds: input.systemIds ?? [],
          tags: [],
          dependsOnProjectIds: [],
          relatedArticleIds: [],
          relatedDiagramIds: [],
          initiative: input.initiative ?? "Unassigned",
          createdAt: s.now,
          updatedAt: s.now,
        };

        return withEvent(
          { ...s, projects: [project, ...s.projects] },
          {
            entityType: "project",
            entityId: id,
            entityLabel: project.name,
            action: "created",
            actorId: input.ownerId,
            summary: `created the project ${project.name}`,
            detail: null,
            href: `/projects/${id}`,
            significant: false,
          },
        );
      });
      return id;
    },

    updateProject(id: string, patch: Partial<Project>) {
      mutate((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id === id
            ? {
                ...p,
                ...patch,
                updatedAt: s.now,
                completedAt:
                  patch.status === "complete" ? (p.completedAt ?? s.now) : p.completedAt,
                progress: patch.status === "complete" ? 100 : (patch.progress ?? p.progress),
              }
            : p,
        ),
      }));
    },

    setProjectStatus(id: string, status: Project["status"]) {
      mutate((s) => {
        const before = s.projects.find((p) => p.id === id);
        if (!before || before.status === status) return s;
        return withEvent(
          {
            ...s,
            projects: s.projects.map((p) =>
              p.id === id
                ? {
                    ...p,
                    status,
                    updatedAt: s.now,
                    completedAt: status === "complete" ? (p.completedAt ?? s.now) : null,
                    progress: status === "complete" ? 100 : p.progress,
                  }
                : p,
            ),
          },
          {
            entityType: "project",
            entityId: id,
            entityLabel: before.name,
            action: status === "complete" ? "completed" : "status_changed",
            actorId: s.currentUserId,
            summary:
              status === "complete"
                ? `completed ${before.name}`
                : `moved ${before.name} to ${PROJECT_STATUS_META[status].label}`,
            detail: null,
            href: `/projects/${id}`,
            significant: status === "complete",
          },
        );
      });
    },

    /* ------------------------------------------------------------------ Tasks */

    createTask(projectId: string, title: string, opts?: Partial<Task>) {
      const id = newId("tk");
      mutate((s) => {
        const siblings = s.tasks.filter((t) => t.projectId === projectId);
        const task: Task = {
          id,
          projectId,
          parentTaskId: null,
          milestoneId: null,
          title,
          description: "",
          ownerId: s.currentUserId,
          status: "todo",
          priority: "normal",
          dueDate: null,
          estimatedHours: null,
          actualHours: null,
          dependsOnTaskIds: [],
          createdAt: s.now,
          updatedAt: s.now,
          order: siblings.length + 1,
          ...opts,
        };
        return { ...s, tasks: [...s.tasks, task] };
      });
      return id;
    },

    setTaskStatus(id: string, status: TaskStatus) {
      mutate((s) => {
        const tasks = s.tasks.map((t) =>
          t.id === id ? { ...t, status, updatedAt: s.now } : t,
        );
        // Project progress follows completed tasks, so the two never disagree.
        const task = s.tasks.find((t) => t.id === id);
        if (!task) return { ...s, tasks };

        const projectTasks = tasks.filter((t) => t.projectId === task.projectId);
        const doneCount = projectTasks.filter((t) => TASK_STATUS_META[t.status].done).length;
        const progress =
          projectTasks.length === 0
            ? 0
            : Math.round((doneCount / projectTasks.length) * 100);

        return {
          ...s,
          tasks,
          projects: s.projects.map((p) =>
            p.id === task.projectId && p.status !== "complete"
              ? { ...p, progress, updatedAt: s.now }
              : p,
          ),
        };
      });
    },

    updateTask(id: string, patch: Partial<Task>) {
      mutate((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: s.now } : t)),
      }));
    },

    deleteTask(id: string) {
      mutate((s) => ({
        ...s,
        tasks: s.tasks.filter((t) => t.id !== id && t.parentTaskId !== id),
      }));
    },

    completeMilestone(id: string) {
      mutate((s) => ({
        ...s,
        milestones: s.milestones.map((m) =>
          m.id === id
            ? m.completedAt
              ? { ...m, completedAt: null, status: "in_progress" as const }
              : { ...m, completedAt: s.now, status: "complete" as const }
            : m,
        ),
      }));
    },

    /* --------------------------------------------------------------- Diagrams */

    createDiagram(name: string, type: DiagramType): string {
      const id = newId("dg");
      mutate((s) => {
        const diagram: Diagram = {
          id,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          name,
          description: DIAGRAM_TYPE_META[type].description,
          type,
          nodes: [
            {
              id: newId("n"),
              kind: "start",
              label: "Start",
              description: "",
              position: { x: 120, y: 120 },
              systemId: null,
            },
          ],
          edges: [],
          relatedSystemIds: [],
          relatedProjectIds: [],
          relatedTicketIds: [],
          relatedArticleIds: [],
          createdById: s.currentUserId,
          createdAt: s.now,
          updatedAt: s.now,
        };
        return withEvent(
          { ...s, diagrams: [diagram, ...s.diagrams] },
          {
            entityType: "diagram",
            entityId: id,
            entityLabel: name,
            action: "created",
            actorId: s.currentUserId,
            summary: `created the diagram ${name}`,
            detail: null,
            href: `/diagrams/${id}`,
            significant: false,
          },
        );
      });
      return id;
    },

    saveDiagram(id: string, patch: Partial<Pick<Diagram, "nodes" | "edges" | "name" | "description" | "type">>) {
      mutate((s) => ({
        ...s,
        diagrams: s.diagrams.map((d) =>
          d.id === id ? { ...d, ...patch, updatedAt: s.now } : d,
        ),
      }));
    },

    addDiagramNode(diagramId: string, node: Omit<DiagramNode, "id">): string {
      const id = newId("n");
      mutate((s) => ({
        ...s,
        diagrams: s.diagrams.map((d) =>
          d.id === diagramId
            ? { ...d, nodes: [...d.nodes, { ...node, id }], updatedAt: s.now }
            : d,
        ),
      }));
      return id;
    },

    updateDiagramNode(diagramId: string, nodeId: string, patch: Partial<DiagramNode>) {
      mutate((s) => ({
        ...s,
        diagrams: s.diagrams.map((d) =>
          d.id === diagramId
            ? {
                ...d,
                nodes: d.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
                updatedAt: s.now,
              }
            : d,
        ),
      }));
    },

    deleteDiagramNode(diagramId: string, nodeId: string) {
      mutate((s) => ({
        ...s,
        diagrams: s.diagrams.map((d) =>
          d.id === diagramId
            ? {
                ...d,
                nodes: d.nodes.filter((n) => n.id !== nodeId),
                edges: d.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
                updatedAt: s.now,
              }
            : d,
        ),
      }));
    },

    addDiagramEdge(diagramId: string, edge: Omit<DiagramEdge, "id">) {
      mutate((s) => ({
        ...s,
        diagrams: s.diagrams.map((d) =>
          d.id === diagramId
            ? {
                ...d,
                edges: [...d.edges, { ...edge, id: newId("e") }],
                updatedAt: s.now,
              }
            : d,
        ),
      }));
    },

    updateDiagramEdge(diagramId: string, edgeId: string, patch: Partial<DiagramEdge>) {
      mutate((s) => ({
        ...s,
        diagrams: s.diagrams.map((d) =>
          d.id === diagramId
            ? {
                ...d,
                edges: d.edges.map((e) => (e.id === edgeId ? { ...e, ...patch } : e)),
                updatedAt: s.now,
              }
            : d,
        ),
      }));
    },

    deleteDiagramEdge(diagramId: string, edgeId: string) {
      mutate((s) => ({
        ...s,
        diagrams: s.diagrams.map((d) =>
          d.id === diagramId
            ? { ...d, edges: d.edges.filter((e) => e.id !== edgeId), updatedAt: s.now }
            : d,
        ),
      }));
    },

    duplicateDiagram(id: string): string {
      const newDiagramId = newId("dg");
      mutate((s) => {
        const source = s.diagrams.find((d) => d.id === id);
        if (!source) return s;
        const copy: Diagram = {
          ...source,
          id: newDiagramId,
          slug: `${source.slug}-copy`,
          name: `${source.name} (copy)`,
          createdById: s.currentUserId,
          createdAt: s.now,
          updatedAt: s.now,
        };
        return { ...s, diagrams: [copy, ...s.diagrams] };
      });
      return newDiagramId;
    },

    deleteDiagram(id: string) {
      mutate((s) => ({ ...s, diagrams: s.diagrams.filter((d) => d.id !== id) }));
    },

    /* ---------------------------------------------------------------- Systems */

    setSystemHealth(id: string, health: SystemHealth, note: string | null) {
      mutate((s) => {
        const before = s.systems.find((sys) => sys.id === id);
        if (!before) return s;
        return withEvent(
          {
            ...s,
            systems: s.systems.map((sys) =>
              sys.id === id
                ? {
                    ...sys,
                    health,
                    healthNote: note,
                    healthChangedAt: s.now,
                    updatedAt: s.now,
                    changeLog: [
                      {
                        id: newId("sc"),
                        at: s.now,
                        actorId: s.currentUserId,
                        summary: note ?? `Health set to ${health}.`,
                        kind: "health" as const,
                      },
                      ...sys.changeLog,
                    ],
                  }
                : sys,
            ),
          },
          {
            entityType: "system",
            entityId: id,
            entityLabel: before.name,
            action: "health_changed",
            actorId: s.currentUserId,
            summary: `changed ${before.name} health to ${health.replace(/_/g, " ")}`,
            detail: note,
            href: `/systems/${before.slug}`,
            significant: true,
          },
        );
      });
    },

    addSystem(input: {
      name: string;
      description: string;
      kind: TechSystem["kind"];
      criticality: TechSystem["criticality"];
      ownerId: string;
    }): string {
      const id = newId("sys");
      mutate((s) => {
        const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const system: TechSystem = {
          id,
          slug,
          name: input.name,
          shortName: input.name,
          description: input.description,
          purpose: "",
          kind: input.kind,
          health: "operational",
          healthNote: null,
          healthChangedAt: s.now,
          criticality: input.criticality,
          ownerId: input.ownerId,
          ownerTeam: "Tech Department",
          businessTeams: [],
          vendor: null,
          adminUrl: null,
          credentialEnvKey: null,
          tags: [],
          changeLog: [],
          createdAt: s.now,
          updatedAt: s.now,
        };
        // A new system needs somewhere to sit on the map.
        const used = Object.values(s.systemMapLayout);
        const y = used.length ? Math.max(...used.map((p) => p.y)) + 130 : 40;
        return {
          ...s,
          systems: [...s.systems, system],
          systemMapLayout: { ...s.systemMapLayout, [id]: { x: 640, y } },
        };
      });
      return id;
    },

    moveSystemOnMap(systemId: string, position: { x: number; y: number }) {
      mutate((s) => ({
        ...s,
        systemMapLayout: { ...s.systemMapLayout, [systemId]: position },
      }));
    },

    addConnection(input: {
      sourceSystemId: string;
      targetSystemId: string;
      method: ConnectionMethod;
      dataDescription?: string;
    }) {
      mutate((s) => ({
        ...s,
        connections: [
          ...s.connections,
          {
            id: newId("cx"),
            sourceSystemId: input.sourceSystemId,
            targetSystemId: input.targetSystemId,
            method: input.method,
            dataDescription: input.dataDescription ?? "Not yet documented",
            frequency: "Not yet documented",
            direction: "one_way" as const,
            ownerId: s.currentUserId,
            description: "",
            health: "operational" as const,
          },
        ],
      }));
    },

    updateConnection(id: string, patch: Partial<SystemConnection>) {
      mutate((s) => ({
        ...s,
        connections: s.connections.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));
    },

    deleteConnection(id: string) {
      mutate((s) => ({ ...s, connections: s.connections.filter((c) => c.id !== id) }));
    },

    /* ------------------------------------------------------------- Knowledge */

    createArticle(input: {
      title: string;
      summary: string;
      content: string;
      category: KnowledgeArticle["category"];
    }): string {
      const id = newId("kb");
      mutate((s) => {
        const article: KnowledgeArticle = {
          id,
          slug: input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          title: input.title,
          summary: input.summary,
          content: input.content,
          authorId: s.currentUserId,
          category: input.category,
          tags: [],
          relatedSystemIds: [],
          relatedProjectIds: [],
          relatedDiagramIds: [],
          relatedTicketIds: [],
          createdAt: s.now,
          updatedAt: s.now,
          views: 0,
        };
        return withEvent(
          { ...s, articles: [article, ...s.articles] },
          {
            entityType: "article",
            entityId: id,
            entityLabel: article.title,
            action: "published",
            actorId: s.currentUserId,
            summary: `published ${article.title}`,
            detail: null,
            href: `/knowledge/${article.slug}`,
            significant: false,
          },
        );
      });
      return id;
    },

    updateArticle(id: string, patch: Partial<KnowledgeArticle>) {
      mutate((s) => ({
        ...s,
        articles: s.articles.map((a) =>
          a.id === id ? { ...a, ...patch, updatedAt: s.now } : a,
        ),
      }));
    },
  };
}
