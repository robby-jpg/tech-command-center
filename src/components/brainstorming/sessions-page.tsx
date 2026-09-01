"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  CircleCheck,
  ExternalLink,
  Layers,
  Lock,
  MessagesSquare,
  Plus,
  TriangleAlert,
} from "lucide-react";
import {
  DEPARTMENTS,
  DISCOVERY_QUESTIONS,
  DISCOVERY_QUESTION_LIST,
  LOOP_STAGE_META,
  PAIN_SEVERITY_META,
  PROMOTION_TARGET_META,
  QUESTION_AXIS_META,
  QUESTION_TEMPLATE_VERSION,
  RESOURCE_KIND_META,
  SESSION_KIND_META,
  answerHistory,
  type DepartmentKey,
  type DiscoveryQuestionId,
  type Session,
  type User,
} from "@/domain";
import {
  departmentCoverage,
  loopSummary,
  painBacklog,
  promotionQueue,
  resourceInventory,
} from "@/lib/session-insights";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { PageBody, SectionHeader } from "@/components/shared/page";
import { EmptyState } from "@/components/shared/states";
import { MetricCard } from "@/components/shared/metric-card";
import { LoopDiagram } from "./loop-diagram";
import { NewSessionDialog } from "./new-session-dialog";

/**
 * The Brainstorming index: the log, and everything derived from it.
 *
 * Reads sessions as props rather than from the workspace store, because
 * sessions are files rather than snapshot state. See `lib/sessions.ts`.
 */
export function SessionsPage({
  sessions,
  users,
  currentUserId,
}: {
  sessions: Session[];
  users: User[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);

  const summary = React.useMemo(() => loopSummary(sessions), [sessions]);
  const coverage = React.useMemo(() => departmentCoverage(sessions), [sessions]);
  const inventory = React.useMemo(() => resourceInventory(sessions), [sessions]);
  const pain = React.useMemo(() => painBacklog(sessions), [sessions]);
  const promotions = React.useMemo(() => promotionQueue(sessions), [sessions]);

  const latest = sessions[0] ?? null;

  if (sessions.length === 0) {
    return (
      <PageBody>
        <LoopDiagram />
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            icon={MessagesSquare}
            title="No sessions logged yet"
            description="Open cycle 1 before the next leadership meeting. The eight questions are already loaded; you fill them in as you go."
            action={
              <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
                <Plus />
                Open cycle 1
              </Button>
            }
          />
        </div>
        <NewSessionDialog
          open={creating}
          onOpenChange={setCreating}
          users={users}
          currentUserId={currentUserId}
          nextCycle={1}
          onCreated={(slug) => router.push(`/brainstorming/sessions/${slug}`)}
        />
      </PageBody>
    );
  }

  return (
    <PageBody>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard
          label="Cycles run"
          value={summary.cycles}
          hint={latest ? `Latest: cycle ${latest.cycle}, ${formatDate(latest.heldAt)}` : undefined}
        />
        <MetricCard
          label="Departments covered"
          value={summary.departments}
          hint={`of ${Object.keys(DEPARTMENTS).length - 1} outside Tech`}
        />
        <MetricCard
          label="Pain points"
          value={summary.painTotal}
          tone={summary.painUnpromoted > 0 ? "warning" : undefined}
          hint={`${summary.painUnpromoted} not yet decided on`}
        />
        <MetricCard
          label="Queued to create"
          value={summary.promotionsPending}
          tone={summary.promotionsPending > 0 ? "info" : undefined}
          hint="Promotions with nothing real behind them yet"
        />
        <MetricCard
          label="Data you cannot reach"
          value={summary.resourcesBlocked}
          tone={summary.resourcesBlocked > 0 ? "critical" : "success"}
          hint={`of ${summary.resourcesKnown} resources named`}
        />
      </div>

      <LoopDiagram activeStage={latest?.stage ?? null} />

      <Tabs defaultValue="cycles">
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="cycles">Cycles</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="pain">Pain &amp; promotions</TabsTrigger>
            <TabsTrigger value="questions">By question</TabsTrigger>
          </TabsList>
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            <Plus />
            New session
          </Button>
        </div>

        {/* ------------------------------------------------------------------ */}
        <TabsContent value="cycles" className="mt-4 space-y-4">
          <div className="space-y-2.5">
            {sessions.map((session) => {
              const stage = LOOP_STAGE_META[session.stage];
              const kind = SESSION_KIND_META[session.kind];
              const painCount = session.responses.reduce(
                (n, r) => n + r.painPoints.length,
                0,
              );
              const answered = session.responses.reduce(
                (n, r) => n + r.answers.filter((a) => a.answer.trim()).length,
                0,
              );
              const askable = session.responses.length * DISCOVERY_QUESTION_LIST.length;

              return (
                <Link
                  key={session.id}
                  href={`/brainstorming/sessions/${session.slug}`}
                  className="card-interactive block rounded-lg border border-line bg-surface px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tabular rounded bg-navy-50 px-1.5 py-0.5 text-2xs font-semibold text-navy-700">
                          Cycle {session.cycle}
                        </span>
                        <h3 className="truncate text-sm font-semibold text-fg">
                          {session.title}
                        </h3>
                        <Badge tone={kind.tone}>
                          {kind.label}
                        </Badge>
                        <Badge tone={stage.tone}>
                          {stage.label}
                        </Badge>
                        {session.templateVersion !== QUESTION_TEMPLATE_VERSION && (
                          <Badge tone="neutral">
                            Template v{session.templateVersion}
                          </Badge>
                        )}
                      </div>

                      {session.demoedWhat && (
                        <p className="mt-1.5 text-xs text-fg-muted">
                          <span className="font-medium text-fg-body">Demoed:</span>{" "}
                          {session.demoedWhat}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-fg-subtle">
                        <span>{formatDate(session.heldAt)}</span>
                        <span>
                          {session.responses.length}{" "}
                          {session.responses.length === 1 ? "department" : "departments"}
                        </span>
                        <span className={cn(answered < askable && "text-warning")}>
                          {answered}/{askable} answered
                        </span>
                        {painCount > 0 && <span>{painCount} pain points</span>}
                        {session.promotions.length > 0 && (
                          <span>{session.promotions.length} promoted</span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-1">
                      {session.responses.map((r) => (
                        <Badge key={r.department} tone="neutral">
                          {DEPARTMENTS[r.department].shortName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="rounded-lg border border-line bg-surface">
            <SectionHeader
              title="Coverage"
              description="Who has been asked, and what has never come back with an answer."
              className="border-b border-line-soft px-4 py-3"
            />
            <div className="divide-y divide-line-soft">
              {coverage.map((c) => (
                <div key={c.department} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <span className="w-32 shrink-0 text-xs font-medium text-fg">
                    {DEPARTMENTS[c.department].name}
                  </span>
                  <span className="tabular w-28 shrink-0 text-2xs text-fg-muted">
                    {c.cycles.length} {c.cycles.length === 1 ? "cycle" : "cycles"} · last #
                    {c.lastCycle}
                  </span>
                  {c.neverAnswered.length === 0 ? (
                    <span className="inline-flex items-center gap-1 text-2xs text-success">
                      <CircleCheck className="size-3" />
                      All eight answered
                    </span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <TriangleAlert className="size-3 shrink-0 text-warning" />
                      <span className="text-2xs text-fg-muted">Never answered:</span>
                      {c.neverAnswered.map((q) => (
                        <Badge key={q} tone="warning">
                          {DISCOVERY_QUESTIONS[q].prompt}
                        </Badge>
                      ))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        <TabsContent value="resources" className="mt-4">
          <div className="rounded-lg border border-line bg-surface">
            <SectionHeader
              title="Where they go"
              description="Everything the departments named, deduplicated across cycles. Anything you cannot reach yet is at the top — that list is what blocks the gather stage."
              className="border-b border-line-soft px-4 py-3"
            />
            {inventory.length === 0 ? (
              <EmptyState
                icon={Layers}
                compact
                title="Nothing recorded yet"
                description="Resources are captured per department inside a session."
              />
            ) : (
              <div className="scrollbar-slim overflow-x-auto">
                <table className="w-full min-w-[52rem] text-left">
                  <thead className="border-b border-line-soft bg-subtle/60">
                    <tr className="text-2xs text-fg-muted">
                      <th className="px-4 py-2 font-medium">Resource</th>
                      <th className="px-3 py-2 font-medium">Kind</th>
                      <th className="px-3 py-2 font-medium">Department</th>
                      <th className="px-3 py-2 font-medium">Where</th>
                      <th className="px-3 py-2 font-medium">How often</th>
                      <th className="px-3 py-2 font-medium">Tech access</th>
                      <th className="px-3 py-2 font-medium">Named in</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {inventory.map((r) => {
                      const kind = RESOURCE_KIND_META[r.kind];
                      return (
                        <tr key={r.key} className="align-top">
                          <td className="px-4 py-2.5">
                            <p className="text-xs font-medium text-fg">{r.name}</p>
                            {r.notes && (
                              <p className="mt-0.5 text-2xs text-fg-muted">{r.notes}</p>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge tone={kind.tone}>
                              {kind.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-2xs text-fg-body">
                            {DEPARTMENTS[r.department].shortName}
                          </td>
                          <td className="max-w-56 px-3 py-2.5 text-2xs break-words text-fg-muted">
                            {r.location || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-2xs text-fg-muted">
                            {r.frequency || "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            {r.techHasAccess ? (
                              <span className="inline-flex items-center gap-1 text-2xs text-success">
                                <CircleCheck className="size-3" />
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-2xs font-medium text-critical">
                                <Lock className="size-3" />
                                Blocked
                              </span>
                            )}
                          </td>
                          <td className="tabular px-3 py-2.5 text-2xs text-fg-subtle">
                            {r.cycles.map((c) => `#${c}`).join(", ")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        <TabsContent value="pain" className="mt-4 space-y-4">
          <div className="rounded-lg border border-line bg-surface">
            <SectionHeader
              title="Queued to create"
              description="Promoted, but nothing real exists behind it yet. These are the tickets and projects to go and open in ClickUp."
              className="border-b border-line-soft px-4 py-3"
            />
            {promotions.length === 0 ? (
              <EmptyState
                compact
                title="Nothing promoted yet"
                description="Promote a pain point from inside a session once you have decided it is worth building against."
              />
            ) : (
              <div className="divide-y divide-line-soft">
                {promotions.map((p) => {
                  const target = PROMOTION_TARGET_META[p.target];
                  return (
                    <div key={p.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={target.tone}>
                          {target.label}
                        </Badge>
                        <span className="text-xs font-medium text-fg">{p.title}</span>
                        <Badge tone="neutral">
                          {DEPARTMENTS[p.department].shortName}
                        </Badge>
                        {p.externalRef ? (
                          <span className="inline-flex items-center gap-1 text-2xs text-success">
                            <ExternalLink className="size-3" />
                            {p.externalRef}
                          </span>
                        ) : (
                          <Badge tone="warning">
                            Not created yet
                          </Badge>
                        )}
                      </div>
                      {p.painStatement && (
                        <p className="mt-1.5 border-l-2 border-line pl-2.5 text-xs text-fg-muted italic">
                          “{p.painStatement}”
                        </p>
                      )}
                      {p.rationale && (
                        <p className="mt-1.5 text-2xs text-fg-body">{p.rationale}</p>
                      )}
                      <Link
                        href={`/brainstorming/sessions/${p.sessionSlug}`}
                        className="mt-1.5 inline-block text-2xs text-teal-700 hover:underline"
                      >
                        From cycle {p.cycle}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-line bg-surface">
            <SectionHeader
              title="Everything heard"
              description="Every pain point across every cycle, worst first."
              className="border-b border-line-soft px-4 py-3"
            />
            {pain.length === 0 ? (
              <EmptyState compact title="Nothing recorded yet" />
            ) : (
              <div className="divide-y divide-line-soft">
                {pain.map((p) => {
                  const sev = PAIN_SEVERITY_META[p.severity];
                  return (
                    <div key={`${p.sessionId}-${p.id}`} className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={sev.tone}>
                          {sev.label}
                        </Badge>
                        <Badge tone="neutral">
                          {DEPARTMENTS[p.department].shortName}
                        </Badge>
                        <span className="tabular text-2xs text-fg-subtle">
                          Cycle {p.cycle}
                        </span>
                        {p.promotionId ? (
                          <Badge tone="success">
                            Promoted
                          </Badge>
                        ) : (
                          <Badge tone="warning">
                            Undecided
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-fg-body">{p.statement}</p>
                      {p.questionId && (
                        <p className="mt-1 text-2xs text-fg-subtle">
                          From: {DISCOVERY_QUESTIONS[p.questionId].prompt}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        <TabsContent value="questions" className="mt-4">
          <QuestionComparison sessions={sessions} />
        </TabsContent>
      </Tabs>

      <NewSessionDialog
        open={creating}
        onOpenChange={setCreating}
        users={users}
        currentUserId={currentUserId}
        nextCycle={(latest?.cycle ?? 0) + 1}
        onCreated={(slug) => router.push(`/brainstorming/sessions/${slug}`)}
      />
    </PageBody>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * One question, read down every department and every cycle.
 *
 * This view is the entire argument for locking the template. Cycle-over-cycle
 * comparison of a free-text answer is only meaningful if the question did not
 * move underneath it, which is also why an answer given under an older
 * template version is labelled as such rather than quietly shown alongside.
 */
function QuestionComparison({ sessions }: { sessions: Session[] }) {
  const [questionId, setQuestionId] = React.useState<DiscoveryQuestionId>("data-use");

  const departments = React.useMemo(() => {
    const seen: DepartmentKey[] = [];
    for (const s of sessions)
      for (const r of s.responses) if (!seen.includes(r.department)) seen.push(r.department);
    return seen;
  }, [sessions]);

  const question = DISCOVERY_QUESTIONS[questionId];
  const axis = QUESTION_AXIS_META[question.axis];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {DISCOVERY_QUESTION_LIST.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setQuestionId(q.id)}
            aria-pressed={q.id === questionId}
            className={cn(
              "rounded-md border px-2.5 py-1.5 text-left text-2xs font-medium transition-colors",
              q.id === questionId
                ? "border-teal-300 bg-teal-50 text-teal-800"
                : "border-line bg-surface text-fg-muted hover:bg-subtle hover:text-fg",
            )}
          >
            {q.prompt}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-surface">
        <div className="border-b border-line-soft px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-fg">{question.prompt}</h2>
            <Badge tone={axis.tone}>
              {axis.label}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-fg-muted">{question.why}</p>
          <p className="mt-1 text-2xs text-fg-subtle">
            <span className="font-medium">Listen for:</span> {question.listenFor}
          </p>
        </div>

        <div className="divide-y divide-line-soft">
          {departments.length === 0 && (
            <EmptyState compact title="No departments have answered yet" />
          )}
          {departments.map((dept) => {
            const history = answerHistory(sessions, dept, questionId);
            return (
              <div key={dept} className="px-4 py-3">
                <p className="text-xs font-semibold text-fg">{DEPARTMENTS[dept].name}</p>
                {history.length === 0 ? (
                  <p className="mt-1 text-2xs text-fg-subtle italic">
                    Never answered this one.
                  </p>
                ) : (
                  <ol className="mt-2 space-y-2">
                    {history
                      .slice()
                      .reverse()
                      .map((h) => (
                        <li key={h.cycle} className="flex gap-3">
                          <span className="tabular w-20 shrink-0 text-2xs text-fg-subtle">
                            #{h.cycle} · {formatDate(h.heldAt)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs leading-5 text-fg-body">{h.answer}</p>
                            {h.templateVersion !== QUESTION_TEMPLATE_VERSION && (
                              <span className="mt-0.5 inline-block text-2xs text-warning">
                                Asked under template v{h.templateVersion} — wording has since
                                changed.
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
