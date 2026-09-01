"use client";

import * as React from "react";
import {
  Check,
  ClipboardList,
  Loader2,
  Quote,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  DEPARTMENTS,
  DISCOVERY_QUESTIONS,
  PAIN_SEVERITY_META,
  PROPOSAL_CONFIDENCE_META,
  PROPOSAL_KIND_META,
  RESOURCE_KIND_META,
  isOverwrite,
  type Session,
  type SessionProposal,
} from "@/domain";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from "@/components/ui/primitives";
import { SectionHeader } from "@/components/shared/page";
import {
  analyzeTranscriptAction,
  decideProposalsAction,
  saveTranscriptAction,
} from "@/app/(command)/brainstorming/sessions/actions";

/**
 * Meeting notes in, proposals out, a human in between.
 *
 * The review step is not a formality and the UI is built to make skipping it
 * awkward rather than easy: nothing is pre-approved, the evidence sits directly
 * under each suggestion, and an overwrite is visually distinguished from a fill
 * because losing an answer somebody actually gave is the worst thing this
 * feature can do.
 */
export function TranscriptPanel({ session }: { session: Session }) {
  const [draft, setDraft] = React.useState(session.transcript);
  const [savedValue, setSavedValue] = React.useState(session.transcript);
  const [saving, setSaving] = React.useState(false);
  const [analysing, setAnalysing] = React.useState(false);
  const [message, setMessage] = React.useState<
    { tone: "ok" | "error"; text: string } | null
  >(null);
  const [reviewing, setReviewing] = React.useState(false);

  // Adopt the server's value when it moves, adjusted during render rather than
  // in an effect. See the same pattern in session-detail.tsx.
  const [lastServerValue, setLastServerValue] = React.useState(session.transcript);
  if (session.transcript !== lastServerValue) {
    setLastServerValue(session.transcript);
    setDraft(session.transcript);
    setSavedValue(session.transcript);
  }

  const pending = session.proposals.filter((p) => p.status === "pending");
  const decided = session.proposals.filter((p) => p.status !== "pending");
  const dirty = draft !== savedValue;

  const ref = { sessionId: session.id, slug: session.slug };

  async function save() {
    if (!dirty) return;
    setSaving(true);
    await saveTranscriptAction({ ...ref, transcript: draft });
    setSavedValue(draft);
    setSaving(false);
  }

  async function analyse() {
    setMessage(null);
    setAnalysing(true);
    try {
      // Save first — the action reads the transcript from the file, so an
      // unsaved edit would silently be analysed in its previous state.
      if (dirty) {
        await saveTranscriptAction({ ...ref, transcript: draft });
        setSavedValue(draft);
      }

      const result = await analyzeTranscriptAction(ref);

      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }

      setMessage({
        tone: "ok",
        text:
          result.proposalCount === 0
            ? "Nothing could be proposed from these notes with evidence behind it."
            : `${result.proposalCount} ${result.proposalCount === 1 ? "suggestion" : "suggestions"} to review${
                result.unanswered > 0
                  ? `, and ${result.unanswered} ${result.unanswered === 1 ? "question" : "questions"} the notes do not answer`
                  : ""
              }.`,
      });
      if (result.proposalCount > 0) setReviewing(true);
    } finally {
      setAnalysing(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface">
      <SectionHeader
        title="Meeting notes"
        description="Paste the transcript or your notes. Claude reads them and proposes answers; you approve each one before anything is saved."
        className="border-b border-line-soft px-4 py-3"
        action={
          pending.length > 0 ? (
            <Button variant="primary" size="xs" onClick={() => setReviewing(true)}>
              <ClipboardList />
              Review {pending.length}
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-3 p-4">
        <Textarea
          rows={8}
          value={draft}
          placeholder="Paste the meeting transcript here. Speaker labels help — they are how answers get attributed to the right department."
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          className="font-mono text-xs"
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm" onClick={analyse} disabled={analysing || !draft.trim()}>
            {analysing ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {analysing ? "Reading the notes…" : "Analyze with Claude"}
          </Button>

          <span className="text-2xs text-fg-subtle">
            {draft.trim() ? `${draft.trim().split(/\s+/).length.toLocaleString()} words` : "Empty"}
            {saving && " · saving"}
            {!saving && dirty && " · unsaved"}
          </span>

          {session.lastAnalysis && (
            <span className="ml-auto text-2xs text-fg-subtle">
              Last read {formatDateTime(session.lastAnalysis.at)} by{" "}
              <span className="font-mono">{session.lastAnalysis.model}</span>
            </span>
          )}
        </div>

        {analysing && (
          <p className="text-2xs text-fg-muted">
            A long transcript takes a minute or two. Nothing is written until you approve it.
          </p>
        )}

        {message && (
          <p
            className={cn(
              "rounded-md border px-3 py-2 text-xs",
              message.tone === "ok"
                ? "border-success-border bg-success-bg text-success"
                : "border-critical-border bg-critical-bg text-critical",
            )}
          >
            {message.text}
          </p>
        )}

        {pending.length === 0 && decided.length > 0 && (
          <p className="text-2xs text-fg-subtle">
            {decided.filter((p) => p.status === "approved").length} accepted,{" "}
            {decided.filter((p) => p.status === "rejected").length} rejected from earlier reads.
          </p>
        )}
      </div>

      <ReviewDialog
        key={pending.map((p) => p.id).join(",")}
        open={reviewing}
        onOpenChange={setReviewing}
        session={session}
        proposals={pending}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Review                                                                     */
/* -------------------------------------------------------------------------- */

type Decision = { approved: boolean; text: string };

function ReviewDialog({
  open,
  onOpenChange,
  session,
  proposals,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  proposals: SessionProposal[];
}) {
  const [decisions, setDecisions] = React.useState<Record<string, Decision>>({});
  const [applying, setApplying] = React.useState(false);

  const decide = (proposal: SessionProposal, approved: boolean) =>
    setDecisions((d) => ({
      ...d,
      [proposal.id]: {
        approved,
        text: d[proposal.id]?.text ?? proposal.proposedText,
      },
    }));

  const edit = (proposal: SessionProposal, text: string) =>
    setDecisions((d) => ({
      ...d,
      [proposal.id]: { approved: d[proposal.id]?.approved ?? true, text },
    }));

  const chosen = Object.entries(decisions);
  const approvals = chosen.filter(([, d]) => d.approved).length;
  const rejections = chosen.length - approvals;

  async function apply() {
    setApplying(true);
    try {
      await decideProposalsAction({
        sessionId: session.id,
        slug: session.slug,
        decisions: chosen.map(([proposalId, d]) => ({
          proposalId,
          approved: d.approved,
          finalText: d.text,
        })),
      });
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  }

  // Grouped so a reviewer reads one department's meeting at a time rather than
  // jumping between teams on every card.
  const byDepartment = React.useMemo(() => {
    const groups = new Map<string, SessionProposal[]>();
    for (const p of proposals) {
      const list = groups.get(p.department) ?? [];
      list.push(p);
      groups.set(p.department, list);
    }
    return [...groups.entries()];
  }, [proposals]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {proposals.length} {proposals.length === 1 ? "suggestion" : "suggestions"} from the
            notes
          </DialogTitle>
          <DialogDescription>
            Each one quotes the passage it came from. Edit the wording if you want it in your own
            words. Anything you leave undecided stays here for later.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 border-y border-line-soft py-2">
          <Button
            variant="secondary"
            size="xs"
            onClick={() =>
              setDecisions((d) => {
                const next = { ...d };
                for (const p of proposals) {
                  if (p.confidence === "high" && !isOverwrite(p)) {
                    next[p.id] = { approved: true, text: next[p.id]?.text ?? p.proposedText };
                  }
                }
                return next;
              })
            }
          >
            <Check />
            Accept the confident ones that fill a blank
          </Button>
          <Button variant="ghost" size="xs" onClick={() => setDecisions({})}>
            Clear
          </Button>
          <span className="ml-auto text-2xs text-fg-subtle">
            {approvals} to accept · {rejections} to reject ·{" "}
            {proposals.length - chosen.length} undecided
          </span>
        </div>

        <div className="scrollbar-slim max-h-[55vh] space-y-5 overflow-y-auto px-1 py-1">
          {byDepartment.map(([department, group]) => (
            <section key={department} className="space-y-2.5">
              <h3 className="text-xs font-semibold text-fg">
                {DEPARTMENTS[department as keyof typeof DEPARTMENTS].name}
              </h3>
              {group.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  decision={decisions[proposal.id]}
                  onDecide={decide}
                  onEdit={edit}
                />
              ))}
            </section>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={apply}
            disabled={applying || chosen.length === 0}
          >
            {applying
              ? "Applying…"
              : `Apply ${approvals} ${approvals === 1 ? "change" : "changes"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProposalCard({
  proposal,
  decision,
  onDecide,
  onEdit,
}: {
  proposal: SessionProposal;
  decision: Decision | undefined;
  onDecide: (proposal: SessionProposal, approved: boolean) => void;
  onEdit: (proposal: SessionProposal, text: string) => void;
}) {
  const kind = PROPOSAL_KIND_META[proposal.kind];
  const confidence = PROPOSAL_CONFIDENCE_META[proposal.confidence];
  const overwrite = isOverwrite(proposal);

  return (
    <article
      className={cn(
        "rounded-lg border px-3.5 py-3 transition-colors",
        decision?.approved === true && "border-success-border bg-success-bg/30",
        decision?.approved === false && "border-line bg-subtle/60 opacity-70",
        decision === undefined && "border-line bg-canvas",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={kind.tone}>{kind.label}</Badge>
        <Badge tone={confidence.tone}>{confidence.label} confidence</Badge>
        {overwrite && (
          <Badge tone="critical">
            <TriangleAlert className="size-3" />
            Replaces an existing answer
          </Badge>
        )}
        {proposal.kind === "pain_point" && proposal.severity && (
          <Badge tone={PAIN_SEVERITY_META[proposal.severity].tone}>
            {PAIN_SEVERITY_META[proposal.severity].label}
          </Badge>
        )}
        {proposal.kind === "resource" && proposal.resourceKind && (
          <Badge tone={RESOURCE_KIND_META[proposal.resourceKind].tone}>
            {RESOURCE_KIND_META[proposal.resourceKind].label}
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant={decision?.approved === true ? "primary" : "secondary"}
            size="xs"
            onClick={() => onDecide(proposal, true)}
          >
            <Check />
            Accept
          </Button>
          <Button
            variant={decision?.approved === false ? "danger" : "ghost"}
            size="xs"
            onClick={() => onDecide(proposal, false)}
          >
            <X />
            Reject
          </Button>
        </div>
      </div>

      {proposal.questionId && (
        <p className="mt-2 text-xs font-medium text-fg">
          {DISCOVERY_QUESTIONS[proposal.questionId].prompt}
        </p>
      )}

      {overwrite && (
        <div className="mt-2 rounded-md border border-line bg-surface px-2.5 py-2">
          <p className="text-2xs font-medium text-fg-subtle">Currently says</p>
          <p className="mt-0.5 text-xs leading-5 text-fg-muted line-through decoration-critical/40">
            {proposal.currentText}
          </p>
        </div>
      )}

      <div className="mt-2">
        <p className="text-2xs font-medium text-fg-subtle">
          {proposal.kind === "answer"
            ? overwrite
              ? "Would become"
              : "Would fill in"
            : proposal.kind === "pain_point"
              ? "Would add as a pain point"
              : "Would add as a resource"}
        </p>
        <Textarea
          rows={proposal.kind === "resource" ? 1 : 3}
          className="mt-1 text-xs"
          value={decision?.text ?? proposal.proposedText}
          onChange={(e) => onEdit(proposal, e.target.value)}
        />
        {proposal.kind === "resource" && (proposal.location || proposal.frequency) && (
          <p className="mt-1 text-2xs text-fg-subtle">
            {[proposal.location, proposal.frequency].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      <div className="mt-2.5 border-l-2 border-line pl-2.5">
        <p className="inline-flex items-center gap-1 text-2xs font-medium text-fg-subtle">
          <Quote className="size-3" />
          From the notes
        </p>
        <p className="mt-0.5 text-xs leading-5 text-fg-body italic">“{proposal.evidence}”</p>
      </div>

      {proposal.reasoning && (
        <p className="mt-1.5 text-2xs leading-4 text-fg-muted">{proposal.reasoning}</p>
      )}
    </article>
  );
}
