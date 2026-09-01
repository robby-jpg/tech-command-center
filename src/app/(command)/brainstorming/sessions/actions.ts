"use server";

import { revalidatePath } from "next/cache";
import type {
  DepartmentKey,
  DiscoveryQuestionId,
  LoopStage,
  PainSeverity,
  PromotionTarget,
  ResourceKind,
} from "@/domain";
import { getWorkspaceSnapshot } from "@/lib/data";
import * as store from "@/lib/sessions";
import {
  MissingCredentialsError,
  analyseTranscript,
  toStoredProposals,
} from "@/lib/transcript-analysis";

/**
 * Every write the Brainstorming section can make.
 *
 * Server actions rather than store mutations, because sessions are files on
 * disk rather than part of the client snapshot — see the note at the top of
 * `lib/sessions.ts` for why that distinction is the whole point. The trade is
 * that a keystroke cannot be optimistic here; each of these is a deliberate
 * save, and the UI is built around save buttons rather than live binding.
 */

const BASE = "/brainstorming/sessions";

function refresh(slug?: string) {
  revalidatePath(BASE);
  if (slug) revalidatePath(`${BASE}/${slug}`);
}

export async function createSessionAction(input: {
  title: string;
  kind: "discovery" | "demo" | "both";
  heldAt: string;
  facilitatorId: string;
  attendeeIds: string[];
  demoedWhat: string;
  departments: Array<{ department: DepartmentKey; respondentId: string }>;
}) {
  const session = await store.createSession(input);
  refresh(session.slug);
  return { slug: session.slug };
}

export async function saveAnswerAction(input: {
  sessionId: string;
  slug: string;
  department: DepartmentKey;
  questionId: DiscoveryQuestionId;
  answer: string;
}) {
  await store.updateAnswer(input.sessionId, input.department, input.questionId, input.answer);
  refresh(input.slug);
}

export async function saveNarrativeAction(input: {
  sessionId: string;
  slug: string;
  summary?: string;
  privateAnalysis?: string;
  demoedWhat?: string;
  title?: string;
}) {
  const { sessionId, slug, ...patch } = input;
  await store.updateNarrative(sessionId, patch);
  refresh(slug);
}

export async function advanceStageAction(input: {
  sessionId: string;
  slug: string;
  stage: LoopStage;
}) {
  await store.advanceStage(input.sessionId, input.stage);
  refresh(input.slug);
}

export async function addResourceAction(input: {
  sessionId: string;
  slug: string;
  department: DepartmentKey;
  kind: ResourceKind;
  name: string;
  location: string;
  systemId: string | null;
  frequency: string;
  techHasAccess: boolean;
  notes: string;
}) {
  const { sessionId, slug, department, ...resource } = input;
  await store.addResource(sessionId, department, resource);
  refresh(slug);
}

export async function removeResourceAction(input: {
  sessionId: string;
  slug: string;
  department: DepartmentKey;
  resourceId: string;
}) {
  await store.removeResource(input.sessionId, input.department, input.resourceId);
  refresh(input.slug);
}

export async function addPainPointAction(input: {
  sessionId: string;
  slug: string;
  department: DepartmentKey;
  statement: string;
  severity: PainSeverity;
  questionId: DiscoveryQuestionId | null;
  analysis: string;
}) {
  const { sessionId, slug, department, ...pain } = input;
  await store.addPainPoint(sessionId, department, pain);
  refresh(slug);
}

export async function updatePainPointAction(input: {
  sessionId: string;
  slug: string;
  department: DepartmentKey;
  painPointId: string;
  statement?: string;
  severity?: PainSeverity;
  analysis?: string;
}) {
  const { sessionId, slug, department, painPointId, ...patch } = input;
  await store.updatePainPoint(sessionId, department, painPointId, patch);
  refresh(slug);
}

export async function removePainPointAction(input: {
  sessionId: string;
  slug: string;
  department: DepartmentKey;
  painPointId: string;
}) {
  await store.removePainPoint(input.sessionId, input.department, input.painPointId);
  refresh(input.slug);
}

/**
 * Turns a pain point into a recorded intent to build something.
 *
 * Note what this does *not* do: it does not create a ticket. Tickets live in
 * ClickUp, and a ticket invented in this application would be a ticket nobody
 * is working. What gets written is the decision, which is then worked off the
 * queue on the sessions page.
 */
export async function promotePainPointAction(input: {
  sessionId: string;
  slug: string;
  department: DepartmentKey;
  painPointId: string;
  target: PromotionTarget;
  title: string;
  rationale: string;
  projectId: string | null;
}) {
  const { sessionId, slug, department, painPointId, ...promotion } = input;
  await store.promotePainPoint(sessionId, department, painPointId, promotion);
  refresh(slug);
}

export async function linkPromotionAction(input: {
  sessionId: string;
  slug: string;
  promotionId: string;
  externalRef: string;
}) {
  await store.linkPromotion(input.sessionId, input.promotionId, input.externalRef);
  refresh(input.slug);
}

export async function addFollowUpAction(input: {
  sessionId: string;
  slug: string;
  question: string;
  answer: string;
}) {
  await store.addFollowUp(input.sessionId, input.question, input.answer);
  refresh(input.slug);
}

export async function removeFollowUpAction(input: {
  sessionId: string;
  slug: string;
  followUpId: string;
}) {
  await store.removeFollowUp(input.sessionId, input.followUpId);
  refresh(input.slug);
}

export async function addDepartmentAction(input: {
  sessionId: string;
  slug: string;
  department: DepartmentKey;
  respondentId: string;
}) {
  await store.addDepartment(input.sessionId, input.department, input.respondentId);
  refresh(input.slug);
}

/* -------------------------------------------------------------------------- */
/* Transcript analysis                                                        */
/* -------------------------------------------------------------------------- */

export async function saveTranscriptAction(input: {
  sessionId: string;
  slug: string;
  transcript: string;
}) {
  await store.setTranscript(input.sessionId, input.transcript);
  refresh(input.slug);
}

/**
 * Reads the transcript and records what it proposes.
 *
 * Returns a result object rather than throwing, because every realistic failure
 * here — no credentials, an empty transcript, a decline, a long transcript that
 * times out — is something the reviewer needs to read on the page, and a thrown
 * error inside a transition surfaces as a blank screen.
 */
export async function analyzeTranscriptAction(input: {
  sessionId: string;
  slug: string;
}): Promise<{ ok: true; proposalCount: number; unanswered: number } | { ok: false; error: string }> {
  try {
    const [session, snapshot] = await Promise.all([
      store.getSession(input.sessionId),
      getWorkspaceSnapshot(),
    ]);

    if (!session) return { ok: false, error: "That session no longer exists." };
    if (!session.transcript.trim()) {
      return { ok: false, error: "Paste the meeting notes or transcript first." };
    }
    if (session.responses.length === 0) {
      return {
        ok: false,
        error: "Add at least one department to the session before analysing.",
      };
    }

    const { analysis, model } = await analyseTranscript(session, snapshot.users);
    const proposals = toStoredProposals(analysis, session, new Date().toISOString());

    await store.recordProposals(input.sessionId, proposals, model);
    refresh(input.slug);

    return {
      ok: true,
      proposalCount: proposals.length,
      unanswered: analysis.unanswered.length,
    };
  } catch (err) {
    if (err instanceof MissingCredentialsError) return { ok: false, error: err.message };
    return {
      ok: false,
      error: err instanceof Error ? err.message : "The analysis failed.",
    };
  }
}

/** Applies a whole review — approvals, rejections and any edits — in one write. */
export async function decideProposalsAction(input: {
  sessionId: string;
  slug: string;
  decisions: Array<{ proposalId: string; approved: boolean; finalText: string }>;
}) {
  await store.decideProposals(input.sessionId, input.decisions);
  refresh(input.slug);
}
