"use client";

import * as React from "react";
import { DEPARTMENTS, DEPARTMENT_KEYS, SESSION_KIND_META, SESSION_KIND_ORDER } from "@/domain";
import type { DepartmentKey, SessionKind, User } from "@/domain";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui/primitives";
import { createSessionAction } from "@/app/(command)/brainstorming/sessions/actions";

/**
 * Opens a cycle.
 *
 * The departments chosen here are fixed for the session — each one starts with
 * all eight questions present and blank. A department can be added later, but
 * choosing up front is what makes an unanswered question visible as a gap
 * rather than as an absence.
 */
export function NewSessionDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  currentUserId: string;
  nextCycle: number;
  onCreated: (slug: string) => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-2xl">
        {/* The form mounts only while the dialog is open, so its defaults come
            from useState initialisers rather than from an effect that resets
            them — and closing it genuinely discards a half-filled draft. */}
        {props.open && <NewSessionForm {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function NewSessionForm({
  onOpenChange,
  users,
  currentUserId,
  nextCycle,
  onCreated,
}: {
  onOpenChange: (open: boolean) => void;
  users: User[];
  currentUserId: string;
  nextCycle: number;
  onCreated: (slug: string) => void;
}) {
  const [title, setTitle] = React.useState(`Leadership session — cycle ${nextCycle}`);
  const [kind, setKind] = React.useState<SessionKind>(
    nextCycle === 1 ? "discovery" : "both",
  );
  // Today's date, read on mount rather than during a render that also happens
  // on the server — the two would disagree and React would report a mismatch.
  const [heldAt, setHeldAt] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [demoedWhat, setDemoedWhat] = React.useState("");
  const [picked, setPicked] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Tech runs the session; it does not answer its own questions in it.
  const departments = DEPARTMENT_KEYS.filter((d) => d !== "tech");

  const candidatesFor = (dept: DepartmentKey) => {
    const own = users.filter((u) => u.department === dept);
    return own.length > 0 ? own : users.filter((u) => !u.isTechTeam);
  };

  const chosen = Object.entries(picked).filter(([, respondentId]) => respondentId);

  async function submit() {
    if (chosen.length === 0) {
      setError("Pick at least one department and who is answering for it.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { slug } = await createSessionAction({
        title: title.trim() || `Leadership session — cycle ${nextCycle}`,
        kind,
        heldAt: new Date(`${heldAt}T12:00:00`).toISOString(),
        facilitatorId: currentUserId,
        attendeeIds: [currentUserId, ...chosen.map(([, id]) => id)],
        demoedWhat: demoedWhat.trim(),
        departments: chosen.map(([department, respondentId]) => ({
          department: department as DepartmentKey,
          respondentId,
        })),
      });
      onOpenChange(false);
      onCreated(slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the session.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
          <DialogTitle>Open cycle {nextCycle}</DialogTitle>
          <DialogDescription>
            Writes a new session file. It survives dataset refreshes and shows up in git.
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-slim max-h-[60vh] space-y-4 overflow-y-auto px-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="session-title">Title</Label>
              <Input
                id="session-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-date">Date held</Label>
              <Input
                id="session-date"
                type="date"
                value={heldAt}
                onChange={(e) => setHeldAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Shape</Label>
            <div className="flex flex-wrap gap-1.5">
              {SESSION_KIND_ORDER.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  aria-pressed={kind === k}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-left transition-colors",
                    kind === k
                      ? "border-teal-300 bg-teal-50"
                      : "border-line bg-surface hover:bg-subtle",
                  )}
                >
                  <span className="block text-xs font-medium text-fg">
                    {SESSION_KIND_META[k].label}
                  </span>
                  <span className="block text-2xs text-fg-muted">
                    {SESSION_KIND_META[k].description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {kind !== "discovery" && (
            <div className="space-y-1.5">
              <Label htmlFor="session-demo">What are you showing?</Label>
              <Textarea
                id="session-demo"
                rows={2}
                placeholder="The CAM scorecard draft, and the estimator capacity view."
                value={demoedWhat}
                onChange={(e) => setDemoedWhat(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Who is answering</Label>
            <p className="text-2xs text-fg-muted">
              One person per department. Leave a department unset to keep it out of this cycle.
            </p>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {departments.map((dept) => (
                <div
                  key={dept}
                  className="flex items-center gap-2 rounded-md border border-line bg-canvas px-2.5 py-2"
                >
                  <span className="w-24 shrink-0 truncate text-xs text-fg-body">
                    {DEPARTMENTS[dept].shortName}
                  </span>
                  <Select
                    value={picked[dept] ?? ""}
                    onValueChange={(v) =>
                      setPicked((p) => ({ ...p, [dept]: v === "__none" ? "" : v }))
                    }
                  >
                    <SelectTrigger className="h-7 flex-1 text-2xs">
                      <SelectValue placeholder="Not this cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Not this cycle</SelectItem>
                      {candidatesFor(dept).map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} — {u.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-critical">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={saving}>
            {saving ? "Creating…" : `Create cycle ${nextCycle}`}
          </Button>
        </DialogFooter>
    </>
  );
}
