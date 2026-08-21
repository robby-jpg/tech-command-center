"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  CalendarDays,
  FolderKanban,
  GanttChartSquare,
  KanbanSquare,
  LayoutGrid,
  LayoutList,
  Plus,
} from "lucide-react";
import {
  PROJECT_HEALTH_ORDER,
  PROJECT_HEALTH_META,
  PROJECT_STATUS_META,
  PROJECT_STATUS_ORDER,
  quarterOf,
  type Project,
  type ProjectStatus,
} from "@/domain";
import { projectById, systemsByIds, userById } from "@/lib/selectors";
import { useActions, useSnapshot } from "@/lib/store/workspace-store";
import { formatDate, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { FacetFilter, FilterBar, SearchInput } from "@/components/shared/filter-bar";
import { PageBody } from "@/components/shared/page";
import { EmptyState } from "@/components/shared/states";
import {
  AvatarStack,
  ProgressBar,
  ProjectHealthBadge,
  SystemBadge,
  UserChip,
} from "@/components/shared/indicators";
import { useChrome } from "@/components/app/app-chrome";

export function ProjectsPage() {
  const snapshot = useSnapshot();
  const { openQuickCreate } = useChrome();
  const [view, setView] = React.useState("portfolio");

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<string[]>([]);
  const [health, setHealth] = React.useState<string[]>([]);
  const [owner, setOwner] = React.useState<string[]>([]);
  const [initiative, setInitiative] = React.useState<string[]>([]);

  const initiatives = React.useMemo(
    () => Array.from(new Set(snapshot.projects.map((p) => p.initiative))).sort(),
    [snapshot.projects],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return snapshot.projects.filter((p) => {
      if (status.length && !status.includes(p.status)) return false;
      if (health.length && !health.includes(p.health)) return false;
      if (owner.length && !owner.includes(p.ownerId)) return false;
      if (initiative.length && !initiative.includes(p.initiative)) return false;
      if (q && !`${p.name} ${p.description} ${p.businessGoal}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [snapshot.projects, search, status, health, owner, initiative]);

  const activeCount =
    (search ? 1 : 0) +
    (status.length ? 1 : 0) +
    (health.length ? 1 : 0) +
    (owner.length ? 1 : 0) +
    (initiative.length ? 1 : 0);

  const clear = () => {
    setSearch("");
    setStatus([]);
    setHealth([]);
    setOwner([]);
    setInitiative([]);
  };

  return (
    <PageBody>
      <ProjectMetrics />

      <Tabs value={view} onValueChange={setView} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList variant="pill">
            <TabsTrigger value="portfolio" variant="pill">
              <LayoutGrid className="mr-1.5 inline size-3.5" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="list" variant="pill">
              <LayoutList className="mr-1.5 inline size-3.5" />
              List
            </TabsTrigger>
            <TabsTrigger value="kanban" variant="pill">
              <KanbanSquare className="mr-1.5 inline size-3.5" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="timeline" variant="pill">
              <GanttChartSquare className="mr-1.5 inline size-3.5" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="calendar" variant="pill">
              <CalendarDays className="mr-1.5 inline size-3.5" />
              Calendar
            </TabsTrigger>
          </TabsList>

          <Button variant="primary" size="sm" onClick={() => openQuickCreate("project")}>
            <Plus />
            New project
          </Button>
        </div>

        <FilterBar
          activeCount={activeCount}
          onClear={clear}
          className="rounded-lg border border-line bg-surface px-3 py-2.5 shadow-xs"
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search projects…"
            className="w-60"
          />
          <FacetFilter
            label="Status"
            selected={status}
            onChange={setStatus}
            options={PROJECT_STATUS_ORDER.map((s) => ({
              value: s,
              label: PROJECT_STATUS_META[s].label,
              count: snapshot.projects.filter((p) => p.status === s).length,
            }))}
          />
          <FacetFilter
            label="Health"
            selected={health}
            onChange={setHealth}
            options={PROJECT_HEALTH_ORDER.map((h) => ({
              value: h,
              label: PROJECT_HEALTH_META[h].label,
              count: snapshot.projects.filter((p) => p.health === h).length,
            }))}
          />
          <FacetFilter
            label="Owner"
            selected={owner}
            onChange={setOwner}
            options={snapshot.users
              .filter((u) => u.isTechTeam)
              .map((u) => ({
                value: u.id,
                label: u.name,
                count: snapshot.projects.filter((p) => p.ownerId === u.id).length,
              }))}
          />
          <FacetFilter
            label="Initiative"
            selected={initiative}
            onChange={setInitiative}
            align="end"
            options={initiatives.map((i) => ({
              value: i,
              label: i,
              count: snapshot.projects.filter((p) => p.initiative === i).length,
            }))}
          />
        </FilterBar>

        <TabsContent value="portfolio">
          <PortfolioView projects={filtered} />
        </TabsContent>
        <TabsContent value="list">
          <ListView projects={filtered} />
        </TabsContent>
        <TabsContent value="kanban">
          <ProjectKanban projects={filtered} />
        </TabsContent>
        <TabsContent value="timeline">
          <TimelineView projects={filtered} />
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarView projects={filtered} />
        </TabsContent>
      </Tabs>
    </PageBody>
  );
}

/* ========================================================================== */
/* Metrics                                                                    */
/* ========================================================================== */

function ProjectMetrics() {
  const snapshot = useSnapshot();
  const active = snapshot.projects.filter((p) => PROJECT_STATUS_META[p.status].active);
  const thisQuarter = quarterOf(new Date(snapshot.now));

  const tiles = [
    { label: "Active", value: active.length },
    {
      label: "On track",
      value: active.filter((p) => p.health === "on_track").length,
      tone: "success" as const,
    },
    {
      label: "At risk",
      value: active.filter((p) => p.health === "at_risk").length,
      tone: "warning" as const,
    },
    {
      label: "Blocked",
      value: active.filter((p) => p.health === "blocked").length,
      tone: "critical" as const,
    },
    {
      label: "Completed this quarter",
      value: snapshot.projects.filter(
        (p) => p.completedAt && quarterOf(p.completedAt) === thisQuarter,
      ).length,
    },
    { label: "In the backlog", value: snapshot.projects.filter((p) => p.status === "backlog" || p.status === "idea").length },
  ];

  return (
    <div className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-lg border border-line bg-surface shadow-xs md:grid-cols-6">
      {tiles.map((tile) => (
        <div key={tile.label} className="px-4 py-3">
          <div
            className={cn(
              "tabular text-2xl leading-none font-semibold",
              tile.tone === "critical" && "text-critical",
              tile.tone === "warning" && "text-warning",
              tile.tone === "success" && "text-success",
              !tile.tone && "text-fg",
            )}
          >
            {tile.value}
          </div>
          <div className="mt-1.5 text-2xs text-fg-muted">{tile.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ========================================================================== */
/* Portfolio                                                                  */
/* ========================================================================== */

function PortfolioView({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return <NoProjects />;

  // Blocked first, then at risk. What needs a decision should not be below the
  // fold behind six healthy projects.
  const ordered = [...projects].sort((a, b) => {
    const rank = { blocked: 0, at_risk: 1, on_track: 2 };
    const activeRank = (p: Project) => (PROJECT_STATUS_META[p.status].active ? 0 : 1);
    return (
      activeRank(a) - activeRank(b) ||
      rank[a.health] - rank[b.health] ||
      a.targetDate.localeCompare(b.targetDate)
    );
  });

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {ordered.map((project) => (
        <PortfolioCard key={project.id} project={project} />
      ))}
    </div>
  );
}

function PortfolioCard({ project }: { project: Project }) {
  const snapshot = useSnapshot();
  const owner = userById(snapshot, project.ownerId);
  const contributors = project.contributorIds
    .map((id) => userById(snapshot, id))
    .filter((u): u is NonNullable<typeof u> => u !== null);
  const systems = systemsByIds(snapshot, project.systemIds);

  const milestones = snapshot.milestones.filter((m) => m.projectId === project.id);
  const nextMilestone = milestones
    .filter((m) => m.status !== "complete")
    .sort((a, b) => a.order - b.order)[0];

  const openTickets = snapshot.tickets.filter(
    (t) => t.relatedProjectId === project.id && t.status !== "resolved",
  ).length;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="card-interactive flex flex-col rounded-lg border border-line bg-surface p-4 shadow-xs"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-fg">{project.name}</h3>
          <p className="mt-0.5 text-[10px] tracking-wide text-fg-subtle uppercase">
            {project.initiative}
          </p>
        </div>
        <ProjectHealthBadge health={project.health} note={project.healthNote} />
      </div>

      <p className="mt-2 line-clamp-2 text-xs leading-5 text-fg-muted">
        {project.description}
      </p>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <Badge tone={PROJECT_STATUS_META[project.status].tone}>
            {PROJECT_STATUS_META[project.status].label}
          </Badge>
          <span className="tabular text-2xs text-fg-muted">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} health={project.health} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-line-soft pt-3 text-2xs">
        <div>
          <dt className="text-fg-subtle">Next milestone</dt>
          <dd className="mt-0.5 truncate text-fg-body">
            {nextMilestone ? nextMilestone.name : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-fg-subtle">Target</dt>
          <dd className="mt-0.5 text-fg-body">{formatDate(project.targetDate)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line-soft pt-2.5">
        <span className="flex items-center gap-1.5">
          <AvatarStack users={[owner, ...contributors].filter(Boolean) as never[]} max={3} />
          <span className="truncate text-2xs text-fg-subtle">{owner?.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {openTickets > 0 && (
            <span className="text-2xs text-fg-subtle">{openTickets} open</span>
          )}
          {systems.slice(0, 2).map((s) => (
            <SystemBadge key={s.id} system={s} />
          ))}
        </span>
      </div>
    </Link>
  );
}

/* ========================================================================== */
/* List                                                                       */
/* ========================================================================== */

function ListView({ projects }: { projects: Project[] }) {
  const snapshot = useSnapshot();
  const router = useRouter();

  if (projects.length === 0) return <NoProjects />;

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-xs">
      <table className="w-full">
        <thead className="bg-subtle">
          <tr className="border-b border-line">
            {["Project", "Status", "Health", "Owner", "Progress", "Target", "Systems"].map(
              (h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-2xs font-semibold tracking-wide text-fg-muted uppercase"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">
          {projects.map((project) => {
            const owner = userById(snapshot, project.ownerId);
            const systems = systemsByIds(snapshot, project.systemIds);
            return (
              <tr
                key={project.id}
                tabIndex={0}
                role="link"
                aria-label={`Open ${project.name}`}
                onClick={() => router.push(`/projects/${project.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/projects/${project.id}`);
                }}
                className="group cursor-pointer transition-colors hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-500"
              >
                <td className="px-3 py-2.5">
                  <span className="block max-w-xs truncate text-sm text-fg group-hover:text-navy-700">
                    {project.name}
                  </span>
                  <span className="block text-[10px] text-fg-subtle">
                    {project.initiative}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Badge tone={PROJECT_STATUS_META[project.status].tone}>
                    {PROJECT_STATUS_META[project.status].label}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <ProjectHealthBadge health={project.health} note={project.healthNote} />
                </td>
                <td className="px-3 py-2.5">
                  <UserChip user={owner} />
                </td>
                <td className="w-40 px-3 py-2.5">
                  <ProgressBar
                    value={project.progress}
                    health={project.health}
                    showValue
                  />
                </td>
                <td className="px-3 py-2.5 text-2xs whitespace-nowrap text-fg-muted">
                  {formatDate(project.targetDate)}
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex flex-wrap gap-1">
                    {systems.slice(0, 3).map((s) => (
                      <SystemBadge key={s.id} system={s} />
                    ))}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ========================================================================== */
/* Kanban                                                                     */
/* ========================================================================== */

function ProjectKanban({ projects }: { projects: Project[] }) {
  const actions = useActions();
  const [dragging, setDragging] = React.useState<Project | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const columns = PROJECT_STATUS_ORDER.map((status) => ({
    status,
    projects: projects.filter((p) => p.status === status),
  }));

  function onDragEnd(event: DragEndEvent) {
    setDragging(null);
    const { active, over } = event;
    if (!over) return;
    const status = over.id as ProjectStatus;
    if (!PROJECT_STATUS_ORDER.includes(status)) return;
    const project = projects.find((p) => p.id === active.id);
    if (!project || project.status === status) return;
    actions.setProjectStatus(project.id, status);
  }

  return (
    <DndContext
      id="project-kanban"
      sensors={sensors}
      onDragStart={(e) => setDragging(projects.find((p) => p.id === e.active.id) ?? null)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="scrollbar-slim flex gap-3 overflow-x-auto pb-2">
        {columns.map((column) => (
          <ProjectColumn
            key={column.status}
            status={column.status}
            projects={column.projects}
          />
        ))}
      </div>
      <DragOverlay>
        {dragging ? (
          <div className="w-64 rotate-1">
            <ProjectMiniCard project={dragging} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function ProjectColumn({
  status,
  projects,
}: {
  status: ProjectStatus;
  projects: Project[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = PROJECT_STATUS_META[status];

  return (
    <section
      ref={setNodeRef}
      aria-label={`${meta.label} — ${projects.length} projects`}
      className={cn(
        "flex w-64 shrink-0 flex-col rounded-lg border transition-colors",
        isOver ? "border-teal-300 bg-teal-50/60" : "border-line bg-sunken/60",
      )}
    >
      <header className="flex items-center gap-2 px-3 py-2.5">
        <Dot tone={meta.tone} className="size-1.5" />
        <h3 className="flex-1 truncate text-xs font-semibold text-fg">{meta.label}</h3>
        <span className="tabular rounded-full bg-surface px-1.5 py-px text-[10px] font-semibold text-fg-muted">
          {projects.length}
        </span>
      </header>
      <div className="scrollbar-slim flex max-h-[calc(100dvh-21rem)] flex-col gap-2 overflow-y-auto px-2 pb-2">
        {projects.length === 0 ? (
          <p className="rounded-md border border-dashed border-line px-3 py-5 text-center text-2xs text-fg-subtle">
            Nothing here
          </p>
        ) : (
          projects.map((p) => <DraggableProject key={p.id} project={p} />)
        )}
      </div>
    </section>
  );
}

function DraggableProject({ project }: { project: Project }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: project.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn("touch-none", isDragging && "opacity-40")}
    >
      <ProjectMiniCard project={project} />
    </div>
  );
}

function ProjectMiniCard({ project }: { project: Project }) {
  const router = useRouter();
  const snapshot = useSnapshot();
  const owner = userById(snapshot, project.ownerId);

  return (
    <article
      onClick={() => router.push(`/projects/${project.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/projects/${project.id}`);
      }}
      tabIndex={0}
      role="link"
      className="cursor-grab rounded-md border border-line bg-surface p-2.5 shadow-xs transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="line-clamp-2 text-xs leading-5 font-medium text-fg">
          {project.name}
        </h4>
      </div>
      <div className="mt-2">
        <ProgressBar value={project.progress} health={project.health} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <ProjectHealthBadge health={project.health} />
        <span className="flex items-center gap-1 text-[10px] text-fg-subtle">
          {owner?.initials}
        </span>
      </div>
    </article>
  );
}

/* ========================================================================== */
/* Timeline                                                                   */
/* ========================================================================== */

/**
 * A quarter-by-quarter bar chart of when work runs.
 *
 * Deliberately not a Gantt: there are no dependencies drawn, no critical path
 * and no drag-to-reschedule. What a technology department actually needs from
 * this view is "what overlaps, and what lands when" — everything past that is
 * a second tool pretending to be a plan.
 */
function TimelineView({ projects }: { projects: Project[] }) {
  const snapshot = useSnapshot();
  if (projects.length === 0) return <NoProjects />;

  const dated = projects.filter((p) => p.startDate && p.targetDate);
  const start = Math.min(...dated.map((p) => new Date(p.startDate).getTime()));
  const end = Math.max(
    ...dated.map((p) => new Date(p.completedAt ?? p.targetDate).getTime()),
  );
  const span = Math.max(end - start, 1);
  const nowOffset = ((new Date(snapshot.now).getTime() - start) / span) * 100;

  // Quarter gridlines across the whole span.
  const marks: { label: string; offset: number }[] = [];
  const cursor = new Date(start);
  cursor.setUTCDate(1);
  cursor.setUTCMonth(Math.floor(cursor.getUTCMonth() / 3) * 3);
  while (cursor.getTime() < end) {
    marks.push({
      label: quarterOf(cursor),
      offset: ((cursor.getTime() - start) / span) * 100,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 3);
  }

  const ordered = [...dated].sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
        <span className="text-2xs text-fg-subtle">
          {ordered.length} projects · quarter gridlines
        </span>
      </CardHeader>

      <div className="relative overflow-x-auto">
        {/* Quarter header */}
        <div className="relative ml-56 h-7 border-b border-line-soft">
          {marks.map((mark) => (
            <div
              key={mark.label}
              className="absolute top-0 h-full border-l border-line-soft pl-1.5 text-[10px] leading-7 text-fg-subtle"
              style={{ left: `${mark.offset}%` }}
            >
              {mark.label}
            </div>
          ))}
        </div>

        <ul className="divide-y divide-line-soft">
          {ordered.map((project) => {
            const s = new Date(project.startDate).getTime();
            const e = new Date(project.completedAt ?? project.targetDate).getTime();
            const left = ((s - start) / span) * 100;
            const width = Math.max(((e - s) / span) * 100, 1.5);

            return (
              <li key={project.id} className="flex items-center hover:bg-subtle">
                <Link
                  href={`/projects/${project.id}`}
                  className="w-56 shrink-0 truncate px-3 py-2.5 text-xs text-fg hover:text-navy-700"
                >
                  {project.name}
                </Link>
                <div className="relative h-10 flex-1">
                  {marks.map((mark) => (
                    <div
                      key={mark.label}
                      className="absolute top-0 h-full border-l border-line-soft"
                      style={{ left: `${mark.offset}%` }}
                    />
                  ))}
                  <Link
                    href={`/projects/${project.id}`}
                    title={`${project.name} · ${formatDate(project.startDate)} → ${formatDate(project.completedAt ?? project.targetDate)}`}
                    className={cn(
                      "absolute top-1/2 flex h-5 -translate-y-1/2 items-center overflow-hidden rounded-sm px-1.5 text-[10px] font-medium text-white transition-opacity hover:opacity-90",
                      project.health === "blocked"
                        ? "bg-critical"
                        : project.health === "at_risk"
                          ? "bg-warning"
                          : project.status === "complete"
                            ? "bg-navy-300"
                            : "bg-teal-500",
                    )}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <span className="truncate">{project.progress}%</span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Today */}
        {nowOffset >= 0 && nowOffset <= 100 && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 ml-56 border-l-2 border-dashed border-navy-400/60"
            style={{ left: `calc(${nowOffset}% * (100% - 14rem) / 100%)` }}
            aria-hidden
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-line-soft px-4 py-2">
        {[
          { label: "On track", className: "bg-teal-500" },
          { label: "At risk", className: "bg-warning" },
          { label: "Blocked", className: "bg-critical" },
          { label: "Complete", className: "bg-navy-300" },
        ].map((key) => (
          <span key={key.label} className="flex items-center gap-1.5 text-2xs text-fg-muted">
            <span className={cn("size-2 rounded-xs", key.className)} />
            {key.label}
          </span>
        ))}
      </div>
    </Card>
  );
}

/* ========================================================================== */
/* Calendar                                                                   */
/* ========================================================================== */

/** A month grid of what is due: milestones and project target dates. */
function CalendarView({ projects }: { projects: Project[] }) {
  const snapshot = useSnapshot();
  const [monthOffset, setMonthOffset] = React.useState(0);

  const base = new Date(snapshot.now);
  const month = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + monthOffset, 1),
  );

  const firstWeekday = month.getUTCDay();
  const daysInMonth = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate();

  const events = React.useMemo(() => {
    // Built inside the memo: constructing the Set outside would create a new
    // identity on every render and defeat the memo entirely.
    const projectIds = new Set(projects.map((p) => p.id));
    const map = new Map<
      string,
      { label: string; href: string; kind: "milestone" | "target" }[]
    >();
    const push = (
      date: string,
      item: { label: string; href: string; kind: "milestone" | "target" },
    ) => {
      const key = date.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), item]);
    };

    for (const m of snapshot.milestones) {
      if (!projectIds.has(m.projectId)) continue;
      push(m.targetDate, {
        label: m.name,
        href: `/projects/${m.projectId}?tab=milestones`,
        kind: "milestone",
      });
    }
    for (const p of projects) {
      push(p.targetDate, {
        label: `${p.name} — target`,
        href: `/projects/${p.id}`,
        kind: "target",
      });
    }
    return map;
  }, [snapshot.milestones, projects]);

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = new Date(snapshot.now).toISOString().slice(0, 10);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>
          {month.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="xs" onClick={() => setMonthOffset((m) => m - 1)}>
            Previous
          </Button>
          <Button variant="secondary" size="xs" onClick={() => setMonthOffset(0)}>
            Today
          </Button>
          <Button variant="secondary" size="xs" onClick={() => setMonthOffset((m) => m + 1)}>
            Next
          </Button>
        </div>
      </CardHeader>

      <div className="grid grid-cols-7 border-b border-line-soft bg-subtle">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="px-2 py-1.5 text-center text-[10px] font-semibold tracking-wide text-fg-subtle uppercase"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          const key =
            day === null
              ? null
              : new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day))
                  .toISOString()
                  .slice(0, 10);
          const dayEvents = key ? (events.get(key) ?? []) : [];
          const isToday = key === todayKey;

          return (
            <div
              key={index}
              className={cn(
                "min-h-24 border-r border-b border-line-soft p-1.5 last:border-r-0",
                day === null && "bg-subtle/40",
                isToday && "bg-teal-50/50",
              )}
            >
              {day !== null && (
                <>
                  <span
                    className={cn(
                      "tabular inline-flex size-5 items-center justify-center rounded-full text-[10px]",
                      isToday
                        ? "bg-navy-600 font-semibold text-white"
                        : "text-fg-subtle",
                    )}
                  >
                    {day}
                  </span>
                  <ul className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <li key={i}>
                        <Link
                          href={event.href}
                          title={event.label}
                          className={cn(
                            "block truncate rounded-xs px-1 py-0.5 text-[10px] transition-colors",
                            event.kind === "milestone"
                              ? "bg-teal-50 text-teal-700 hover:bg-teal-100"
                              : "bg-navy-50 text-navy-700 hover:bg-navy-100",
                          )}
                        >
                          {event.label}
                        </Link>
                      </li>
                    ))}
                    {dayEvents.length > 3 && (
                      <li className="px-1 text-[10px] text-fg-subtle">
                        +{dayEvents.length - 3} more
                      </li>
                    )}
                  </ul>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ========================================================================== */

function NoProjects() {
  const { openQuickCreate } = useChrome();
  return (
    <Card>
      <EmptyState
        icon={FolderKanban}
        title="No projects match these filters."
        description="Clear a filter to see the rest of the portfolio, or start something new."
        action={
          <Button variant="primary" size="sm" onClick={() => openQuickCreate("project")}>
            <Plus />
            New project
          </Button>
        }
      />
    </Card>
  );
}

export { formatDateShort, projectById };
