"use client";

import Link from "next/link";
import * as React from "react";
import { Compass, Route } from "lucide-react";
import {
  PROJECT_STATUS_META,
  ROADMAP_LANES,
  quarterOf,
  type Project,
  type RoadmapLane,
} from "@/domain";
import { systemsByIds, userById } from "@/lib/selectors";
import { useSnapshot } from "@/lib/store/workspace-store";
import { formatDate, formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/primitives";
import { PageBody, SectionHeader } from "@/components/shared/page";
import { EmptyState } from "@/components/shared/states";
import {
  ProgressBar,
  ProjectHealthBadge,
  SystemBadge,
  UserAvatar,
} from "@/components/shared/indicators";

type Horizon = "quarter" | "next" | "year";
type GroupBy = "lane" | "quarter" | "initiative" | "owner" | "system";

const LANE_TONE: Record<RoadmapLane, string> = {
  Planned: "border-t-navy-300",
  "In Progress": "border-t-teal-500",
  Testing: "border-t-accent",
  Launching: "border-t-warning",
  Completed: "border-t-success",
};

export function RoadmapPage() {
  const snapshot = useSnapshot();
  const [horizon, setHorizon] = React.useState<Horizon>("quarter");
  const [groupBy, setGroupBy] = React.useState<GroupBy>("lane");

  const { start, end, label } = React.useMemo(
    () => horizonRange(new Date(snapshot.now), horizon),
    [snapshot.now, horizon],
  );

  // A project belongs on the roadmap for a horizon if any part of its run
  // overlaps that window — not only if it starts or finishes inside it.
  const projects = React.useMemo(
    () =>
      snapshot.projects.filter((p) => {
        const s = new Date(p.startDate).getTime();
        const e = new Date(p.completedAt ?? p.targetDate).getTime();
        return s <= end && e >= start;
      }),
    [snapshot.projects, start, end],
  );

  const groups = React.useMemo(
    () => groupProjects(projects, groupBy, snapshot),
    [projects, groupBy, snapshot],
  );

  return (
    <PageBody>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl leading-tight text-fg">{label}</h2>
          <p className="mt-1 text-xs text-fg-muted">
            {projects.length} {projects.length === 1 ? "project" : "projects"} running,
            landing or planned in this window.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xs text-fg-muted">Horizon</span>
            <ToggleGroup
              type="single"
              value={horizon}
              onValueChange={(v) => v && setHorizon(v as Horizon)}
              aria-label="Roadmap horizon"
            >
              <ToggleGroupItem value="quarter">This quarter</ToggleGroupItem>
              <ToggleGroupItem value="next">Next quarter</ToggleGroupItem>
              <ToggleGroupItem value="year">Year</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xs text-fg-muted">Group by</span>
            <ToggleGroup
              type="single"
              value={groupBy}
              onValueChange={(v) => v && setGroupBy(v as GroupBy)}
              aria-label="Grouping"
            >
              <ToggleGroupItem value="lane">Stage</ToggleGroupItem>
              <ToggleGroupItem value="quarter">Quarter</ToggleGroupItem>
              <ToggleGroupItem value="initiative">Initiative</ToggleGroupItem>
              <ToggleGroupItem value="owner">Owner</ToggleGroupItem>
              <ToggleGroupItem value="system">System</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={Compass}
            title="Nothing is scheduled in this window."
            description="Try a wider horizon, or move something out of the backlog."
          />
        </Card>
      ) : groupBy === "lane" ? (
        <div className="scrollbar-slim flex gap-3 overflow-x-auto pb-2">
          {ROADMAP_LANES.map((lane) => {
            const laneProjects = projects.filter(
              (p) => PROJECT_STATUS_META[p.status].roadmapLane === lane,
            );
            return (
              <section
                key={lane}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-lg border border-line border-t-2 bg-surface shadow-xs",
                  LANE_TONE[lane],
                )}
                aria-label={`${lane} — ${laneProjects.length} projects`}
              >
                <header className="flex items-center justify-between gap-2 border-b border-line-soft px-3 py-2.5">
                  <h3 className="text-xs font-semibold text-fg">{lane}</h3>
                  <span className="tabular rounded-full bg-subtle px-1.5 py-px text-[10px] font-semibold text-fg-muted">
                    {laneProjects.length}
                  </span>
                </header>
                <div className="flex flex-col gap-2 p-2">
                  {laneProjects.length === 0 ? (
                    <p className="rounded-md border border-dashed border-line px-3 py-5 text-center text-2xs text-fg-subtle">
                      Nothing here
                    </p>
                  ) : (
                    laneProjects.map((p) => <RoadmapCard key={p.id} project={p} />)
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.key} className="space-y-3">
              <SectionHeader
                title={group.label}
                description={`${group.projects.length} ${group.projects.length === 1 ? "project" : "projects"}`}
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.projects.map((p) => (
                  <RoadmapCard key={p.id} project={p} wide />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageBody>
  );
}

function RoadmapCard({ project, wide = false }: { project: Project; wide?: boolean }) {
  const snapshot = useSnapshot();
  const owner = userById(snapshot, project.ownerId);
  const systems = systemsByIds(snapshot, project.systemIds);

  const impact =
    project.actualHoursSavedMonthly ?? project.estimatedHoursSavedMonthly;

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        "card-interactive block rounded-md border border-line bg-surface p-3 shadow-xs",
        wide && "p-4",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4
          className={cn(
            "font-semibold text-fg",
            wide ? "text-sm" : "line-clamp-2 text-xs leading-5",
          )}
        >
          {project.name}
        </h4>
        <ProjectHealthBadge health={project.health} note={project.healthNote} />
      </div>

      {wide && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-fg-muted">
          {project.businessGoal || project.description}
        </p>
      )}

      <div className="mt-2.5">
        <ProgressBar value={project.progress} health={project.health} />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <Badge tone={PROJECT_STATUS_META[project.status].tone}>
          {PROJECT_STATUS_META[project.status].label}
        </Badge>
        <span className="text-[10px] text-fg-subtle">
          {project.completedAt
            ? `Shipped ${formatDate(project.completedAt)}`
            : formatDate(project.targetDate)}
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line-soft pt-2">
        <span className="flex items-center gap-1.5">
          <UserAvatar user={owner} size="xs" />
          <span className="truncate text-[10px] text-fg-subtle">
            {owner?.name.split(" ")[0]}
          </span>
        </span>
        {impact > 0 ? (
          <span className="text-[10px] font-medium text-teal-700">
            {formatHours(impact)}/mo
          </span>
        ) : (
          systems[0] && <SystemBadge system={systems[0]} />
        )}
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */

function horizonRange(now: Date, horizon: Horizon) {
  const year = now.getUTCFullYear();
  const quarterIndex = Math.floor(now.getUTCMonth() / 3);

  if (horizon === "year") {
    return {
      start: Date.UTC(year, 0, 1),
      end: Date.UTC(year, 11, 31, 23, 59, 59),
      label: `${year} roadmap`,
    };
  }

  const offset = horizon === "next" ? 1 : 0;
  const startMonth = (quarterIndex + offset) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59));

  // The label is taken from the middle of the quarter, not its first instant.
  // Midnight UTC on 1 July is still 30 June in Denver, which had this reading
  // "Q2 2026" throughout August.
  const midQuarter = new Date(Date.UTC(year, startMonth + 1, 15));

  return {
    start: start.getTime(),
    end: end.getTime(),
    label: `${quarterOf(midQuarter)}${offset === 0 ? " — current quarter" : ""}`,
  };
}

function groupProjects(
  projects: Project[],
  groupBy: GroupBy,
  snapshot: ReturnType<typeof useSnapshot>,
): { key: string; label: string; projects: Project[] }[] {
  if (groupBy === "lane") return [];

  const buckets = new Map<string, { label: string; projects: Project[] }>();
  const push = (key: string, label: string, project: Project) => {
    const existing = buckets.get(key);
    if (existing) existing.projects.push(project);
    else buckets.set(key, { label, projects: [project] });
  };

  for (const project of projects) {
    switch (groupBy) {
      case "quarter": {
        const q = quarterOf(project.completedAt ?? project.targetDate);
        push(q, q, project);
        break;
      }
      case "initiative":
        push(project.initiative, project.initiative, project);
        break;
      case "owner": {
        const owner = userById(snapshot, project.ownerId);
        push(project.ownerId, owner?.name ?? "Unassigned", project);
        break;
      }
      case "system": {
        if (project.systemIds.length === 0) {
          push("none", "No system linked", project);
          break;
        }
        for (const id of project.systemIds) {
          const system = snapshot.systems.find((s) => s.id === id);
          if (system) push(system.id, system.name, project);
        }
        break;
      }
    }
  }

  return [...buckets.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.projects.length - a.projects.length || a.label.localeCompare(b.label));
}

export { Route };
