import { z } from "zod";
import { entityId, isoDateTime, type Tone } from "./common";
import { departmentKeySchema, type DepartmentKey } from "./user";

/**
 * Discovery sessions — the loop this department learns from.
 *
 * Every two weeks the leadership team sits down with Technology. The meeting is
 * part demo of what was built since last time and part interview about how the
 * business actually runs. This module describes what that meeting *is*.
 *
 * Three properties are load-bearing:
 *
 *   - **The question set is canonical and versioned.** Cycle 6 has to be
 *     comparable to cycle 1, which it is not if the questions drift. Answers
 *     carry the `templateVersion` they were given under, so a later revision
 *     never silently rewrites history.
 *   - **A session is the meeting, not the department.** One meeting produces
 *     answers from several department heads at once. Modelling it the other way
 *     would mean inventing five meetings that never happened.
 *   - **Nothing here auto-creates work.** A pain point becomes a promotion —
 *     an explicit, recorded decision to turn it into a ticket or a project.
 *     See `SessionPromotion`.
 */

/* -------------------------------------------------------------------------- */
/* The question template                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Bumped only when the canonical set below changes.
 *
 * Existing sessions keep the version they were recorded under. A comparison
 * across cycles that spans a version change is still possible — the question
 * ids are stable — but the reader is told the wording moved.
 */
export const QUESTION_TEMPLATE_VERSION = 1;

export const QUESTION_AXIS_ORDER = ["data", "workload", "capacity", "outcomes"] as const;

export const questionAxisSchema = z.enum(QUESTION_AXIS_ORDER);
export type QuestionAxis = z.infer<typeof questionAxisSchema>;

export const QUESTION_AXIS_META: Record<
  QuestionAxis,
  { label: string; tone: Tone; description: string }
> = {
  data: {
    label: "Data & Decisions",
    tone: "info",
    description: "What they look at, and what they do because of it.",
  },
  workload: {
    label: "Workload",
    tone: "warning",
    description: "What drives the volume up, and what takes it down.",
  },
  capacity: {
    label: "Capacity",
    tone: "brand",
    description: "How much headroom exists — theirs, and their team's.",
  },
  outcomes: {
    label: "Outcomes",
    tone: "success",
    description: "Whether the people doing the work are winning.",
  },
};

export const DISCOVERY_QUESTION_ORDER = [
  "data-use",
  "decisions",
  "more-work",
  "less-work",
  "capacity",
  "own-capacity",
  "team-capacity",
  "success",
] as const;

export const discoveryQuestionIdSchema = z.enum(DISCOVERY_QUESTION_ORDER);
export type DiscoveryQuestionId = z.infer<typeof discoveryQuestionIdSchema>;

export type DiscoveryQuestion = {
  id: DiscoveryQuestionId;
  axis: QuestionAxis;
  /** Asked in the room, in the words it is actually asked in. */
  prompt: string;
  /** Why this question is on the list, for whoever runs the session next. */
  why: string;
  /** What a useful answer sounds like, as opposed to a polite one. */
  listenFor: string;
};

/**
 * The eight. Locked on purpose.
 *
 * A session may add its own follow-ups — see `Session.followUps` — but these
 * are asked every cycle, of every department, so the answers stack up into
 * something that can be read down a column.
 */
export const DISCOVERY_QUESTIONS: Record<DiscoveryQuestionId, DiscoveryQuestion> = {
  "data-use": {
    id: "data-use",
    axis: "data",
    prompt: "How do you use your data?",
    why: "Separates the reports that are load-bearing from the ones that are decoration. A scorecard nobody opens is not a scorecard.",
    listenFor:
      "The report they open first thing. The number they quote in meetings. Anything they rebuild by hand because the real one is wrong.",
  },
  decisions: {
    id: "decisions",
    axis: "data",
    prompt: "How do you make decisions?",
    why: "The decision is the thing a portal has to serve. Build for the decision, not for the data.",
    listenFor:
      "Whether the decision is actually made on the number, or on a gut read that the number gets used to justify afterwards.",
  },
  "more-work": {
    id: "more-work",
    axis: "workload",
    prompt: "What makes you have more work?",
    why: "Names the volume drivers. Most of them turn out to be somebody else's process rather than their own.",
    listenFor:
      "Rework, chasing, entering the same thing twice, and anything that arrives as a Slack message instead of a record.",
  },
  "less-work": {
    id: "less-work",
    axis: "workload",
    prompt: "What makes you have less work?",
    why: "The inverse is not obvious, and is usually more actionable — it is a list of things that already worked.",
    listenFor:
      "Automation they already lean on, a handoff that goes well, a week that was quiet and the reason it was.",
  },
  capacity: {
    id: "capacity",
    axis: "capacity",
    prompt: "Where is your capacity?",
    why: "Capacity is rarely a single number. It sits somewhere specific — a person, a day of the week, a season.",
    listenFor:
      "The bottleneck turning out to be one named person. Mondays. Month-end. The task only one person can do.",
  },
  "own-capacity": {
    id: "own-capacity",
    axis: "capacity",
    prompt: "Are you able to take on more work?",
    why: "Asked of the head, about themselves. The honest answer sets what the department can absorb this cycle.",
    listenFor: "A yes that arrives with conditions. The conditions are the requirement.",
  },
  "team-capacity": {
    id: "team-capacity",
    axis: "capacity",
    prompt: "Are other people able to take on more work?",
    why: "Managers routinely read their team's capacity differently from how the team reads it. The gap is the finding.",
    listenFor:
      "Whether they can answer per person or only in aggregate. Not being able to answer is itself the answer.",
  },
  success: {
    id: "success",
    axis: "outcomes",
    prompt: "Are people being successful?",
    why: "The question a scorecard exists to answer. If it cannot be answered without one, that is the brief.",
    listenFor: "How they know. If the answer is “I can tell”, the measure does not exist yet.",
  },
};

export const DISCOVERY_QUESTION_LIST: DiscoveryQuestion[] = DISCOVERY_QUESTION_ORDER.map(
  (id) => DISCOVERY_QUESTIONS[id],
);

/* -------------------------------------------------------------------------- */
/* The loop                                                                   */
/* -------------------------------------------------------------------------- */

export const LOOP_STAGE_ORDER = [
  "discovery",
  "gather",
  "analyze",
  "build",
  "demo",
  "feedback",
] as const;

export const loopStageSchema = z.enum(LOOP_STAGE_ORDER);
export type LoopStage = z.infer<typeof loopStageSchema>;

export const LOOP_STAGE_META: Record<
  LoopStage,
  { label: string; tone: Tone; owner: string; description: string; icon: string }
> = {
  discovery: {
    label: "Discovery",
    tone: "info",
    owner: "The room",
    description: "Ask the eight. Capture the resources they name and the pain they describe.",
    icon: "MessagesSquare",
  },
  gather: {
    label: "Gather",
    tone: "neutral",
    owner: "Tech",
    description:
      "Go and get the data they named. The step that needs access rather than opinions.",
    icon: "Download",
  },
  analyze: {
    label: "Analyze",
    tone: "accent",
    owner: "Tech",
    description:
      "Turn what they said and what the data says into pain points worth building against.",
    icon: "Microscope",
  },
  build: {
    label: "Build",
    tone: "brand",
    owner: "Tech",
    description: "Build the portal or the scorecard. One cycle's worth, not the whole idea.",
    icon: "Hammer",
  },
  demo: {
    label: "Demo",
    tone: "warning",
    owner: "The room",
    description:
      "Show it back at the next session. The demo is how you find out cheaply that you built the wrong thing.",
    icon: "MonitorPlay",
  },
  feedback: {
    label: "Feedback",
    tone: "success",
    owner: "The room",
    description:
      "What changed, what is still wrong, what is newly possible. Feeds the next discovery.",
    icon: "RefreshCw",
  },
};

/** The stage after this one. The loop closes: feedback leads back to discovery. */
export function nextLoopStage(stage: LoopStage): LoopStage {
  const i = LOOP_STAGE_ORDER.indexOf(stage);
  return LOOP_STAGE_ORDER[(i + 1) % LOOP_STAGE_ORDER.length];
}

/* -------------------------------------------------------------------------- */
/* Resources — where they go                                                  */
/* -------------------------------------------------------------------------- */

export const RESOURCE_KIND_ORDER = [
  "report",
  "spreadsheet",
  "system",
  "manual",
  "person",
] as const;

export const resourceKindSchema = z.enum(RESOURCE_KIND_ORDER);
export type ResourceKind = z.infer<typeof resourceKindSchema>;

export const RESOURCE_KIND_META: Record<
  ResourceKind,
  { label: string; tone: Tone; icon: string }
> = {
  report: { label: "Report", tone: "info", icon: "ChartNoAxesColumn" },
  spreadsheet: { label: "Spreadsheet", tone: "success", icon: "Sheet" },
  system: { label: "System", tone: "brand", icon: "Server" },
  manual: { label: "Manual step", tone: "warning", icon: "PencilLine" },
  person: { label: "A person", tone: "critical", icon: "UserRound" },
};

/**
 * One thing a department goes to in order to see or do their work.
 *
 * Recorded from the department's side — what they log into, which report they
 * open, how they see the number — which doubles as the access list Technology
 * needs before it can go and pull the same data itself.
 *
 * `kind: "person"` is deliberately available and deliberately tinted critical.
 * When the answer to "where do you get that" is somebody's name, that is a
 * single point of failure, written down as one.
 */
export const sessionResourceSchema = z.object({
  id: entityId,
  kind: resourceKindSchema,
  name: z.string(),
  /** Where it physically is: a URL, a Drive path, a report name. */
  location: z.string(),
  /** Links to the systems catalogue when it is a system Tech already knows. */
  systemId: entityId.nullable(),
  /** How often they go there. Free text — "every morning" is a real answer. */
  frequency: z.string(),
  /** Whether Tech can read this itself yet. The gather stage's blocker list. */
  techHasAccess: z.boolean(),
  notes: z.string(),
});
export type SessionResource = z.infer<typeof sessionResourceSchema>;

/* -------------------------------------------------------------------------- */
/* Pain points                                                                */
/* -------------------------------------------------------------------------- */

export const PAIN_SEVERITY_ORDER = ["blocking", "costly", "friction"] as const;
export const painSeveritySchema = z.enum(PAIN_SEVERITY_ORDER);
export type PainSeverity = z.infer<typeof painSeveritySchema>;

export const PAIN_SEVERITY_META: Record<
  PainSeverity,
  { label: string; tone: Tone; description: string }
> = {
  blocking: {
    label: "Blocking",
    tone: "critical",
    description: "Work stops, or gets done wrong.",
  },
  costly: {
    label: "Costly",
    tone: "warning",
    description: "Work gets done, at a cost in hours or in accuracy.",
  },
  friction: {
    label: "Friction",
    tone: "neutral",
    description: "Annoying. Worth fixing while something else is already open.",
  },
};

export const painPointSchema = z.object({
  id: entityId,
  /** In their words where possible. A paraphrase loses the useful part. */
  statement: z.string(),
  severity: painSeveritySchema,
  /** Which of the eight surfaced it, when it came from one. */
  questionId: discoveryQuestionIdSchema.nullable(),
  /** Tech's read, added during the analyze stage rather than in the room. */
  analysis: z.string(),
  /** Set once this has been promoted. See SessionPromotion. */
  promotionId: entityId.nullable(),
});
export type PainPoint = z.infer<typeof painPointSchema>;

/* -------------------------------------------------------------------------- */
/* Promotions — a pain point becoming work                                    */
/* -------------------------------------------------------------------------- */

export const PROMOTION_TARGET_ORDER = ["ticket", "project"] as const;
export const promotionTargetSchema = z.enum(PROMOTION_TARGET_ORDER);
export type PromotionTarget = z.infer<typeof promotionTargetSchema>;

export const PROMOTION_TARGET_META: Record<
  PromotionTarget,
  { label: string; tone: Tone; description: string }
> = {
  ticket: {
    label: "Ticket",
    tone: "info",
    description: "A discrete fix. Belongs in the department's ClickUp list.",
  },
  project: {
    label: "Project",
    tone: "brand",
    description: "A build with a goal and a roadmap slot.",
  },
};

/**
 * The record of deciding a pain point is worth building against.
 *
 * Nothing is created automatically. Promotion is an explicit act, and what it
 * writes is a durable *intent* rather than a ticket: tickets genuinely live in
 * ClickUp, and one invented inside this application would be fiction. The
 * queue of unpushed promotions is what you work from when you go and create
 * them for real.
 */
export const sessionPromotionSchema = z.object({
  id: entityId,
  painPointId: entityId,
  target: promotionTargetSchema,
  title: z.string(),
  rationale: z.string(),
  department: departmentKeySchema,
  createdAt: isoDateTime,
  /**
   * Filled in once the ticket or project exists somewhere real — a ClickUp
   * task id, usually. Null means it is still queued.
   */
  externalRef: z.string().nullable(),
  /** Links to a project already on the roadmap, when it joins an existing one. */
  projectId: entityId.nullable(),
});
export type SessionPromotion = z.infer<typeof sessionPromotionSchema>;

/* -------------------------------------------------------------------------- */
/* A department's answers                                                     */
/* -------------------------------------------------------------------------- */

export const questionAnswerSchema = z.object({
  questionId: discoveryQuestionIdSchema,
  /** Empty means not asked or not answered — both are worth being able to see. */
  answer: z.string(),
});
export type QuestionAnswer = z.infer<typeof questionAnswerSchema>;

export const departmentResponseSchema = z.object({
  department: departmentKeySchema,
  /** Who answered. Usually the department head; may be a manager or a user. */
  respondentId: entityId,
  answers: z.array(questionAnswerSchema),
  resources: z.array(sessionResourceSchema),
  painPoints: z.array(painPointSchema),
});
export type DepartmentResponse = z.infer<typeof departmentResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Proposals — what an analysis suggests, before anybody agrees to it         */
/* -------------------------------------------------------------------------- */

export const PROPOSAL_KIND_ORDER = ["answer", "pain_point", "resource"] as const;
export const proposalKindSchema = z.enum(PROPOSAL_KIND_ORDER);
export type ProposalKind = z.infer<typeof proposalKindSchema>;

export const PROPOSAL_KIND_META: Record<
  ProposalKind,
  { label: string; tone: Tone; description: string }
> = {
  answer: {
    label: "Answer",
    tone: "info",
    description: "Fills in, or rewrites, one of the eight.",
  },
  pain_point: {
    label: "Pain point",
    tone: "warning",
    description: "Something that sounded like it hurts.",
  },
  resource: {
    label: "Resource",
    tone: "success",
    description: "A report, system or spreadsheet they named.",
  },
};

export const PROPOSAL_STATUS_ORDER = ["pending", "approved", "rejected"] as const;
export const proposalStatusSchema = z.enum(PROPOSAL_STATUS_ORDER);
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

export const proposalConfidenceSchema = z.enum(["high", "medium", "low"]);
export type ProposalConfidence = z.infer<typeof proposalConfidenceSchema>;

export const PROPOSAL_CONFIDENCE_META: Record<
  ProposalConfidence,
  { label: string; tone: Tone; meaning: string }
> = {
  high: {
    label: "High",
    tone: "success",
    meaning: "Said plainly, in as many words.",
  },
  medium: {
    label: "Medium",
    tone: "warning",
    meaning: "Clearly implied, but assembled from more than one place.",
  },
  low: {
    label: "Low",
    tone: "critical",
    meaning: "An inference. Read the evidence before accepting this one.",
  },
};

/**
 * One suggested change, waiting on a human.
 *
 * Nothing here is applied until it is approved — the same rule as promotions,
 * for a stronger reason: this is a machine reading of what people said about
 * their own jobs, and that reading is going to feed a scorecard.
 *
 * Two fields carry the weight:
 *
 *   - `evidence` is the passage of the transcript the proposal rests on, and
 *     it is required. A proposal that cannot quote the meeting is an invention,
 *     and displaying the quote next to the suggestion is what makes approving
 *     it a decision rather than a rubber stamp.
 *   - `currentText` is captured at proposal time so the review shows a true
 *     before-and-after. Reading it live would show a diff against whatever the
 *     field says at render, which is not what was analysed.
 */
export const sessionProposalSchema = z.object({
  id: entityId,
  kind: proposalKindSchema,
  department: departmentKeySchema,
  status: proposalStatusSchema,
  confidence: proposalConfidenceSchema,
  /** Quoted from the transcript. Required — see above. */
  evidence: z.string(),
  /** Why this reading, where the passage needed interpreting. */
  reasoning: z.string(),

  /** `answer` proposals: which of the eight, and the before/after. */
  questionId: discoveryQuestionIdSchema.nullable(),
  currentText: z.string(),
  proposedText: z.string(),

  /** `pain_point` proposals. */
  severity: painSeveritySchema.nullable(),

  /** `resource` proposals. */
  resourceKind: resourceKindSchema.nullable(),
  location: z.string(),
  frequency: z.string(),

  createdAt: isoDateTime,
});
export type SessionProposal = z.infer<typeof sessionProposalSchema>;

/** Whether an answer proposal overwrites something or fills a blank. */
export function isOverwrite(proposal: SessionProposal): boolean {
  return proposal.kind === "answer" && proposal.currentText.trim().length > 0;
}

export function pendingProposals(session: Session): SessionProposal[] {
  return session.proposals.filter((p) => p.status === "pending");
}

/* -------------------------------------------------------------------------- */
/* The session                                                                */
/* -------------------------------------------------------------------------- */

export const SESSION_KIND_ORDER = ["discovery", "demo", "both"] as const;
export const sessionKindSchema = z.enum(SESSION_KIND_ORDER);
export type SessionKind = z.infer<typeof sessionKindSchema>;

export const SESSION_KIND_META: Record<
  SessionKind,
  { label: string; tone: Tone; description: string }
> = {
  discovery: {
    label: "Discovery",
    tone: "info",
    description: "Questions only. Nothing shown.",
  },
  demo: {
    label: "Demo",
    tone: "warning",
    description: "Showing what was built. No new questions.",
  },
  both: {
    label: "Demo + Discovery",
    tone: "brand",
    description: "Show what was built, then ask the eight. The normal shape.",
  },
};

export const sessionSchema = z.object({
  id: entityId,
  slug: z.string(),
  /** Increments by one each meeting. The loop's odometer. */
  cycle: z.number().int().positive(),
  title: z.string(),
  kind: sessionKindSchema,
  /** The day the meeting happened, or is scheduled for. */
  heldAt: isoDateTime,
  /** Where this cycle currently sits in the loop. */
  stage: loopStageSchema,
  facilitatorId: entityId,
  attendeeIds: z.array(entityId),
  /** What was shown, if anything. Free text — "the CAM scorecard draft". */
  demoedWhat: z.string(),
  responses: z.array(departmentResponseSchema),
  /** Follow-ups asked in this session only, on top of the canonical eight. */
  followUps: z.array(
    z.object({ id: entityId, question: z.string(), answer: z.string() }),
  ),
  promotions: z.array(sessionPromotionSchema),
  /**
   * The meeting notes or transcript, pasted in.
   *
   * Kept verbatim and kept forever. It is the evidence behind every proposal
   * that came out of it, and a summary that cannot be checked against the
   * original is worth much less six cycles later.
   */
  transcript: z.string().default(""),
  /** Suggestions drawn from the transcript, each awaiting a yes or a no. */
  proposals: z.array(sessionProposalSchema).default([]),
  /**
   * When the transcript was last analysed, and by which model.
   *
   * These three carry defaults so that session files written before transcripts
   * existed still parse, and pick the fields up the next time they are saved.
   * A log that has to be migrated by hand is a log people stop writing to.
   */
  lastAnalysis: z
    .object({ at: isoDateTime, model: z.string(), proposalCount: z.number().int() })
    .nullable()
    .default(null),
  /** The write-up the departments can read. Written for them, not about them. */
  summary: z.string(),
  /**
   * Tech's own read. Never rendered in any shared or portal view — see
   * `toSharedSession`. It exists so that the summary does not have to be
   * diplomatic and honest at the same time.
   */
  privateAnalysis: z.string(),
  /** Which version of the eight this session's answers were given under. */
  templateVersion: z.number().int().positive(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
export type Session = z.infer<typeof sessionSchema>;

/* -------------------------------------------------------------------------- */
/* Redaction                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * What a department is allowed to read of a session they sat in.
 *
 * The same discipline as `toPortalTicket`: a projection, not a filter applied
 * on the way out. `privateAnalysis` is absent from the type, so no component
 * can render it by accident, and each pain point's `analysis` is dropped for
 * the same reason — the statement is theirs, the read of it is not.
 *
 * `transcript` and `proposals` are absent too. The transcript is a verbatim
 * record of everyone in the room, including the half-sentences and the things
 * said about other departments; publishing it back would change what people
 * are willing to say in the next session. Proposals are unreviewed machine
 * drafts, which is the last thing that should reach the people they describe.
 */
export type SharedSession = Omit<
  Session,
  "privateAnalysis" | "responses" | "transcript" | "proposals" | "lastAnalysis"
> & {
  responses: Array<
    Omit<DepartmentResponse, "painPoints"> & {
      painPoints: Array<Omit<PainPoint, "analysis">>;
    }
  >;
};

/**
 * Built field by field rather than by spreading and deleting.
 *
 * A projection written as an omission quietly leaks the next field somebody
 * adds to `Session`; one written as a list does not compile until that field is
 * considered. The verbosity is the safety.
 */
export function toSharedSession(session: Session): SharedSession {
  return {
    id: session.id,
    slug: session.slug,
    cycle: session.cycle,
    title: session.title,
    kind: session.kind,
    heldAt: session.heldAt,
    stage: session.stage,
    facilitatorId: session.facilitatorId,
    attendeeIds: session.attendeeIds,
    demoedWhat: session.demoedWhat,
    summary: session.summary,
    followUps: session.followUps,
    promotions: session.promotions,
    templateVersion: session.templateVersion,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    responses: session.responses.map((response) => ({
      department: response.department,
      respondentId: response.respondentId,
      answers: response.answers,
      resources: response.resources,
      painPoints: response.painPoints.map((pain) => ({
        id: pain.id,
        statement: pain.statement,
        severity: pain.severity,
        questionId: pain.questionId,
        promotionId: pain.promotionId,
      })),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Derivations                                                                */
/* -------------------------------------------------------------------------- */

/** Every pain point across every department in a session. */
export function allPainPoints(
  session: Session,
): Array<PainPoint & { department: DepartmentKey }> {
  return session.responses.flatMap((r) =>
    r.painPoints.map((p) => ({ ...p, department: r.department })),
  );
}

/** Every resource across every department in a session. */
export function allResources(
  session: Session,
): Array<SessionResource & { department: DepartmentKey }> {
  return session.responses.flatMap((r) =>
    r.resources.map((res) => ({ ...res, department: r.department })),
  );
}

/**
 * Promotions not yet turned into anything real.
 *
 * This is the working queue between a session and ClickUp, and the reason a
 * promotion records a decision rather than fabricating a ticket.
 */
export function pendingPromotions(session: Session): SessionPromotion[] {
  return session.promotions.filter((p) => p.externalRef === null);
}

/**
 * Resources Tech cannot yet read for itself.
 *
 * The gather stage's blocker list: until these are open, the analyze stage is
 * running on what people said rather than on what the data says.
 */
export function blockedResources(
  session: Session,
): Array<SessionResource & { department: DepartmentKey }> {
  return allResources(session).filter((r) => !r.techHasAccess);
}

/** How completely a department answered. Blank answers count as unanswered. */
export function responseCompleteness(response: DepartmentResponse): {
  answered: number;
  total: number;
} {
  const answered = response.answers.filter((a) => a.answer.trim().length > 0).length;
  return { answered, total: DISCOVERY_QUESTION_ORDER.length };
}

/**
 * One question read down the cycles for one department.
 *
 * This is the point of locking the template: it makes "capacity has been the
 * answer three cycles running" something you can see rather than remember.
 */
export function answerHistory(
  sessions: Session[],
  department: DepartmentKey,
  questionId: DiscoveryQuestionId,
): Array<{ cycle: number; heldAt: string; answer: string; templateVersion: number }> {
  return sessions
    .map((s) => {
      const response = s.responses.find((r) => r.department === department);
      const answer = response?.answers.find((a) => a.questionId === questionId);
      if (!answer || !answer.answer.trim()) return null;
      return {
        cycle: s.cycle,
        heldAt: s.heldAt,
        answer: answer.answer,
        templateVersion: s.templateVersion,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.cycle - b.cycle);
}

/** Departments that have ever answered, in the order they first appeared. */
export function departmentsCovered(sessions: Session[]): DepartmentKey[] {
  const seen: DepartmentKey[] = [];
  for (const s of [...sessions].sort((a, b) => a.cycle - b.cycle)) {
    for (const r of s.responses) if (!seen.includes(r.department)) seen.push(r.department);
  }
  return seen;
}
