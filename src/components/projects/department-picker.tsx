"use client";

import * as React from "react";
import { Check, Loader2, Pencil } from "lucide-react";
import { DEPARTMENTS, DEPARTMENT_KEYS, type DepartmentKey, type Project } from "@/domain";
import { useActions } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setProjectDepartmentsAction } from "@/app/(command)/projects/actions";

/**
 * Who this project is being built for.
 *
 * This is the field the Employee Portal scopes its roadmap on, so it is worth
 * saying plainly what setting it does: a department named here sees the project
 * under "Coming for <department>" in their portal, described in the redacted
 * terms of `toPortalProject` — no health, no priority, a quarter rather than a
 * date.
 *
 * The save writes twice on purpose. The server action writes the file, which is
 * what makes the choice survive the nightly refresh; the store mutation updates
 * the working set so the change is visible immediately, because a persisted
 * localStorage overlay would otherwise keep showing the old value until it is
 * reset.
 */
export function DepartmentPicker({ project }: { project: Project }) {
  const actions = useActions();
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [chosen, setChosen] = React.useState<DepartmentKey[]>(
    project.departmentsImpacted as DepartmentKey[],
  );

  // Adopt the stored value whenever it moves underneath us.
  const [lastValue, setLastValue] = React.useState(project.departmentsImpacted);
  if (project.departmentsImpacted !== lastValue) {
    setLastValue(project.departmentsImpacted);
    setChosen(project.departmentsImpacted as DepartmentKey[]);
  }

  const toggle = (key: DepartmentKey) =>
    setChosen((c) => (c.includes(key) ? c.filter((k) => k !== key) : [...c, key]));

  async function save() {
    setSaving(true);
    try {
      await setProjectDepartmentsAction({
        projectId: project.id,
        departments: chosen,
      });
      actions.updateProject(project.id, { departmentsImpacted: chosen });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-2 py-1.5">
        <span className="shrink-0 pt-0.5 text-2xs text-fg-muted">Departments affected</span>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
          {project.departmentsImpacted.length > 0 ? (
            project.departmentsImpacted.map((d) => (
              <Badge key={d} tone="brand">
                {DEPARTMENTS[d as DepartmentKey]?.shortName ?? d}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-fg-subtle">Nobody — invisible in the portal</span>
          )}
          <Button
            variant="ghost"
            size="iconXs"
            aria-label="Choose which departments this affects"
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 py-2">
      <p className="text-2xs text-fg-muted">
        Departments affected — these teams see this project on their portal roadmap.
      </p>
      <div className="flex flex-wrap gap-1">
        {DEPARTMENT_KEYS.filter((k) => k !== "tech").map((key) => {
          const on = chosen.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(key)}
              className={cn(
                "rounded-md border px-2 py-1 text-2xs font-medium transition-colors",
                on
                  ? "border-teal-300 bg-teal-50 text-teal-800"
                  : "border-line bg-surface text-fg-muted hover:bg-subtle hover:text-fg",
              )}
            >
              {on && <Check className="mr-1 inline size-3" />}
              {DEPARTMENTS[key].shortName}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Button variant="primary" size="xs" onClick={save} disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            setChosen(project.departmentsImpacted as DepartmentKey[]);
            setEditing(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
