import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  DEPARTMENTS,
  DISCOVERY_QUESTION_LIST,
  DISCOVERY_QUESTION_ORDER,
  PAIN_SEVERITY_META,
  PAIN_SEVERITY_ORDER,
  RESOURCE_KIND_META,
  RESOURCE_KIND_ORDER,
  type Session,
  type SessionProposal,
  type User,
} from "@/domain";

/**
 * Reading a meeting transcript into proposed answers.
 *
 * The output is deliberately *proposals* rather than edits. What comes back is
 * one machine's reading of what people said about their own workload and their
 * own team's capacity, and those readings are going to end up in a scorecard.
 * A wrong answer accepted silently in cycle 2 is still wrong in cycle 9, and by
 * then nobody remembers it was never actually said.
 *
 * Three things make the review meaningful rather than ceremonial:
 *
 *   - **Every proposal must quote the transcript.** `evidence` is required by
 *     the schema and instructed in the prompt. A claim with no passage behind
 *     it is the exact failure mode this feature invites, and requiring the
 *     quote makes it visible in the review instead of invisible in the log.
 *   - **Silence is a valid finding.** The model is told to leave a question
 *     alone rather than construct an answer from adjacent material. A blank
 *     answer is information — it means the question was dodged or skipped.
 *   - **Overwrites are rarer than fills.** Existing answers are sent along, and
 *     the instruction is to propose replacing one only when the transcript
 *     genuinely says something better, not merely differently.
 */

/** The model that reads transcripts. Named here so the log can record it. */
export const ANALYSIS_MODEL = "claude-opus-5";

/* -------------------------------------------------------------------------- */
/* The shape asked for                                                        */
/* -------------------------------------------------------------------------- */

const answerProposal = z.object({
  kind: z.literal("answer"),
  department: z.string(),
  questionId: z.enum(DISCOVERY_QUESTION_ORDER),
  proposedText: z
    .string()
    .describe(
      "The answer, written in the respondent's own words as far as possible. Not a summary of the meeting — an answer to this question.",
    ),
  evidence: z
    .string()
    .describe("The passage of the transcript this rests on, quoted verbatim."),
  reasoning: z
    .string()
    .describe("Why this passage answers this question. One or two sentences."),
  confidence: z.enum(["high", "medium", "low"]),
});

const painProposal = z.object({
  kind: z.literal("pain_point"),
  department: z.string(),
  statement: z
    .string()
    .describe("What hurts, in their words where possible rather than paraphrased."),
  severity: z.enum(PAIN_SEVERITY_ORDER),
  questionId: z.enum(DISCOVERY_QUESTION_ORDER).nullable(),
  evidence: z.string().describe("The passage this rests on, quoted verbatim."),
  reasoning: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

const resourceProposal = z.object({
  kind: z.literal("resource"),
  department: z.string(),
  name: z.string().describe("What the thing is called, e.g. 'SDR scorecard'."),
  resourceKind: z.enum(RESOURCE_KIND_ORDER),
  location: z
    .string()
    .describe("Where it lives, if said — a system, a report name, a path. Empty if not said."),
  frequency: z
    .string()
    .describe("How often they go there, if said. Empty if not said."),
  evidence: z.string().describe("The passage this rests on, quoted verbatim."),
  reasoning: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

const analysisSchema = z.object({
  proposals: z.array(z.union([answerProposal, painProposal, resourceProposal])),
  /** What the transcript did not cover. Surfaced to the reviewer as a gap list. */
  unanswered: z
    .array(
      z.object({
        department: z.string(),
        questionId: z.enum(DISCOVERY_QUESTION_ORDER),
        note: z
          .string()
          .describe("Why nothing was proposed — not discussed, deflected, or too vague."),
      }),
    )
    .describe(
      "Questions the transcript genuinely does not answer. Being explicit here is preferred over a low-confidence guess.",
    ),
});

export type TranscriptAnalysis = z.infer<typeof analysisSchema>;

/* -------------------------------------------------------------------------- */
/* Prompt                                                                     */
/* -------------------------------------------------------------------------- */

const SYSTEM = `You read transcripts of a recurring meeting between the Technology department at Kind Home Solutions and the company's leadership team, and you propose entries for the department's discovery log.

Everything you produce is a proposal that a person reviews one by one before anything is saved. Your job is to be useful and to be checkable — never to be complete for its own sake.

Rules, in order of importance:

1. Every proposal must quote the transcript in "evidence", verbatim, and the quote must actually support the proposal. If you cannot quote it, do not propose it.
2. If the transcript does not answer one of the eight questions for a department, say so in "unanswered" rather than assembling an answer out of nearby material. A question nobody answered is a real and useful finding. Silence is never a reason to lower quality by guessing.
3. Attribute to the right department. The transcript has several department heads in one room. If a statement's speaker or subject is ambiguous, either attribute it to the department it is clearly about, or leave it out and note it in "unanswered".
4. Write answers in the speaker's own words wherever you can. A paraphrase loses the detail that makes an answer worth having — "I rebuild the roster by hand every Monday" is worth more than "manual data entry is required".
5. Confidence means what it says. "high" = stated plainly in as many words. "medium" = clearly implied, or assembled from more than one passage. "low" = an inference you would not defend strongly. Do not inflate it.
6. Where a question already has an answer, propose replacing it only if the transcript says something genuinely better or newer. Do not propose rewording for its own sake.
7. Propose a pain point only when somebody describes something that costs them time, accuracy, or the ability to do their job — not for every complaint or aside.
8. Propose a resource when somebody names a specific place they go for information: a report, a spreadsheet, a system, a manual step, or a person they have to ask.

Do not invent numbers. Do not smooth over contradictions between speakers — if two people describe the same thing differently, that is worth a proposal with the disagreement noted in "reasoning".`;

function buildUserPrompt(session: Session, users: User[]): string {
  const userById = new Map(users.map((u) => [u.id, u]));

  const questionBlock = DISCOVERY_QUESTION_LIST.map(
    (q, i) =>
      `${i + 1}. [${q.id}] ${q.prompt}\n   Why it is asked: ${q.why}\n   Listen for: ${q.listenFor}`,
  ).join("\n\n");

  const departmentBlock = session.responses
    .map((r) => {
      const respondent = userById.get(r.respondentId);
      const answers = r.answers
        .map((a) => {
          const q = DISCOVERY_QUESTION_LIST.find((x) => x.id === a.questionId);
          const current = a.answer.trim();
          return `  - [${a.questionId}] ${q?.prompt ?? ""}\n    Currently: ${
            current ? current : "(blank)"
          }`;
        })
        .join("\n");

      const known = r.resources.length
        ? r.resources.map((res) => `  - ${res.name} (${res.location || "no location given"})`).join("\n")
        : "  (none recorded yet)";

      return `Department key: ${r.department} — ${DEPARTMENTS[r.department].name}
Answering for them: ${respondent ? `${respondent.name}, ${respondent.title}` : "unknown"}
Existing answers:
${answers}
Resources already recorded:
${known}`;
    })
    .join("\n\n");

  const severities = PAIN_SEVERITY_ORDER.map(
    (s) => `${s} = ${PAIN_SEVERITY_META[s].description}`,
  ).join("; ");

  const resourceKinds = RESOURCE_KIND_ORDER.map(
    (k) => `${k} = ${RESOURCE_KIND_META[k].label}`,
  ).join("; ");

  return `# The eight questions

${questionBlock}

# Departments in this session

Use these exact department keys in every proposal. Do not propose anything for a department that is not listed here.

${departmentBlock}

# Vocabulary

Pain severity: ${severities}
Resource kinds: ${resourceKinds}

# Session context

Cycle ${session.cycle}, held ${session.heldAt.slice(0, 10)}.
${session.demoedWhat ? `What was demoed first: ${session.demoedWhat}` : "Nothing was demoed."}

# Transcript

<transcript>
${session.transcript}
</transcript>

Read the transcript and produce proposals. Quote your evidence. Where the transcript does not answer a question for a department, list it under "unanswered" instead of guessing.`;
}

/* -------------------------------------------------------------------------- */
/* The call                                                                   */
/* -------------------------------------------------------------------------- */

export class MissingCredentialsError extends Error {
  constructor() {
    super(
      "No Anthropic credentials. Set ANTHROPIC_API_KEY in .env.local (see .env.example) and restart the dev server.",
    );
    this.name = "MissingCredentialsError";
  }
}

/**
 * Reads the session's transcript and returns proposals, unsaved.
 *
 * Streaming is used because transcripts run long and a large `max_tokens` on a
 * non-streaming request risks an HTTP timeout; `finalMessage()` gives back the
 * whole thing once it lands.
 */
export async function analyseTranscript(
  session: Session,
  users: User[],
): Promise<{ analysis: TranscriptAnalysis; model: string }> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new MissingCredentialsError();
  }

  const client = new Anthropic();

  const stream = client.messages.stream({
    model: ANALYSIS_MODEL,
    max_tokens: 64000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [{ role: "user", content: buildUserPrompt(session, users) }],
    output_config: { format: zodOutputFormat(analysisSchema) },
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error(
      `The analysis was declined${
        message.stop_details && "explanation" in message.stop_details
          ? `: ${message.stop_details.explanation}`
          : "."
      }`,
    );
  }

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const parsed = analysisSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error(
      `The analysis did not match the expected shape: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }

  return { analysis: parsed.data, model: ANALYSIS_MODEL };
}

/* -------------------------------------------------------------------------- */
/* Mapping onto the stored shape                                              */
/* -------------------------------------------------------------------------- */

/**
 * Turns the model's output into stored proposals.
 *
 * Proposals naming a department that is not on the session are dropped rather
 * than coerced onto the nearest one — the prompt forbids it, and silently
 * reassigning a misattributed statement is exactly the error that would be
 * hardest to notice in review.
 */
export function toStoredProposals(
  analysis: TranscriptAnalysis,
  session: Session,
  now: string,
): SessionProposal[] {
  const valid = new Set(session.responses.map((r) => r.department));
  const out: SessionProposal[] = [];

  analysis.proposals.forEach((raw, i) => {
    if (!valid.has(raw.department as SessionProposal["department"])) return;

    const department = raw.department as SessionProposal["department"];
    const base = {
      id: `prop-${now.replace(/\D/g, "").slice(-10)}-${i}`,
      department,
      status: "pending" as const,
      confidence: raw.confidence,
      evidence: raw.evidence,
      reasoning: raw.reasoning,
      createdAt: now,
    };

    if (raw.kind === "answer") {
      const response = session.responses.find((r) => r.department === department);
      const current =
        response?.answers.find((a) => a.questionId === raw.questionId)?.answer ?? "";

      out.push({
        ...base,
        kind: "answer",
        questionId: raw.questionId,
        currentText: current,
        proposedText: raw.proposedText,
        severity: null,
        resourceKind: null,
        location: "",
        frequency: "",
      });
      return;
    }

    if (raw.kind === "pain_point") {
      out.push({
        ...base,
        kind: "pain_point",
        questionId: raw.questionId,
        currentText: "",
        proposedText: raw.statement,
        severity: raw.severity,
        resourceKind: null,
        location: "",
        frequency: "",
      });
      return;
    }

    out.push({
      ...base,
      kind: "resource",
      questionId: null,
      currentText: "",
      proposedText: raw.name,
      severity: null,
      resourceKind: raw.resourceKind,
      location: raw.location,
      frequency: raw.frequency,
    });
  });

  return out;
}
