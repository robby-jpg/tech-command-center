import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  DISCOVERY_QUESTION_ORDER,
  QUESTION_TEMPLATE_VERSION,
  sessionSchema,
  type DepartmentKey,
  type LoopStage,
  type PainPoint,
  type Session,
  type SessionKind,
  type SessionPromotion,
  type SessionProposal,
  type SessionResource,
} from "@/domain";

/**
 * Where discovery sessions live.
 *
 * Deliberately *not* in the workspace snapshot, and deliberately not in the
 * client store. Both of those are wiped: `WorkspaceProvider` drops its
 * localStorage overlay whenever `DATASET_NOW` moves, and the scheduled
 * `refresh-intake` run moves it most mornings. That is correct behaviour for a
 * mock dataset and completely wrong for a log the department is supposed to
 * accumulate over months.
 *
 * So a session is a file. One JSON document per meeting, in a directory that
 * git tracks, read server-side and written through server actions. Three
 * things follow from that:
 *
 *   - It survives every dataset refresh, because nothing refreshes it.
 *   - The history is `git log`. Who changed a write-up, and when, is already
 *     answered without building an audit trail.
 *   - Michael can read it without running the application.
 *
 * When Postgres arrives this becomes a table and this module becomes the
 * repository in front of it. Nothing above here changes: the callers only know
 * these functions.
 */

const SESSIONS_DIR = path.join(process.cwd(), "data", "sessions");

/* -------------------------------------------------------------------------- */
/* Reading                                                                    */
/* -------------------------------------------------------------------------- */

async function readDir(): Promise<string[]> {
  try {
    const entries = await fs.readdir(SESSIONS_DIR);
    return entries.filter((f) => f.endsWith(".json"));
  } catch (err) {
    // A missing directory means no sessions have been recorded yet, which is a
    // legitimate state on a fresh clone rather than a failure.
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

/**
 * Every session, newest cycle first.
 *
 * A file that fails validation is skipped with a warning rather than taking
 * the page down — one hand-edited document should not hide the other nine.
 */
export async function listSessions(): Promise<Session[]> {
  const files = await readDir();

  const parsed = await Promise.all(
    files.map(async (file) => {
      const raw = await fs.readFile(path.join(SESSIONS_DIR, file), "utf8");
      const result = sessionSchema.safeParse(JSON.parse(raw));
      if (!result.success) {
        console.warn(
          `[sessions] ${file} does not match the session schema and was skipped:`,
          result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        );
        return null;
      }
      return result.data;
    }),
  );

  return parsed
    .filter((s): s is Session => s !== null)
    .sort((a, b) => b.cycle - a.cycle);
}

export async function getSession(idOrSlug: string): Promise<Session | null> {
  const all = await listSessions();
  return all.find((s) => s.id === idOrSlug || s.slug === idOrSlug) ?? null;
}

/** The cycle number the next session gets. */
export async function nextCycle(): Promise<number> {
  const all = await listSessions();
  return all.length === 0 ? 1 : Math.max(...all.map((s) => s.cycle)) + 1;
}

/* -------------------------------------------------------------------------- */
/* Writing                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Named so the cycle leads and the date disambiguates.
 *
 * Sorting the directory sorts the log, which matters more than it sounds like
 * it should — it is how this reads in a pull request.
 */
function fileNameFor(session: Session): string {
  const day = session.heldAt.slice(0, 10);
  return `cycle-${String(session.cycle).padStart(2, "0")}-${day}.json`;
}

async function writeSession(session: Session): Promise<void> {
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
  const validated = sessionSchema.parse(session);
  await fs.writeFile(
    path.join(SESSIONS_DIR, fileNameFor(validated)),
    // Trailing newline and two-space indent so a change to one answer shows up
    // as a one-line diff rather than a reformatted document.
    `${JSON.stringify(validated, null, 2)}\n`,
    "utf8",
  );
}

export type NewSessionInput = {
  title: string;
  kind: SessionKind;
  heldAt: string;
  facilitatorId: string;
  attendeeIds: string[];
  demoedWhat: string;
  departments: Array<{ department: DepartmentKey; respondentId: string }>;
};

/**
 * Opens a new cycle.
 *
 * Every named department starts with the full set of eight questions present
 * and blank. An unanswered question is a fact worth being able to see — it
 * means it was skipped, or dodged — and it cannot be seen if the row is simply
 * absent.
 */
export async function createSession(input: NewSessionInput): Promise<Session> {
  const cycle = await nextCycle();
  const now = new Date().toISOString();

  const session: Session = {
    id: `ses-${cycle}-${input.heldAt.slice(0, 10)}`,
    slug: `cycle-${cycle}`,
    cycle,
    title: input.title,
    kind: input.kind,
    heldAt: input.heldAt,
    stage: "discovery",
    facilitatorId: input.facilitatorId,
    attendeeIds: input.attendeeIds,
    demoedWhat: input.demoedWhat,
    responses: input.departments.map((d) => ({
      department: d.department,
      respondentId: d.respondentId,
      answers: DISCOVERY_QUESTION_ORDER.map((questionId) => ({ questionId, answer: "" })),
      resources: [],
      painPoints: [],
    })),
    followUps: [],
    promotions: [],
    transcript: "",
    proposals: [],
    lastAnalysis: null,
    summary: "",
    privateAnalysis: "",
    templateVersion: QUESTION_TEMPLATE_VERSION,
    createdAt: now,
    updatedAt: now,
  };

  await writeSession(session);
  return session;
}

/**
 * Applies a change and stamps `updatedAt`.
 *
 * Every mutation below funnels through here so that no caller can forget the
 * timestamp, and so there is exactly one place that writes to disk.
 */
async function mutate(
  sessionId: string,
  fn: (session: Session) => Session,
): Promise<Session> {
  const existing = await getSession(sessionId);
  if (!existing) throw new Error(`No session ${sessionId}.`);

  const next = { ...fn(existing), updatedAt: new Date().toISOString() };

  // A renamed file would leave the old one behind as a duplicate cycle.
  const oldName = fileNameFor(existing);
  const newName = fileNameFor(next);
  await writeSession(next);
  if (oldName !== newName) {
    await fs.rm(path.join(SESSIONS_DIR, oldName), { force: true });
  }

  return next;
}

export function updateAnswer(
  sessionId: string,
  department: DepartmentKey,
  questionId: Session["responses"][number]["answers"][number]["questionId"],
  answer: string,
): Promise<Session> {
  return mutate(sessionId, (s) => ({
    ...s,
    responses: s.responses.map((r) =>
      r.department !== department
        ? r
        : {
            ...r,
            answers: r.answers.map((a) => (a.questionId === questionId ? { ...a, answer } : a)),
          },
    ),
  }));
}

export function updateNarrative(
  sessionId: string,
  patch: Partial<Pick<Session, "summary" | "privateAnalysis" | "demoedWhat" | "stage" | "title">>,
): Promise<Session> {
  return mutate(sessionId, (s) => ({ ...s, ...patch }));
}

export function advanceStage(sessionId: string, stage: LoopStage): Promise<Session> {
  return mutate(sessionId, (s) => ({ ...s, stage }));
}

export function addResource(
  sessionId: string,
  department: DepartmentKey,
  resource: Omit<SessionResource, "id">,
): Promise<Session> {
  const id = `res-${Date.now().toString(36)}`;
  return mutate(sessionId, (s) => ({
    ...s,
    responses: s.responses.map((r) =>
      r.department !== department ? r : { ...r, resources: [...r.resources, { ...resource, id }] },
    ),
  }));
}

export function removeResource(
  sessionId: string,
  department: DepartmentKey,
  resourceId: string,
): Promise<Session> {
  return mutate(sessionId, (s) => ({
    ...s,
    responses: s.responses.map((r) =>
      r.department !== department
        ? r
        : { ...r, resources: r.resources.filter((x) => x.id !== resourceId) },
    ),
  }));
}

export function addPainPoint(
  sessionId: string,
  department: DepartmentKey,
  pain: Omit<PainPoint, "id" | "promotionId">,
): Promise<Session> {
  const id = `pain-${Date.now().toString(36)}`;
  return mutate(sessionId, (s) => ({
    ...s,
    responses: s.responses.map((r) =>
      r.department !== department
        ? r
        : { ...r, painPoints: [...r.painPoints, { ...pain, id, promotionId: null }] },
    ),
  }));
}

export function updatePainPoint(
  sessionId: string,
  department: DepartmentKey,
  painPointId: string,
  patch: Partial<Pick<PainPoint, "statement" | "severity" | "analysis">>,
): Promise<Session> {
  return mutate(sessionId, (s) => ({
    ...s,
    responses: s.responses.map((r) =>
      r.department !== department
        ? r
        : {
            ...r,
            painPoints: r.painPoints.map((p) => (p.id === painPointId ? { ...p, ...patch } : p)),
          },
    ),
  }));
}

export function removePainPoint(
  sessionId: string,
  department: DepartmentKey,
  painPointId: string,
): Promise<Session> {
  return mutate(sessionId, (s) => ({
    ...s,
    responses: s.responses.map((r) =>
      r.department !== department
        ? r
        : { ...r, painPoints: r.painPoints.filter((p) => p.id !== painPointId) },
    ),
    // A promotion without its pain point is an orphan; drop it with the parent.
    promotions: s.promotions.filter((p) => p.painPointId !== painPointId),
  }));
}

/**
 * Records the decision to turn a pain point into work.
 *
 * This creates a promotion, not a ticket. See `SessionPromotion` for why —
 * briefly, tickets live in ClickUp, so one manufactured here would be fiction.
 * The promotion is the durable intent; `externalRef` is filled in once the
 * real thing exists.
 */
export function promotePainPoint(
  sessionId: string,
  department: DepartmentKey,
  painPointId: string,
  input: Pick<SessionPromotion, "target" | "title" | "rationale" | "projectId">,
): Promise<Session> {
  const id = `promo-${Date.now().toString(36)}`;
  return mutate(sessionId, (s) => ({
    ...s,
    responses: s.responses.map((r) =>
      r.department !== department
        ? r
        : {
            ...r,
            painPoints: r.painPoints.map((p) =>
              p.id === painPointId ? { ...p, promotionId: id } : p,
            ),
          },
    ),
    promotions: [
      ...s.promotions,
      {
        id,
        painPointId,
        department,
        target: input.target,
        title: input.title,
        rationale: input.rationale,
        projectId: input.projectId,
        externalRef: null,
        createdAt: new Date().toISOString(),
      },
    ],
  }));
}

/** Marks a promotion as having been created for real, somewhere real. */
export function linkPromotion(
  sessionId: string,
  promotionId: string,
  externalRef: string,
): Promise<Session> {
  return mutate(sessionId, (s) => ({
    ...s,
    promotions: s.promotions.map((p) =>
      p.id === promotionId ? { ...p, externalRef: externalRef.trim() || null } : p,
    ),
  }));
}

export function addFollowUp(
  sessionId: string,
  question: string,
  answer: string,
): Promise<Session> {
  const id = `fu-${Date.now().toString(36)}`;
  return mutate(sessionId, (s) => ({
    ...s,
    followUps: [...s.followUps, { id, question, answer }],
  }));
}

export function removeFollowUp(sessionId: string, followUpId: string): Promise<Session> {
  return mutate(sessionId, (s) => ({
    ...s,
    followUps: s.followUps.filter((f) => f.id !== followUpId),
  }));
}

export function addDepartment(
  sessionId: string,
  department: DepartmentKey,
  respondentId: string,
): Promise<Session> {
  return mutate(sessionId, (s) =>
    s.responses.some((r) => r.department === department)
      ? s
      : {
          ...s,
          responses: [
            ...s.responses,
            {
              department,
              respondentId,
              answers: DISCOVERY_QUESTION_ORDER.map((questionId) => ({
                questionId,
                answer: "",
              })),
              resources: [],
              painPoints: [],
            },
          ],
        },
  );
}

/* -------------------------------------------------------------------------- */
/* Transcript and proposals                                                   */
/* -------------------------------------------------------------------------- */

export function setTranscript(sessionId: string, transcript: string): Promise<Session> {
  return mutate(sessionId, (s) => ({ ...s, transcript }));
}

/**
 * Records a fresh analysis.
 *
 * Pending proposals from an earlier run are discarded — they were drawn from a
 * transcript that has since changed, or from a reading being replaced. Anything
 * already approved or rejected is kept: those are decisions, and a decision to
 * reject a suggestion is worth as much as a decision to take one, not least
 * because it stops the same suggestion being re-litigated every cycle.
 */
export function recordProposals(
  sessionId: string,
  proposals: SessionProposal[],
  model: string,
): Promise<Session> {
  return mutate(sessionId, (s) => ({
    ...s,
    proposals: [...s.proposals.filter((p) => p.status !== "pending"), ...proposals],
    lastAnalysis: {
      at: new Date().toISOString(),
      model,
      proposalCount: proposals.length,
    },
  }));
}

export type ProposalDecision = {
  proposalId: string;
  approved: boolean;
  /** The text as the reviewer left it — edits before approval are expected. */
  finalText: string;
};

/**
 * Applies a whole review in one write.
 *
 * Deliberately batched. Each mutation here is a read-modify-write of a file, so
 * approving twenty proposals one at a time would be twenty rewrites and twenty
 * chances to interleave badly. A review is one decision made in one sitting;
 * it should land as one change, and read as one commit.
 */
export function decideProposals(
  sessionId: string,
  decisions: ProposalDecision[],
): Promise<Session> {
  const byId = new Map(decisions.map((d) => [d.proposalId, d]));

  return mutate(sessionId, (session) => {
    let responses = session.responses;
    const stamp = Date.now().toString(36);

    session.proposals.forEach((proposal, index) => {
      const decision = byId.get(proposal.id);
      if (!decision || !decision.approved || proposal.status !== "pending") return;

      const text = decision.finalText.trim();
      if (!text) return;

      responses = responses.map((response) => {
        if (response.department !== proposal.department) return response;

        if (proposal.kind === "answer" && proposal.questionId) {
          return {
            ...response,
            answers: response.answers.map((a) =>
              a.questionId === proposal.questionId ? { ...a, answer: text } : a,
            ),
          };
        }

        if (proposal.kind === "pain_point") {
          return {
            ...response,
            painPoints: [
              ...response.painPoints,
              {
                id: `pain-${stamp}-${index}`,
                statement: text,
                severity: proposal.severity ?? "costly",
                questionId: proposal.questionId,
                // Left blank on purpose: the analysis explains why the passage
                // was read this way, which is not the same thing as Tech's read
                // of what is going on underneath it. That stays a human field.
                analysis: "",
                promotionId: null,
              },
            ],
          };
        }

        return {
          ...response,
          resources: [
            ...response.resources,
            {
              id: `res-${stamp}-${index}`,
              kind: proposal.resourceKind ?? "report",
              name: text,
              location: proposal.location,
              systemId: null,
              frequency: proposal.frequency,
              techHasAccess: false,
              notes: "",
            },
          ],
        };
      });
    });

    return {
      ...session,
      responses,
      proposals: session.proposals.map((p) => {
        const decision = byId.get(p.id);
        if (!decision || p.status !== "pending") return p;
        return {
          ...p,
          status: decision.approved ? ("approved" as const) : ("rejected" as const),
          proposedText: decision.finalText,
        };
      }),
    };
  });
}
