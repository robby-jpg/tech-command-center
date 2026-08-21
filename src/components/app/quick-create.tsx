"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import {
  BookOpen,
  FolderKanban,
  ListChecks,
  Server,
  Ticket,
  Workflow,
} from "lucide-react";
import {
  DIAGRAM_TYPE_ORDER,
  DIAGRAM_TYPE_META,
  KNOWLEDGE_CATEGORY_ORDER,
  KNOWLEDGE_CATEGORY_META,
  SYSTEM_CRITICALITY_ORDER,
  SYSTEM_CRITICALITY_META,
  SYSTEM_KIND_ORDER,
  SYSTEM_KIND_META,
  TICKET_CATEGORY_ORDER,
  TICKET_CATEGORY_META,
  TICKET_PRIORITY_ORDER,
  TICKET_PRIORITY_META,
  type DiagramType,
  type KnowledgeCategory,
  type SystemCriticality,
  type SystemKind,
  type TicketCategory,
  type TicketPriority,
} from "@/domain";
import { useActions, useSnapshot } from "@/lib/store/workspace-store";
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

export type QuickCreateMode =
  | "ticket"
  | "project"
  | "task"
  | "diagram"
  | "article"
  | "system";

const MODES: {
  id: QuickCreateMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "ticket", label: "Ticket", icon: Ticket },
  { id: "project", label: "Project", icon: FolderKanban },
  { id: "task", label: "Task", icon: ListChecks },
  { id: "diagram", label: "Diagram", icon: Workflow },
  { id: "article", label: "Article", icon: BookOpen },
  { id: "system", label: "System", icon: Server },
];

export function QuickCreate({
  open,
  onOpenChange,
  initialMode = "ticket",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: QuickCreateMode;
}) {
  const [mode, setMode] = React.useState<QuickCreateMode>(initialMode);

  React.useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create</DialogTitle>
          <DialogDescription>
            Only the essentials are asked for. Everything else can be filled in later.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1 border-b border-line-soft px-5 py-2.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                mode === m.id
                  ? "bg-navy-600 text-white"
                  : "text-fg-muted hover:bg-subtle hover:text-fg",
              )}
            >
              <m.icon className="size-3.5" />
              {m.label}
            </button>
          ))}
        </div>

        {mode === "ticket" && <TicketForm onDone={() => onOpenChange(false)} />}
        {mode === "project" && <ProjectForm onDone={() => onOpenChange(false)} />}
        {mode === "task" && <TaskForm onDone={() => onOpenChange(false)} />}
        {mode === "diagram" && <DiagramForm onDone={() => onOpenChange(false)} />}
        {mode === "article" && <ArticleForm onDone={() => onOpenChange(false)} />}
        {mode === "system" && <SystemForm onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */

function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id })
        : children}
      {hint && <p className="text-2xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

function FormShell({
  children,
  onSubmit,
  submitLabel,
  disabled,
  onDone,
}: {
  children: React.ReactNode;
  onSubmit: () => void;
  submitLabel: string;
  disabled: boolean;
  onDone: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSubmit();
      }}
    >
      <div className="space-y-3.5 px-5 py-4">{children}</div>
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={disabled}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

function TicketForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const snapshot = useSnapshot();
  const actions = useActions();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<TicketPriority>("normal");
  const [category, setCategory] = React.useState<TicketCategory>("other");
  const [requesterId, setRequesterId] = React.useState(snapshot.currentUserId);
  const [assigneeId, setAssigneeId] = React.useState<string>("unassigned");

  const submit = () => {
    const requester = snapshot.users.find((u) => u.id === requesterId);
    const systemSlug = TICKET_CATEGORY_META[category].systemSlug;
    const system = systemSlug ? snapshot.systems.find((s) => s.slug === systemSlug) : null;

    const id = actions.createTicket({
      title: title.trim(),
      description: description.trim(),
      priority,
      category,
      requesterId,
      requesterDepartment: requester?.department ?? "tech",
      assigneeId: assigneeId === "unassigned" ? null : assigneeId,
      // Category implies the system in almost every case; pre-linking it saves
      // a step and keeps the graph connected without asking.
      relatedSystemIds: system ? [system.id] : [],
      source: "command_center",
    });

    onDone();
    router.push(`/tickets/${id}`);
  };

  return (
    <FormShell
      onSubmit={submit}
      submitLabel="Create ticket"
      disabled={title.trim().length < 4}
      onDone={onDone}
    >
      <Field label="What is happening?" hint="Write it so somebody else would understand.">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Power BI Sales Overview showing yesterday's numbers"
          autoFocus
        />
      </Field>

      <Field label="Detail">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="What was expected, what happened, who is affected."
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_CATEGORY_ORDER.map((c) => (
                <SelectItem key={c} value={c}>
                  {TICKET_CATEGORY_META[c].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Priority" hint={TICKET_PRIORITY_META[priority].description}>
          <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_PRIORITY_ORDER.map((p) => (
                <SelectItem key={p} value={p}>
                  {TICKET_PRIORITY_META[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Requester">
          <Select value={requesterId} onValueChange={setRequesterId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {snapshot.users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Assign to">
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {snapshot.users
                .filter((u) => u.isTechTeam)
                .map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </FormShell>
  );
}

function ProjectForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const snapshot = useSnapshot();
  const actions = useActions();

  const [name, setName] = React.useState("");
  const [businessGoal, setBusinessGoal] = React.useState("");
  const [ownerId, setOwnerId] = React.useState(snapshot.currentUserId);
  const [initiative, setInitiative] = React.useState("Unassigned");

  const initiatives = React.useMemo(
    () => Array.from(new Set(snapshot.projects.map((p) => p.initiative))).sort(),
    [snapshot.projects],
  );

  const submit = () => {
    const id = actions.createProject({
      name: name.trim(),
      businessGoal: businessGoal.trim(),
      ownerId,
      initiative,
    });
    onDone();
    router.push(`/projects/${id}`);
  };

  return (
    <FormShell
      onSubmit={submit}
      submitLabel="Create project"
      disabled={name.trim().length < 3}
      onDone={onDone}
    >
      <Field label="Project name">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="QuickBooks Invoice Automation"
          autoFocus
        />
      </Field>

      <Field
        label="Business goal"
        hint="Why the company is paying for this, in one sentence."
      >
        <Textarea
          value={businessGoal}
          onChange={(e) => setBusinessGoal(e.target.value)}
          rows={2}
          placeholder="Finance stops re-keying won jobs by hand."
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Owner">
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {snapshot.users
                .filter((u) => u.isTechTeam)
                .map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Initiative">
          <Select value={initiative} onValueChange={setInitiative}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {initiatives.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </FormShell>
  );
}

function TaskForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const snapshot = useSnapshot();
  const actions = useActions();

  const activeProjects = snapshot.projects.filter(
    (p) => p.status !== "complete" && p.status !== "idea",
  );

  const [title, setTitle] = React.useState("");
  const [projectId, setProjectId] = React.useState(activeProjects[0]?.id ?? "");
  const [ownerId, setOwnerId] = React.useState(snapshot.currentUserId);

  const submit = () => {
    actions.createTask(projectId, title.trim(), { ownerId });
    onDone();
    router.push(`/projects/${projectId}?tab=tasks`);
  };

  if (activeProjects.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-xs text-fg-muted">
        There are no active projects to add a task to yet.
      </div>
    );
  }

  return (
    <FormShell
      onSubmit={submit}
      submitLabel="Add task"
      disabled={title.trim().length < 3 || !projectId}
      onDone={onDone}
    >
      <Field label="Task">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Repoint the Sales Overview report"
          autoFocus
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Project">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activeProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Owner">
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {snapshot.users
                .filter((u) => u.isTechTeam)
                .map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </FormShell>
  );
}

function DiagramForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const actions = useActions();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<DiagramType>("architecture");

  const submit = () => {
    const id = actions.createDiagram(name.trim(), type);
    onDone();
    router.push(`/diagrams/${id}`);
  };

  return (
    <FormShell
      onSubmit={submit}
      submitLabel="Create diagram"
      disabled={name.trim().length < 3}
      onDone={onDone}
    >
      <Field label="Diagram name">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Warranty claim routing"
          autoFocus
        />
      </Field>

      <Field label="Type" hint={DIAGRAM_TYPE_META[type].description}>
        <Select value={type} onValueChange={(v) => setType(v as DiagramType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIAGRAM_TYPE_ORDER.map((t) => (
              <SelectItem key={t} value={t}>
                {DIAGRAM_TYPE_META[t].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </FormShell>
  );
}

function ArticleForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const actions = useActions();
  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [category, setCategory] = React.useState<KnowledgeCategory>("troubleshooting");

  const submit = () => {
    actions.createArticle({
      title: title.trim(),
      summary: summary.trim(),
      content: `## Overview\n\n${summary.trim() || "Write the article here."}\n`,
      category,
    });
    onDone();
    router.push("/knowledge");
  };

  return (
    <FormShell
      onSubmit={submit}
      submitLabel="Create article"
      disabled={title.trim().length < 3}
      onDone={onDone}
    >
      <Field label="Title">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Apptoto booking events explained"
          autoFocus
        />
      </Field>

      <Field label="Summary" hint="One or two lines. This is what people scan.">
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          placeholder="Why the same appointment appears three times, and how to count it."
        />
      </Field>

      <Field label="Category">
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as KnowledgeCategory)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KNOWLEDGE_CATEGORY_ORDER.map((c) => (
              <SelectItem key={c} value={c}>
                {KNOWLEDGE_CATEGORY_META[c].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </FormShell>
  );
}

function SystemForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const snapshot = useSnapshot();
  const actions = useActions();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [kind, setKind] = React.useState<SystemKind>("external_service");
  const [criticality, setCriticality] = React.useState<SystemCriticality>("standard");

  const submit = () => {
    actions.addSystem({
      name: name.trim(),
      description: description.trim(),
      kind,
      criticality,
      ownerId: snapshot.currentUserId,
    });
    onDone();
    router.push("/systems");
  };

  return (
    <FormShell
      onSubmit={submit}
      submitLabel="Add system"
      disabled={name.trim().length < 2}
      onDone={onDone}
    >
      <Field label="System name">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Gusto"
          autoFocus
        />
      </Field>

      <Field label="What it does">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Payroll and benefits administration."
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select value={kind} onValueChange={(v) => setKind(v as SystemKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SYSTEM_KIND_ORDER.map((k) => (
                <SelectItem key={k} value={k}>
                  {SYSTEM_KIND_META[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Criticality"
          hint={SYSTEM_CRITICALITY_META[criticality].description}
        >
          <Select
            value={criticality}
            onValueChange={(v) => setCriticality(v as SystemCriticality)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SYSTEM_CRITICALITY_ORDER.map((c) => (
                <SelectItem key={c} value={c}>
                  {SYSTEM_CRITICALITY_META[c].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <p className="rounded-md border border-line bg-subtle px-2.5 py-2 text-2xs leading-4 text-fg-muted">
        API credentials are never stored on a system record. Integrations reference an
        environment variable by name and the value stays on the server.
      </p>
    </FormShell>
  );
}
