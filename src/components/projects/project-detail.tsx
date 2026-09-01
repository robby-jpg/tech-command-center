"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  CircleAlert,
  Flag,
  FolderKanban,
  Plus,
  Ticket as TicketIcon,
  Workflow,
} from "lucide-react";
import {
  MILESTONE_STATUS_META,
  PROJECT_HEALTH_META,
  PROJECT_HEALTH_ORDER,
  PROJECT_STATUS_META,
  PROJECT_STATUS_ORDER,
  TASK_STATUS_META,
  TASK_STATUS_ORDER,
  TICKET_STATUS_META,
  type Milestone,
  type Task,
  type TaskStatus,
} from "@/domain";
import { projectWorkspace, systemById, userById } from "@/lib/selectors";
import { useActions, useSnapshot } from "@/lib/store/workspace-store";
import { formatDate, formatHours, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Input,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/primitives";
import { DetailRow } from "@/components/shared/page";
import { DepartmentPicker } from "./department-picker";
import { EmptyState } from "@/components/shared/states";
import {
  AvatarStack,
  ProgressBar,
  ProjectHealthBadge,
  SLAIndicator,
  SystemBadge,
  UserAvatar,

} from "@/components/shared/indicators";
import { sla } from "@/lib/selectors";

export function ProjectDetail({ projectId }: { projectId: string }) {
  const snapshot = useSnapshot();
  const searchParams = useSearchParams();
  const [tab, setTab] = React.useState(searchParams.get("tab") ?? "overview");

  const workspace = React.useMemo(
    () => projectWorkspace(snapshot, projectId),
    [snapshot, projectId],
  );

  if (!workspace) {
    return (
      <div className="px-6 py-16">
        <EmptyState
          icon={FolderKanban}
          title="That project does not exist."
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href="/projects">Back to projects</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { project } = workspace;

  return (
    <div className="mx-auto max-w-[1500px] px-6 py-5">
      <ProjectHeader workspace={workspace} />

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks
            <span className="ml-1.5 text-fg-subtle">{workspace.tasks.length}</span>
          </TabsTrigger>
          <TabsTrigger value="milestones">
            Milestones
            <span className="ml-1.5 text-fg-subtle">{workspace.milestones.length}</span>
          </TabsTrigger>
          <TabsTrigger value="tickets">
            Tickets
            <span className="ml-1.5 text-fg-subtle">{workspace.tickets.length}</span>
          </TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab workspace={workspace} />
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <TasksTab workspace={workspace} />
        </TabsContent>
        <TabsContent value="milestones" className="mt-4">
          <MilestonesTab workspace={workspace} />
        </TabsContent>
        <TabsContent value="tickets" className="mt-4">
          <TicketsTab workspace={workspace} />
        </TabsContent>
        <TabsContent value="documentation" className="mt-4">
          <DocumentationTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTab projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type Workspace = NonNullable<ReturnType<typeof projectWorkspace>>;

/* ========================================================================== */
/* Header                                                                     */
/* ========================================================================== */

function ProjectHeader({ workspace }: { workspace: Workspace }) {
  const { project, owner, contributors, nextMilestone } = workspace;
  const actions = useActions();

  return (
    <div>
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-2xs font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3" />
        All projects
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-wide text-fg-subtle uppercase">
            {project.initiative}
          </p>
          <h1 className="mt-0.5 text-xl leading-tight font-semibold text-fg">
            {project.name}
          </h1>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-fg-muted">
            {project.description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <StatusMenu project={workspace.project} />
          <HealthMenu project={workspace.project} />
        </div>
      </div>

      {project.healthNote && project.health !== "on_track" && (
        <div
          className={cn(
            "mt-3 flex gap-2 rounded-md border px-3 py-2",
            project.health === "blocked"
              ? "border-critical-border bg-critical-bg"
              : "border-warning-border bg-warning-bg",
          )}
        >
          <CircleAlert
            className={cn(
              "mt-px size-3.5 shrink-0",
              project.health === "blocked" ? "text-critical" : "text-warning",
            )}
          />
          <p className="text-xs leading-5 text-fg-body">{project.healthNote}</p>
        </div>
      )}

      {/* Summary strip */}
      <div className="mt-4 grid grid-cols-2 divide-x divide-line overflow-hidden rounded-lg border border-line bg-surface shadow-xs md:grid-cols-5">
        <div className="px-4 py-2.5">
          <p className="text-2xs text-fg-subtle">Owner</p>
          <div className="mt-1 flex items-center gap-1.5">
            <AvatarStack users={[owner, ...contributors].filter(Boolean) as never[]} max={3} />
            <span className="truncate text-xs text-fg-body">{owner?.name}</span>
          </div>
        </div>
        <div className="px-4 py-2.5">
          <p className="text-2xs text-fg-subtle">Timeline</p>
          <p className="mt-1 text-xs text-fg-body">
            {formatDate(project.startDate)} → {formatDate(project.targetDate)}
          </p>
        </div>
        <div className="px-4 py-2.5">
          <p className="text-2xs text-fg-subtle">Progress</p>
          <div className="mt-2">
            <ProgressBar value={project.progress} health={project.health} showValue />
          </div>
        </div>
        <div className="px-4 py-2.5">
          <p className="text-2xs text-fg-subtle">Next milestone</p>
          <p className="mt-1 truncate text-xs text-fg-body">
            {nextMilestone ? nextMilestone.name : "All complete"}
          </p>
          {nextMilestone && (
            <p className="text-[10px] text-fg-subtle">
              {formatDate(nextMilestone.targetDate)}
            </p>
          )}
        </div>
        <div className="px-4 py-2.5">
          <p className="text-2xs text-fg-subtle">Tasks</p>
          <p className="tabular mt-1 text-xs text-fg-body">
            {workspace.taskProgress.done} of {workspace.taskProgress.total} done
          </p>
          {workspace.blockers.length > 0 && (
            <button
              type="button"
              onClick={() => actions.updateProject(project.id, {})}
              className="text-[10px] text-critical"
            >
              {workspace.blockers.length} blocked
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusMenu({ project }: { project: Workspace["project"] }) {
  const actions = useActions();
  const meta = PROJECT_STATUS_META[project.status];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <Dot tone={meta.tone} className="size-1.5" />
          {meta.label}
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Project status</DropdownMenuLabel>
        {PROJECT_STATUS_ORDER.map((status) => (
          <DropdownMenuItem
            key={status}
            onSelect={() => actions.setProjectStatus(project.id, status)}
          >
            <Dot tone={PROJECT_STATUS_META[status].tone} className="size-1.5" />
            {PROJECT_STATUS_META[status].label}
            {status === project.status && (
              <Check className="ml-auto size-3.5 text-teal-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HealthMenu({ project }: { project: Workspace["project"] }) {
  const actions = useActions();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <ProjectHealthBadge health={project.health} />
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Health</DropdownMenuLabel>
        {PROJECT_HEALTH_ORDER.map((health) => (
          <DropdownMenuItem
            key={health}
            onSelect={() => actions.updateProject(project.id, { health })}
            className="flex-col items-start gap-0.5"
          >
            <span className="flex w-full items-center gap-2">
              <ProjectHealthBadge health={health} />
              {health === project.health && (
                <Check className="ml-auto size-3.5 text-teal-600" />
              )}
            </span>
            <span className="text-[10px] leading-4 text-fg-subtle">
              {PROJECT_HEALTH_META[health].description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ========================================================================== */
/* Overview                                                                   */
/* ========================================================================== */

function OverviewTab({ workspace }: { workspace: Workspace }) {
  const { project, systems, blockers, nextMilestone, milestones, dependencies } = workspace;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Business objective</CardTitle>
          </CardHeader>
          <div className="space-y-3 px-4 py-3.5">
            <p className="text-sm leading-6 text-fg-body">{project.businessGoal}</p>
            {project.expectedImpact && (
              <div className="rounded-md border border-line bg-subtle px-3 py-2">
                <p className="text-[10px] font-semibold tracking-wide text-fg-subtle uppercase">
                  Expected impact
                </p>
                <p className="mt-1 text-xs leading-5 text-fg-body">
                  {project.expectedImpact}
                </p>
              </div>
            )}
          </div>
        </Card>

        {blockers.length > 0 && (
          <Card className="border-critical-border">
            <CardHeader className="border-critical-border bg-critical-bg">
              <CardTitle className="text-critical">
                Blockers
                <span className="ml-2 font-normal">{blockers.length}</span>
              </CardTitle>
            </CardHeader>
            <ul className="divide-y divide-line-soft">
              {blockers.map((task) => (
                <li key={task.id} className="px-4 py-2.5">
                  <p className="text-sm text-fg">{task.title}</p>
                  {task.description && (
                    <p className="mt-0.5 text-xs leading-5 text-fg-muted">
                      {task.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Milestone progress</CardTitle>
            <span className="text-2xs text-fg-subtle">
              {milestones.filter((m) => m.status === "complete").length} of{" "}
              {milestones.length} complete
            </span>
          </CardHeader>
          <div className="px-4 py-4">
            <MilestoneTrack milestones={milestones} />
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Impact</CardTitle>
          </CardHeader>
          <div className="divide-y divide-line-soft px-4">
            <div className="py-1">
              <DetailRow label="Hours saved / month">
                {project.actualHoursSavedMonthly != null ? (
                  <span className="font-medium text-teal-700">
                    {formatHours(project.actualHoursSavedMonthly)}
                    <span className="ml-1 text-fg-subtle">measured</span>
                  </span>
                ) : project.estimatedHoursSavedMonthly > 0 ? (
                  <span>
                    {formatHours(project.estimatedHoursSavedMonthly)}
                    <span className="ml-1 text-fg-subtle">estimated</span>
                  </span>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Manual processes removed">
                {project.manualProcessesEliminated || "—"}
              </DetailRow>
              <DetailRow label="Automations created">
                {project.automationsCreated || "—"}
              </DetailRow>
              <DepartmentPicker project={project} />
            </div>
            <p className="py-2 text-[10px] leading-4 text-fg-subtle">
              Estimates only count towards department totals once a project ships.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Systems affected</CardTitle>
          </CardHeader>
          <div className="px-4 py-3">
            {systems.length === 0 ? (
              <p className="text-2xs text-fg-subtle">None linked.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {systems.map((s) => (
                  <SystemBadge
                    key={s.id}
                    system={s}
                    href={`/systems/${s.slug}`}
                    showHealth
                  />
                ))}
              </div>
            )}
          </div>
        </Card>

        {dependencies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Depends on</CardTitle>
            </CardHeader>
            <ul className="divide-y divide-line-soft">
              {dependencies.map((dep) => (
                <li key={dep.id}>
                  <Link
                    href={`/projects/${dep.id}`}
                    className="flex items-center justify-between gap-2 px-4 py-2 transition-colors hover:bg-subtle"
                  >
                    <span className="truncate text-xs text-fg">{dep.name}</span>
                    <Badge tone={PROJECT_STATUS_META[dep.status].tone}>
                      {PROJECT_STATUS_META[dep.status].label}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {nextMilestone && (
          <Card>
            <CardHeader>
              <CardTitle>Next up</CardTitle>
            </CardHeader>
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-fg">{nextMilestone.name}</p>
              <p className="mt-1 text-xs leading-5 text-fg-muted">
                {nextMilestone.description}
              </p>
              <p className="mt-2 text-2xs text-fg-subtle">
                Target {formatDate(nextMilestone.targetDate)}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/** Horizontal milestone track. Complete, current and upcoming at a glance. */
function MilestoneTrack({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) {
    return <p className="text-xs text-fg-subtle">No milestones defined yet.</p>;
  }

  return (
    <ol className="relative flex gap-2">
      {milestones.map((milestone, index) => {
        const meta = MILESTONE_STATUS_META[milestone.status];
        return (
          <li key={milestone.id} className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                  milestone.status === "complete"
                    ? "bg-teal-500 text-white"
                    : milestone.status === "at_risk"
                      ? "bg-warning-bg text-warning ring-1 ring-warning-border"
                      : milestone.status === "in_progress"
                        ? "bg-navy-600 text-white"
                        : "bg-subtle text-fg-subtle ring-1 ring-line",
                )}
              >
                {milestone.status === "complete" ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : (
                  index + 1
                )}
              </span>
              {index < milestones.length - 1 && (
                <span
                  className={cn(
                    "h-0.5 flex-1 rounded-full",
                    milestone.status === "complete" ? "bg-teal-300" : "bg-line",
                  )}
                />
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-2xs leading-4 font-medium text-fg">
              {milestone.name}
            </p>
            <p className="mt-0.5 text-[10px] text-fg-subtle">
              {formatDate(milestone.targetDate)}
            </p>
            <Badge tone={meta.tone} className="mt-1">
              {meta.label}
            </Badge>
          </li>
        );
      })}
    </ol>
  );
}

/* ========================================================================== */
/* Tasks                                                                      */
/* ========================================================================== */

function TasksTab({ workspace }: { workspace: Workspace }) {
  const actions = useActions();
  const snapshot = useSnapshot();
  const [newTask, setNewTask] = React.useState("");
  const [groupBy, setGroupBy] = React.useState<"status" | "milestone">("status");

  const topLevel = workspace.tasks.filter((t) => !t.parentTaskId);
  const subtasksOf = (id: string) => workspace.tasks.filter((t) => t.parentTaskId === id);

  const groups =
    groupBy === "status"
      ? TASK_STATUS_ORDER.map((status) => ({
          key: status,
          label: TASK_STATUS_META[status].label,
          tasks: topLevel.filter((t) => t.status === status),
        }))
      : [
          ...workspace.milestones.map((m) => ({
            key: m.id,
            label: m.name,
            tasks: topLevel.filter((t) => t.milestoneId === m.id),
          })),
          {
            key: "none",
            label: "No milestone",
            tasks: topLevel.filter((t) => !t.milestoneId),
          },
        ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xs text-fg-muted">Group by</span>
          <div className="inline-flex items-center gap-0.5 rounded-md border border-line bg-subtle p-0.5">
            {(["status", "milestone"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setGroupBy(option)}
                className={cn(
                  "cursor-pointer rounded-sm px-2.5 py-1 text-2xs font-medium capitalize transition-colors",
                  groupBy === option
                    ? "bg-surface text-fg shadow-xs"
                    : "text-fg-muted hover:text-fg",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newTask.trim().length < 3) return;
            actions.createTask(workspace.project.id, newTask.trim());
            setNewTask("");
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a task…"
            className="w-64"
            aria-label="New task title"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={newTask.trim().length < 3}
          >
            <Plus />
            Add
          </Button>
        </form>
      </div>

      {groups.filter((g) => g.tasks.length > 0).length === 0 ? (
        <Card>
          <EmptyState
            icon={Check}
            title="No tasks yet."
            description="Add the first one above and it will appear here."
          />
        </Card>
      ) : (
        groups
          .filter((group) => group.tasks.length > 0)
          .map((group) => (
            <Card key={group.key} className="overflow-hidden">
              <CardHeader>
                <CardTitle>{group.label}</CardTitle>
                <span className="tabular text-2xs text-fg-subtle">
                  {group.tasks.length}
                </span>
              </CardHeader>
              <ul className="divide-y divide-line-soft">
                {group.tasks.map((task) => (
                  <React.Fragment key={task.id}>
                    <TaskRow task={task} />
                    {subtasksOf(task.id).map((sub) => (
                      <TaskRow key={sub.id} task={sub} nested />
                    ))}
                  </React.Fragment>
                ))}
              </ul>
            </Card>
          ))
      )}

      <p className="text-2xs text-fg-subtle">
        Completing tasks moves the project&apos;s progress bar — the two never disagree.
        {snapshot.tasks.length > 0 && " Click a status to change it."}
      </p>
    </div>
  );
}

function TaskRow({ task, nested = false }: { task: Task; nested?: boolean }) {
  const snapshot = useSnapshot();
  const actions = useActions();
  const owner = userById(snapshot, task.ownerId);
  const meta = TASK_STATUS_META[task.status];
  const done = meta.done;

  const milestone = snapshot.milestones.find((m) => m.id === task.milestoneId);
  const blockedBy = task.dependsOnTaskIds
    .map((id) => snapshot.tasks.find((t) => t.id === id))
    .filter((t): t is Task => t !== undefined && !TASK_STATUS_META[t.status].done);

  return (
    <li className={cn("group px-4 py-2.5 transition-colors hover:bg-subtle", nested && "pl-10")}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => actions.setTaskStatus(task.id, done ? "todo" : "done")}
          aria-label={done ? `Mark ${task.title} not done` : `Mark ${task.title} done`}
          className={cn(
            "mt-0.5 flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-xs border transition-colors",
            done
              ? "border-teal-500 bg-teal-500 text-white"
              : "border-line-strong bg-surface hover:border-teal-400",
          )}
        >
          {done && <Check className="size-3" strokeWidth={3} />}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm",
              done ? "text-fg-subtle line-through" : "text-fg",
            )}
          >
            {task.title}
          </p>
          {task.description && !done && (
            <p className="mt-0.5 text-xs leading-5 text-fg-muted">{task.description}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-fg-subtle">
            {milestone && <span>{milestone.name}</span>}
            {task.dueDate && <span>Due {formatDate(task.dueDate)}</span>}
            {task.estimatedHours != null && (
              <span>
                {task.actualHours != null
                  ? `${task.actualHours}h of ${task.estimatedHours}h`
                  : `${task.estimatedHours}h estimated`}
              </span>
            )}
            {blockedBy.length > 0 && (
              <span className="text-critical">
                Waiting on {blockedBy.map((t) => t.title).join(", ")}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="cursor-pointer">
              <Badge tone={meta.tone}>{meta.label}</Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {TASK_STATUS_ORDER.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onSelect={() => actions.setTaskStatus(task.id, status as TaskStatus)}
                >
                  <Dot tone={TASK_STATUS_META[status].tone} className="size-1.5" />
                  {TASK_STATUS_META[status].label}
                  {status === task.status && (
                    <Check className="ml-auto size-3.5 text-teal-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <UserAvatar user={owner} size="sm" />
        </div>
      </div>
    </li>
  );
}

/* ========================================================================== */
/* Milestones                                                                 */
/* ========================================================================== */

function MilestonesTab({ workspace }: { workspace: Workspace }) {
  const actions = useActions();
  const snapshot = useSnapshot();

  if (workspace.milestones.length === 0) {
    return (
      <Card>
        <EmptyState icon={Flag} title="No milestones yet." />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="px-4 py-5">
          <MilestoneTrack milestones={workspace.milestones} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <ul className="divide-y divide-line-soft">
          {workspace.milestones.map((milestone) => {
            const tasks = workspace.tasks.filter((t) => t.milestoneId === milestone.id);
            const done = tasks.filter((t) => TASK_STATUS_META[t.status].done).length;

            return (
              <li key={milestone.id} className="flex items-start gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => actions.completeMilestone(milestone.id)}
                  aria-label={`Toggle ${milestone.name} complete`}
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors",
                    milestone.status === "complete"
                      ? "bg-teal-500 text-white"
                      : "bg-subtle text-fg-subtle ring-1 ring-line hover:ring-teal-300",
                  )}
                >
                  <Check className="size-3" strokeWidth={3} />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-fg">{milestone.name}</p>
                    <Badge tone={MILESTONE_STATUS_META[milestone.status].tone}>
                      {MILESTONE_STATUS_META[milestone.status].label}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs leading-5 text-fg-muted">
                    {milestone.description}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-fg-subtle">
                    <span>Target {formatDate(milestone.targetDate)}</span>
                    {milestone.completedAt && (
                      <span className="text-success">
                        Completed {formatRelative(milestone.completedAt, snapshot.now)}
                      </span>
                    )}
                    {tasks.length > 0 && (
                      <span>
                        {done} of {tasks.length} tasks done
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

/* ========================================================================== */
/* Tickets                                                                    */
/* ========================================================================== */

function TicketsTab({ workspace }: { workspace: Workspace }) {
  const snapshot = useSnapshot();
  const router = useRouter();

  if (workspace.tickets.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={TicketIcon}
          title="No tickets are linked to this project."
          description="Support work that turns out to belong to this project can be linked from the ticket."
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-line-soft">
        {workspace.tickets.map((ticket) => (
          <li key={ticket.id}>
            <button
              type="button"
              onClick={() => router.push(`/tickets/${ticket.id}`)}
              className="group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-subtle"
            >
              <span className="tabular w-20 shrink-0 text-2xs text-fg-muted">
                {ticket.ticketNumber}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-fg group-hover:text-navy-700">
                {ticket.title}
              </span>
              <Badge tone={TICKET_STATUS_META[ticket.status].tone}>
                {TICKET_STATUS_META[ticket.status].label}
              </Badge>
              <span className="w-28 shrink-0">
                <SLAIndicator evaluation={sla(snapshot, ticket)} />
              </span>
              <UserAvatar user={userById(snapshot, ticket.assigneeId)} size="sm" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ========================================================================== */
/* Documentation                                                              */
/* ========================================================================== */

function DocumentationTab({ projectId }: { projectId: string }) {
  const snapshot = useSnapshot();
  const project = snapshot.projects.find((p) => p.id === projectId)!;

  const articles = snapshot.articles.filter(
    (a) => a.relatedProjectIds.includes(projectId) || project.relatedArticleIds.includes(a.id),
  );
  const diagrams = snapshot.diagrams.filter(
    (d) => d.relatedProjectIds.includes(projectId) || project.relatedDiagramIds.includes(d.id),
  );

  if (articles.length === 0 && diagrams.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={BookOpen}
          title="Nothing documented yet."
          description="Knowledge articles and diagrams that reference this project appear here automatically."
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {articles.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Knowledge articles</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-line-soft">
            {articles.map((article) => (
              <li key={article.id}>
                <Link
                  href={`/knowledge/${article.slug}`}
                  className="block px-4 py-2.5 transition-colors hover:bg-subtle"
                >
                  <p className="text-sm font-medium text-fg">{article.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-fg-muted">
                    {article.summary}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {diagrams.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Diagrams</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-line-soft">
            {diagrams.map((diagram) => (
              <li key={diagram.id}>
                <Link
                  href={`/diagrams/${diagram.id}`}
                  className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-subtle"
                >
                  <Workflow className="size-3.5 shrink-0 text-fg-subtle" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-fg">
                      {diagram.name}
                    </span>
                    <span className="block truncate text-xs text-fg-muted">
                      {diagram.description}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ========================================================================== */
/* Activity                                                                   */
/* ========================================================================== */

function ActivityTab({ projectId }: { projectId: string }) {
  const snapshot = useSnapshot();

  const events = snapshot.activity.filter(
    (e) =>
      (e.entityType === "project" && e.entityId === projectId) ||
      (e.entityType === "milestone" &&
        snapshot.milestones.some((m) => m.id === e.entityId && m.projectId === projectId)) ||
      (e.entityType === "ticket" &&
        snapshot.tickets.some((t) => t.id === e.entityId && t.relatedProjectId === projectId)),
  );

  if (events.length === 0) {
    return (
      <Card>
        <EmptyState title="No activity recorded yet." />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-line-soft">
        {events.map((event) => {
          const actor = userById(snapshot, event.actorId);
          return (
            <li key={event.id}>
              <Link
                href={event.href}
                className="flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-subtle"
              >
                <UserAvatar user={actor} size="sm" className="mt-px" />
                <span className="min-w-0 flex-1 text-xs text-fg-body">
                  <span className="font-medium text-fg">{actor?.name}</span>{" "}
                  {event.summary}
                  {event.detail && (
                    <span className="mt-0.5 block text-2xs text-fg-subtle">
                      {event.detail}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-2xs whitespace-nowrap text-fg-subtle">
                  {formatRelative(event.createdAt, snapshot.now)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export { Separator, systemById };
