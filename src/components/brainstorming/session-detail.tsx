"use client";

import Link from "next/link";
import * as React from "react";
import {
  ArrowUpRight,
  Check,
  EyeOff,
  Loader2,
  Lock,
  Plus,
  Trash2,
  Unlock,
} from "lucide-react";
import {
  DEPARTMENTS,
  DISCOVERY_QUESTIONS,
  DISCOVERY_QUESTION_LIST,
  LOOP_STAGE_META,
  PAIN_SEVERITY_META,
  PAIN_SEVERITY_ORDER,
  PROMOTION_TARGET_META,
  PROMOTION_TARGET_ORDER,
  QUESTION_AXIS_META,
  QUESTION_TEMPLATE_VERSION,
  RESOURCE_KIND_META,
  RESOURCE_KIND_ORDER,
  SESSION_KIND_META,
  responseCompleteness,
  type DepartmentKey,
  type DiscoveryQuestionId,
  type LoopStage,
  type PainSeverity,
  type Project,
  type PromotionTarget,
  type ResourceKind,
  type Session,
  type TechSystem,
  type User,
} from "@/domain";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui/primitives";
import { PageBody, SectionHeader } from "@/components/shared/page";
import { EmptyState } from "@/components/shared/states";
import { UserChip } from "@/components/shared/indicators";
import { LoopStagePicker } from "./loop-diagram";
import { TranscriptPanel } from "./transcript-panel";
import {
  addFollowUpAction,
  addPainPointAction,
  addResourceAction,
  advanceStageAction,
  linkPromotionAction,
  promotePainPointAction,
  removeFollowUpAction,
  removePainPointAction,
  removeResourceAction,
  saveAnswerAction,
  saveNarrativeAction,
  updatePainPointAction,
} from "@/app/(command)/brainstorming/sessions/actions";

/* -------------------------------------------------------------------------- */
/* Saving                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A text field that saves when you leave it.
 *
 * These notes get typed while somebody is talking. A save button per field
 * would mean the last answer of every session is the one that gets lost, so
 * blur commits — and says so, briefly, rather than silently.
 */
function AutoSaveText({
  value,
  onSave,
  rows = 3,
  placeholder,
  className,
  id,
}: {
  value: string;
  onSave: (next: string) => Promise<void>;
  rows?: number;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const [draft, setDraft] = React.useState(value);
  const [state, setState] = React.useState<"idle" | "saving" | "saved">("idle");

  // The server is the source of truth; adopt its value when it moves. Adjusted
  // during render rather than in an effect — React re-runs the component
  // immediately without committing, so the field never paints the stale value.
  const [lastServerValue, setLastServerValue] = React.useState(value);
  if (value !== lastServerValue) {
    setLastServerValue(value);
    setDraft(value);
  }

  React.useEffect(() => {
    if (state !== "saved") return;
    const t = setTimeout(() => setState("idle"), 1600);
    return () => clearTimeout(t);
  }, [state]);

  async function commit() {
    if (draft === value) return;
    setState("saving");
    await onSave(draft);
    setState("saved");
  }

  return (
    <div className="relative">
      <Textarea
        id={id}
        rows={rows}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        className={className}
      />
      {state !== "idle" && (
        <span
          className={cn(
            "absolute right-2 bottom-2 inline-flex items-center gap-1 rounded bg-surface/90 px-1.5 py-0.5 text-2xs",
            state === "saving" ? "text-fg-subtle" : "text-success",
          )}
        >
          {state === "saving" ? (
            <>
              <Loader2 className="size-3 animate-spin" /> Saving
            </>
          ) : (
            <>
              <Check className="size-3" /> Saved
            </>
          )}
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The page                                                                   */
/* -------------------------------------------------------------------------- */

export function SessionDetail({
  session,
  users,
  systems,
  projects,
}: {
  session: Session;
  users: User[];
  systems: TechSystem[];
  projects: Project[];
}) {
  const [department, setDepartment] = React.useState<DepartmentKey | null>(
    session.responses[0]?.department ?? null,
  );
  const [pending, startTransition] = React.useTransition();

  const userById = React.useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const response = session.responses.find((r) => r.department === department) ?? null;
  const stage = LOOP_STAGE_META[session.stage];
  const kind = SESSION_KIND_META[session.kind];
  const facilitator = userById.get(session.facilitatorId);

  const ref = { sessionId: session.id, slug: session.slug };

  function run<T extends unknown[]>(fn: (...args: T) => Promise<unknown>) {
    return (...args: T) =>
      new Promise<void>((resolve) => {
        startTransition(async () => {
          await fn(...args);
          resolve();
        });
      });
  }

  return (
    <PageBody>
      {/* Header ------------------------------------------------------------ */}
      <div className="rounded-lg border border-line bg-surface px-4 py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tabular rounded bg-navy-50 px-1.5 py-0.5 text-2xs font-semibold text-navy-700">
                Cycle {session.cycle}
              </span>
              <h1 className="text-base font-semibold text-fg">{session.title}</h1>
              <Badge tone={kind.tone}>{kind.label}</Badge>
            </div>
            <p className="mt-1 text-xs text-fg-muted">
              {formatDate(session.heldAt)}
              {facilitator && <> · facilitated by {facilitator.name}</>} · template v
              {session.templateVersion}
              {session.templateVersion !== QUESTION_TEMPLATE_VERSION && (
                <span className="text-warning"> (the wording has since changed)</span>
              )}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span className="text-2xs text-fg-subtle">Stage — {stage.owner} owns this one</span>
            <LoopStagePicker
              value={session.stage}
              disabled={pending}
              onChange={(next: LoopStage) =>
                startTransition(() => advanceStageAction({ ...ref, stage: next }))
              }
            />
          </div>
        </div>

        {session.attendeeIds.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
            <span className="text-2xs text-fg-subtle">In the room:</span>
            {session.attendeeIds.map((id) => {
              const u = userById.get(id);
              return u ? <UserChip key={id} user={u} /> : null;
            })}
          </div>
        )}
      </div>

      {/* What was shown ---------------------------------------------------- */}
      {session.kind !== "discovery" && (
        <div className="rounded-lg border border-line bg-surface">
          <SectionHeader
            title="What was demoed"
            description="The half of the session that goes first. What you showed determines what they react to."
            className="border-b border-line-soft px-4 py-3"
          />
          <div className="p-4">
            <AutoSaveText
              value={session.demoedWhat}
              rows={2}
              placeholder="The CAM scorecard draft, and the estimator capacity view."
              onSave={run((next: string) =>
                saveNarrativeAction({ ...ref, demoedWhat: next }),
              )}
            />
          </div>
        </div>
      )}

      {/* Meeting notes ----------------------------------------------------- */}
      <TranscriptPanel session={session} />

      {/* Department switcher ----------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-1.5">
        {session.responses.map((r) => {
          const { answered, total } = responseCompleteness(r);
          const active = r.department === department;
          return (
            <button
              key={r.department}
              type="button"
              onClick={() => setDepartment(r.department)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-1.5 transition-colors",
                active
                  ? "border-teal-300 bg-teal-50"
                  : "border-line bg-surface hover:bg-subtle",
              )}
            >
              <span className="text-xs font-medium text-fg">
                {DEPARTMENTS[r.department].shortName}
              </span>
              <span
                className={cn(
                  "tabular text-2xs",
                  answered === total ? "text-success" : "text-fg-subtle",
                )}
              >
                {answered}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {!response ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            title="No departments on this session"
            description="A session with nobody answering is a meeting that did not happen."
          />
        </div>
      ) : (
        <DepartmentPanel
          key={response.department}
          session={session}
          response={response}
          respondent={userById.get(response.respondentId) ?? null}
          systems={systems}
          projects={projects}
          pending={pending}
          run={run}
        />
      )}

      {/* Follow-ups -------------------------------------------------------- */}
      <FollowUps session={session} pending={pending} run={run} />

      {/* Write-ups --------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface">
          <SectionHeader
            title="Session write-up"
            description="What the departments read. Written for them, not about them."
            className="border-b border-line-soft px-4 py-3"
          />
          <div className="p-4">
            <AutoSaveText
              value={session.summary}
              rows={8}
              placeholder="What we heard, what we are going to do about it, and what we are showing next time."
              onSave={run((next: string) => saveNarrativeAction({ ...ref, summary: next }))}
            />
          </div>
        </div>

        <div className="rounded-lg border border-warning-border bg-warning-bg/30">
          <div className="border-b border-warning-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <EyeOff className="size-3.5 text-warning" />
              <h2 className="text-sm font-semibold text-fg">Your analysis</h2>
            </div>
            <p className="mt-0.5 text-xs text-fg-muted">
              Never shown to the departments, and absent from the shared projection entirely —
              so this does not have to be diplomatic.
            </p>
          </div>
          <div className="p-4">
            <AutoSaveText
              value={session.privateAnalysis}
              rows={8}
              placeholder="What they said versus what the data will probably show. Who is protecting a process. What you are not going to build and why."
              onSave={run((next: string) =>
                saveNarrativeAction({ ...ref, privateAnalysis: next }),
              )}
            />
          </div>
        </div>
      </div>

      {/* Promotions -------------------------------------------------------- */}
      {session.promotions.length > 0 && (
        <div className="rounded-lg border border-line bg-surface">
          <SectionHeader
            title="Promoted from this session"
            description="Decisions to build something. Add the ClickUp id once the real thing exists."
            className="border-b border-line-soft px-4 py-3"
          />
          <div className="divide-y divide-line-soft">
            {session.promotions.map((promo) => (
              <PromotionRow
                key={promo.id}
                promotion={promo}
                projects={projects}
                pending={pending}
                onLink={run((externalRef: string) =>
                  linkPromotionAction({ ...ref, promotionId: promo.id, externalRef }),
                )}
              />
            ))}
          </div>
        </div>
      )}
    </PageBody>
  );
}

/* -------------------------------------------------------------------------- */
/* One department                                                             */
/* -------------------------------------------------------------------------- */

type Runner = <T extends unknown[]>(
  fn: (...args: T) => Promise<unknown>,
) => (...args: T) => Promise<void>;

function DepartmentPanel({
  session,
  response,
  respondent,
  systems,
  projects,
  pending,
  run,
}: {
  session: Session;
  response: Session["responses"][number];
  respondent: User | null;
  systems: TechSystem[];
  projects: Project[];
  pending: boolean;
  run: Runner;
}) {
  const ref = { sessionId: session.id, slug: session.slug, department: response.department };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-surface">
        <SectionHeader
          title={`The eight — ${DEPARTMENTS[response.department].name}`}
          description={
            respondent
              ? `Answered by ${respondent.name}, ${respondent.title}. Saves when you click away.`
              : "Saves when you click away."
          }
          className="border-b border-line-soft px-4 py-3"
        />
        <div className="divide-y divide-line-soft">
          {DISCOVERY_QUESTION_LIST.map((question, i) => {
            const answer =
              response.answers.find((a) => a.questionId === question.id)?.answer ?? "";
            const axis = QUESTION_AXIS_META[question.axis];

            return (
              <div key={question.id} className="px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tabular inline-flex size-5 items-center justify-center rounded-full bg-subtle text-2xs font-semibold text-fg-muted">
                    {i + 1}
                  </span>
                  <Label htmlFor={`q-${question.id}`} className="text-xs font-semibold text-fg">
                    {question.prompt}
                  </Label>
                  <Badge tone={axis.tone}>{axis.label}</Badge>
                  {!answer.trim() && <Badge tone="warning">Unanswered</Badge>}
                </div>

                <p className="mt-1 text-2xs leading-4 text-fg-subtle">
                  <span className="font-medium">Listen for:</span> {question.listenFor}
                </p>

                <div className="mt-2">
                  <AutoSaveText
                    id={`q-${question.id}`}
                    value={answer}
                    rows={3}
                    placeholder="In their words where you can."
                    onSave={run((next: string) =>
                      saveAnswerAction({
                        ...ref,
                        questionId: question.id,
                        answer: next,
                      }),
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ResourcesBlock
        session={session}
        response={response}
        systems={systems}
        pending={pending}
        run={run}
      />

      <PainBlock
        session={session}
        response={response}
        projects={projects}
        pending={pending}
        run={run}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Resources                                                                  */
/* -------------------------------------------------------------------------- */

function ResourcesBlock({
  session,
  response,
  systems,
  pending,
  run,
}: {
  session: Session;
  response: Session["responses"][number];
  systems: TechSystem[];
  pending: boolean;
  run: Runner;
}) {
  const ref = { sessionId: session.id, slug: session.slug, department: response.department };
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({
    kind: "report" as ResourceKind,
    name: "",
    location: "",
    systemId: "",
    frequency: "",
    techHasAccess: false,
    notes: "",
  });

  const add = run(async () => {
    await addResourceAction({
      ...ref,
      ...draft,
      systemId: draft.systemId || null,
    });
  });

  return (
    <div className="rounded-lg border border-line bg-surface">
      <SectionHeader
        title="Where they go"
        description="What they log into, which report they open, how they see the number. Doubles as your access list."
        className="border-b border-line-soft px-4 py-3"
        action={
          <Button variant="secondary" size="xs" onClick={() => setAdding((v) => !v)}>
            <Plus />
            Add
          </Button>
        }
      />

      {adding && (
        <div className="space-y-3 border-b border-line-soft bg-canvas px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="res-name">What is it</Label>
              <Input
                id="res-name"
                value={draft.name}
                placeholder="SDR scorecard"
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <Select
                value={draft.kind}
                onValueChange={(v) => setDraft((d) => ({ ...d, kind: v as ResourceKind }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_KIND_ORDER.map((k) => (
                    <SelectItem key={k} value={k}>
                      {RESOURCE_KIND_META[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-loc">Where it lives</Label>
              <Input
                id="res-loc"
                value={draft.location}
                placeholder="Looker Studio → SDR Scorecard"
                onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-freq">How often</Label>
              <Input
                id="res-freq"
                value={draft.frequency}
                placeholder="Every morning"
                onChange={(e) => setDraft((d) => ({ ...d, frequency: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Linked system</Label>
              <Select
                value={draft.systemId || "__none"}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, systemId: v === "__none" ? "" : v }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {systems.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-notes">Notes</Label>
              <Input
                id="res-notes"
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              />
            </div>
          </div>

          <label className="flex w-fit items-center gap-2">
            <Checkbox
              checked={draft.techHasAccess}
              onCheckedChange={(c) => setDraft((d) => ({ ...d, techHasAccess: c === true }))}
            />
            <span className="text-xs text-fg-body">Tech can already read this</span>
          </label>

          <div className="flex gap-2">
            <Button
              variant="primary"
              size="xs"
              disabled={pending || !draft.name.trim()}
              onClick={async () => {
                await add();
                setDraft({
                  kind: "report",
                  name: "",
                  location: "",
                  systemId: "",
                  frequency: "",
                  techHasAccess: false,
                  notes: "",
                });
                setAdding(false);
              }}
            >
              Add resource
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {response.resources.length === 0 ? (
        <EmptyState
          compact
          title="Nothing captured yet"
          description="Ask where the number comes from, then write down the answer."
        />
      ) : (
        <div className="divide-y divide-line-soft">
          {response.resources.map((r) => {
            const kind = RESOURCE_KIND_META[r.kind];
            return (
              <div key={r.id} className="flex items-start gap-3 px-4 py-2.5">
                <Badge tone={kind.tone}>{kind.label}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-fg">{r.name}</p>
                  <p className="mt-0.5 text-2xs text-fg-muted">
                    {[r.location, r.frequency].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {r.notes && <p className="mt-0.5 text-2xs text-fg-subtle">{r.notes}</p>}
                </div>
                {r.techHasAccess ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-2xs text-success">
                    <Unlock className="size-3" />
                    Readable
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 text-2xs font-medium text-critical">
                    <Lock className="size-3" />
                    No access
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="iconXs"
                  disabled={pending}
                  aria-label={`Remove ${r.name}`}
                  onClick={run(() => removeResourceAction({ ...ref, resourceId: r.id }))}
                >
                  <Trash2 />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pain points                                                                */
/* -------------------------------------------------------------------------- */

function PainBlock({
  session,
  response,
  projects,
  pending,
  run,
}: {
  session: Session;
  response: Session["responses"][number];
  projects: Project[];
  pending: boolean;
  run: Runner;
}) {
  const ref = { sessionId: session.id, slug: session.slug, department: response.department };
  const [adding, setAdding] = React.useState(false);
  const [statement, setStatement] = React.useState("");
  const [severity, setSeverity] = React.useState<PainSeverity>("costly");
  const [questionId, setQuestionId] = React.useState<DiscoveryQuestionId | "">("");
  const [promoting, setPromoting] = React.useState<string | null>(null);

  const add = run(async () => {
    await addPainPointAction({
      ...ref,
      statement,
      severity,
      questionId: questionId || null,
      analysis: "",
    });
  });

  return (
    <div className="rounded-lg border border-line bg-surface">
      <SectionHeader
        title="What hurts"
        description="Their words, your read. Nothing here becomes work until you promote it."
        className="border-b border-line-soft px-4 py-3"
        action={
          <Button variant="secondary" size="xs" onClick={() => setAdding((v) => !v)}>
            <Plus />
            Add
          </Button>
        }
      />

      {adding && (
        <div className="space-y-3 border-b border-line-soft bg-canvas px-4 py-3">
          <div className="space-y-1.5">
            <Label htmlFor="pain-statement">What they said</Label>
            <Textarea
              id="pain-statement"
              rows={2}
              value={statement}
              placeholder="I rebuild the roster by hand every Monday because the scorecard has last month's team on it."
              onChange={(e) => setStatement(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>How bad</Label>
              <Select
                value={severity}
                onValueChange={(v) => setSeverity(v as PainSeverity)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAIN_SEVERITY_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PAIN_SEVERITY_META[s].label} — {PAIN_SEVERITY_META[s].description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Which question surfaced it</Label>
              <Select
                value={questionId || "__none"}
                onValueChange={(v) =>
                  setQuestionId(v === "__none" ? "" : (v as DiscoveryQuestionId))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Not from one of the eight" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Not from one of the eight</SelectItem>
                  {DISCOVERY_QUESTION_LIST.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.prompt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="xs"
              disabled={pending || !statement.trim()}
              onClick={async () => {
                await add();
                setStatement("");
                setQuestionId("");
                setAdding(false);
              }}
            >
              Add pain point
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {response.painPoints.length === 0 ? (
        <EmptyState compact title="Nothing recorded yet" />
      ) : (
        <div className="divide-y divide-line-soft">
          {response.painPoints.map((pain) => {
            const sev = PAIN_SEVERITY_META[pain.severity];
            const promotion = session.promotions.find((p) => p.id === pain.promotionId);

            return (
              <div key={pain.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={sev.tone}>{sev.label}</Badge>
                      {pain.questionId && (
                        <span className="text-2xs text-fg-subtle">
                          {DISCOVERY_QUESTIONS[pain.questionId].prompt}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-fg-body">{pain.statement}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {promotion ? (
                      <Badge tone={PROMOTION_TARGET_META[promotion.target].tone}>
                        {PROMOTION_TARGET_META[promotion.target].label}: {promotion.title}
                      </Badge>
                    ) : (
                      <Button
                        variant="secondary"
                        size="xs"
                        disabled={pending}
                        onClick={() => setPromoting(promoting === pain.id ? null : pain.id)}
                      >
                        <ArrowUpRight />
                        Promote
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="iconXs"
                      disabled={pending}
                      aria-label="Remove pain point"
                      onClick={run(() =>
                        removePainPointAction({ ...ref, painPointId: pain.id }),
                      )}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                <div className="mt-2">
                  <Label className="text-2xs text-fg-subtle">
                    Your read (not shown to the department)
                  </Label>
                  <div className="mt-1">
                    <AutoSaveText
                      value={pain.analysis}
                      rows={2}
                      placeholder="What is actually going on underneath this."
                      onSave={run((next: string) =>
                        updatePainPointAction({
                          ...ref,
                          painPointId: pain.id,
                          analysis: next,
                        }),
                      )}
                    />
                  </div>
                </div>

                {promoting === pain.id && !promotion && (
                  <PromoteForm
                    projects={projects}
                    defaultTitle={pain.statement.slice(0, 80)}
                    pending={pending}
                    onCancel={() => setPromoting(null)}
                    onSubmit={async (input: {
                      target: PromotionTarget;
                      title: string;
                      rationale: string;
                      projectId: string | null;
                    }) => {
                      await run(() =>
                        promotePainPointAction({ ...ref, painPointId: pain.id, ...input }),
                      )();
                      setPromoting(null);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PromoteForm({
  projects,
  defaultTitle,
  pending,
  onCancel,
  onSubmit,
}: {
  projects: Project[];
  defaultTitle: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (input: {
    target: PromotionTarget;
    title: string;
    rationale: string;
    projectId: string | null;
  }) => Promise<void>;
}) {
  const [target, setTarget] = React.useState<PromotionTarget>("ticket");
  const [title, setTitle] = React.useState(defaultTitle);
  const [rationale, setRationale] = React.useState("");
  const [projectId, setProjectId] = React.useState("");

  return (
    <div className="mt-3 space-y-3 rounded-md border border-line bg-canvas px-3 py-3">
      <p className="text-2xs text-fg-muted">
        This records the decision. It does not create anything — tickets live in ClickUp, so a
        ticket invented here would be one nobody is working. The queue on the sessions page is
        what you work from.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Becomes</Label>
          <Select value={target} onValueChange={(v) => setTarget(v as PromotionTarget)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROMOTION_TARGET_ORDER.map((t) => (
                <SelectItem key={t} value={t}>
                  {PROMOTION_TARGET_META[t].label} — {PROMOTION_TARGET_META[t].description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Joins an existing project</Label>
          <Select
            value={projectId || "__none"}
            onValueChange={(v) => setProjectId(v === "__none" ? "" : v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Standalone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Standalone</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="promo-title">Title</Label>
        <Input
          id="promo-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="promo-why">Why this is worth building</Label>
        <Textarea
          id="promo-why"
          rows={2}
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="primary"
          size="xs"
          disabled={pending || !title.trim()}
          onClick={() => onSubmit({ target, title, rationale, projectId: projectId || null })}
        >
          Promote
        </Button>
        <Button variant="ghost" size="xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function PromotionRow({
  promotion,
  projects,
  pending,
  onLink,
}: {
  promotion: Session["promotions"][number];
  projects: Project[];
  pending: boolean;
  onLink: (externalRef: string) => Promise<void>;
}) {
  const [value, setValue] = React.useState(promotion.externalRef ?? "");
  const target = PROMOTION_TARGET_META[promotion.target];
  const project = projects.find((p) => p.id === promotion.projectId);

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Badge tone={target.tone}>{target.label}</Badge>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-fg">{promotion.title}</p>
        {promotion.rationale && (
          <p className="mt-0.5 text-2xs text-fg-muted">{promotion.rationale}</p>
        )}
        {project && (
          <Link
            href={`/projects/${project.id}`}
            className="mt-0.5 inline-block text-2xs text-teal-700 hover:underline"
          >
            {project.name}
          </Link>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Input
          value={value}
          placeholder="ClickUp id"
          className="h-7 w-32 text-2xs"
          onChange={(e) => setValue(e.target.value)}
        />
        <Button
          variant="secondary"
          size="xs"
          disabled={pending || value === (promotion.externalRef ?? "")}
          onClick={() => onLink(value)}
        >
          Link
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Follow-ups                                                                 */
/* -------------------------------------------------------------------------- */

function FollowUps({
  session,
  pending,
  run,
}: {
  session: Session;
  pending: boolean;
  run: Runner;
}) {
  const ref = { sessionId: session.id, slug: session.slug };
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");

  return (
    <div className="rounded-lg border border-line bg-surface">
      <SectionHeader
        title="Follow-ups"
        description="Asked in this session only. The eight stay locked; anything else goes here."
        className="border-b border-line-soft px-4 py-3"
      />

      {session.followUps.length > 0 && (
        <div className="divide-y divide-line-soft">
          {session.followUps.map((f) => (
            <div key={f.id} className="flex items-start gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-fg">{f.question}</p>
                <p className="mt-0.5 text-xs text-fg-body">{f.answer}</p>
              </div>
              <Button
                variant="ghost"
                size="iconXs"
                disabled={pending}
                aria-label="Remove follow-up"
                onClick={run(() => removeFollowUpAction({ ...ref, followUpId: f.id }))}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 border-t border-line-soft px-4 py-3">
        <Input
          value={question}
          placeholder="What did you ask?"
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Textarea
          rows={2}
          value={answer}
          placeholder="What did they say?"
          onChange={(e) => setAnswer(e.target.value)}
        />
        <Button
          variant="secondary"
          size="xs"
          disabled={pending || !question.trim()}
          onClick={async () => {
            await run(() => addFollowUpAction({ ...ref, question, answer }))();
            setQuestion("");
            setAnswer("");
          }}
        >
          <Plus />
          Add follow-up
        </Button>
      </div>
    </div>
  );
}
