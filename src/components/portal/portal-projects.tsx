"use client";

import * as React from "react";
import { CheckCircle2, Map } from "lucide-react";
import { ROADMAP_STAGE_META, type PortalProject } from "@/domain";
import { portalRoadmap } from "@/lib/portal";
import { useSnapshot } from "@/lib/store/workspace-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/states";
import { usePortalViewer } from "./portal-context";

/**
 * What is being built, as the rest of the company sees it.
 *
 * Everything on this page comes through `toPortalProject`, so the department's
 * own health assessments, priorities and hours-saved figures are not merely
 * hidden — they are not present in the objects these components hold. See the
 * note on `PortalProject`.
 */
export function PortalProjects() {
  const snapshot = useSnapshot();
  const { viewer } = usePortalViewer();

  const roadmap = React.useMemo(
    () => portalRoadmap(snapshot, viewer),
    [snapshot, viewer],
  );

  const nothing =
    roadmap.yours.length === 0 &&
    roadmap.department.length === 0 &&
    roadmap.delivered.length === 0;

  if (nothing) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={Map}
          title="Nothing on the roadmap for your team yet"
          description="When Technology starts work that affects your department, it will show up here with roughly where it has got to."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {roadmap.yours.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold text-fg">You are on these</h2>
            <span className="tabular text-2xs text-fg-subtle">{roadmap.yours.length}</span>
          </div>
          <p className="text-2xs text-fg-muted">
            Projects you are named on, as the owner or a contributor.
          </p>
          <div className="space-y-2">
            {roadmap.yours.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}

      {roadmap.department.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold text-fg">
              Coming for {roadmap.departmentName}
            </h2>
            <span className="tabular text-2xs text-fg-subtle">
              {roadmap.department.length}
            </span>
          </div>
          <p className="text-2xs text-fg-muted">
            Work your team has a stake in — either somebody from your team is on it, or your
            team has raised requests against it.
          </p>
          <div className="space-y-2">
            {roadmap.department.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}

      {roadmap.delivered.length > 0 && (
        <Delivered projects={roadmap.delivered} />
      )}
    </div>
  );
}

const BAND_LABEL: Record<PortalProject["progressBand"], string> = {
  "just started": "Just started",
  "under way": "Under way",
  "nearly there": "Nearly there",
  done: "Delivered",
};

function ProjectCard({ project }: { project: PortalProject }) {
  const stage = ROADMAP_STAGE_META[project.stage];

  return (
    <article className="rounded-lg border border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-fg">{project.name}</h3>
          {project.goal && (
            <p className="mt-1 text-xs leading-5 text-fg-muted">{project.goal}</p>
          )}
        </div>
        <Badge tone={stage.tone}>{stage.label}</Badge>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-fg-subtle">
        <span>{BAND_LABEL[project.progressBand]}</span>
        {project.timeframe && project.stage !== "done" && (
          <span>
            Aiming for <span className="font-medium text-fg-body">{project.timeframe}</span>
          </span>
        )}
        {project.youAreOn && <span className="text-teal-700">You are named on this</span>}
      </div>

      <p className="mt-2 border-t border-line-soft pt-2 text-2xs text-fg-subtle">
        {stage.meaning}
      </p>
    </article>
  );
}

/**
 * Finished work, folded.
 *
 * Kept for the same reason resolved requests are kept: people ask whether a
 * thing ever shipped, and a roadmap that drops everything it completed reads
 * as a department that never completes anything.
 */
function Delivered({ projects }: { projects: PortalProject[] }) {
  const [expanded, setExpanded] = React.useState(false);
  const shown = expanded ? projects : projects.slice(0, 3);

  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg">
          <CheckCircle2 className="size-3.5 text-success" />
          Already delivered
        </h2>
        <span className="tabular text-2xs text-fg-subtle">{projects.length}</span>
      </div>
      <p className="text-2xs text-fg-muted">{ROADMAP_STAGE_META.done.meaning}</p>
      <div className="space-y-2">
        {shown.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
      {projects.length > 3 && (
        <Button variant="ghost" size="xs" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show fewer" : `Show all ${projects.length}`}
        </Button>
      )}
    </section>
  );
}
