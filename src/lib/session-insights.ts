import {
  DISCOVERY_QUESTION_ORDER,
  LOOP_STAGE_ORDER,
  allPainPoints,
  allResources,
  type DepartmentKey,
  type DiscoveryQuestionId,
  type LoopStage,
  type PainPoint,
  type PainSeverity,
  type Session,
  type SessionPromotion,
  type SessionResource,
} from "@/domain";

/**
 * Cross-session derivations.
 *
 * Pure over an array of sessions, with no imports from the data layer, so the
 * same functions serve a server page and a client component. This is where the
 * value of a locked question set actually shows up: a single session is a set
 * of notes, and ten of them are a trend.
 */

/* -------------------------------------------------------------------------- */
/* The resource inventory                                                     */
/* -------------------------------------------------------------------------- */

export type InventoryEntry = {
  key: string;
  name: string;
  kind: SessionResource["kind"];
  department: DepartmentKey;
  location: string;
  systemId: string | null;
  frequency: string;
  techHasAccess: boolean;
  notes: string;
  /** Every cycle in which this was named, oldest first. */
  cycles: number[];
  /** The most recent mention, which is the one whose details are shown. */
  lastCycle: number;
};

function inventoryKey(department: DepartmentKey, name: string): string {
  return `${department}::${name.trim().toLowerCase()}`;
}

/**
 * Everything every department said they go to, deduplicated.
 *
 * A resource named in three consecutive cycles is the same resource, not three.
 * The newest mention wins on every field — if access was granted between cycles,
 * the inventory should say so — while `cycles` keeps the fact that it kept
 * coming up, which is the signal that it matters.
 */
export function resourceInventory(sessions: Session[]): InventoryEntry[] {
  const byKey = new Map<string, InventoryEntry>();

  for (const session of [...sessions].sort((a, b) => a.cycle - b.cycle)) {
    for (const resource of allResources(session)) {
      const key = inventoryKey(resource.department, resource.name);
      const existing = byKey.get(key);

      byKey.set(key, {
        key,
        name: resource.name,
        kind: resource.kind,
        department: resource.department,
        location: resource.location,
        systemId: resource.systemId,
        frequency: resource.frequency,
        techHasAccess: resource.techHasAccess,
        notes: resource.notes,
        cycles: [...(existing?.cycles ?? []), session.cycle],
        lastCycle: session.cycle,
      });
    }
  }

  return [...byKey.values()].sort(
    (a, b) =>
      Number(a.techHasAccess) - Number(b.techHasAccess) ||
      b.cycles.length - a.cycles.length ||
      a.name.localeCompare(b.name),
  );
}

/**
 * What still stands between the gather stage and the analyze stage.
 *
 * Until these open up, every conclusion in this loop rests on what somebody
 * said in a meeting rather than on what their data shows.
 */
export function accessBlockers(sessions: Session[]): InventoryEntry[] {
  return resourceInventory(sessions).filter((r) => !r.techHasAccess);
}

/* -------------------------------------------------------------------------- */
/* Pain                                                                       */
/* -------------------------------------------------------------------------- */

export type PainEntry = PainPoint & {
  department: DepartmentKey;
  cycle: number;
  sessionId: string;
  sessionSlug: string;
};

const SEVERITY_RANK: Record<PainSeverity, number> = {
  blocking: 0,
  costly: 1,
  friction: 2,
};

/** Every pain point ever recorded, worst and newest first. */
export function painBacklog(sessions: Session[]): PainEntry[] {
  return sessions
    .flatMap((session) =>
      allPainPoints(session).map((p) => ({
        ...p,
        cycle: session.cycle,
        sessionId: session.id,
        sessionSlug: session.slug,
      })),
    )
    .sort(
      (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.cycle - a.cycle,
    );
}

/** Pain points nobody has decided about yet. The analyze stage's inbox. */
export function unpromotedPain(sessions: Session[]): PainEntry[] {
  return painBacklog(sessions).filter((p) => p.promotionId === null);
}

/* -------------------------------------------------------------------------- */
/* Promotions                                                                 */
/* -------------------------------------------------------------------------- */

export type PromotionEntry = SessionPromotion & {
  cycle: number;
  sessionId: string;
  sessionSlug: string;
  /** The pain point it came from, so the queue can show the original words. */
  painStatement: string;
};

export function promotionQueue(sessions: Session[]): PromotionEntry[] {
  return sessions
    .flatMap((session) => {
      const pains = new Map(allPainPoints(session).map((p) => [p.id, p]));
      return session.promotions.map((promo) => ({
        ...promo,
        cycle: session.cycle,
        sessionId: session.id,
        sessionSlug: session.slug,
        painStatement: pains.get(promo.painPointId)?.statement ?? "",
      }));
    })
    .sort(
      (a, b) =>
        Number(a.externalRef !== null) - Number(b.externalRef !== null) || b.cycle - a.cycle,
    );
}

/* -------------------------------------------------------------------------- */
/* Coverage                                                                   */
/* -------------------------------------------------------------------------- */

export type DepartmentCoverage = {
  department: DepartmentKey;
  /** Cycles this department has answered in, oldest first. */
  cycles: number[];
  lastCycle: number;
  /** How many of the eight came back with something, in the latest cycle. */
  answered: number;
  painCount: number;
  resourceCount: number;
  /** Questions this department has never answered, across every cycle. */
  neverAnswered: DiscoveryQuestionId[];
};

/**
 * Who has been asked, and what has never been answered.
 *
 * `neverAnswered` is the one worth watching. A question that gets skipped every
 * cycle is either badly worded or genuinely uncomfortable, and both are
 * findings about the department rather than about the form.
 */
export function departmentCoverage(sessions: Session[]): DepartmentCoverage[] {
  const ordered = [...sessions].sort((a, b) => a.cycle - b.cycle);
  const byDept = new Map<DepartmentKey, DepartmentCoverage>();

  for (const session of ordered) {
    for (const response of session.responses) {
      const prior = byDept.get(response.department);
      const answered = response.answers.filter((a) => a.answer.trim().length > 0);

      byDept.set(response.department, {
        department: response.department,
        cycles: [...(prior?.cycles ?? []), session.cycle],
        lastCycle: session.cycle,
        answered: answered.length,
        painCount: (prior?.painCount ?? 0) + response.painPoints.length,
        resourceCount: response.resources.length,
        neverAnswered: [],
      });
    }
  }

  for (const [department, coverage] of byDept) {
    coverage.neverAnswered = DISCOVERY_QUESTION_ORDER.filter((questionId) =>
      ordered.every((session) => {
        const response = session.responses.find((r) => r.department === department);
        if (!response) return true;
        const answer = response.answers.find((a) => a.questionId === questionId);
        return !answer || answer.answer.trim().length === 0;
      }),
    );
  }

  return [...byDept.values()].sort((a, b) => b.lastCycle - a.lastCycle);
}

/* -------------------------------------------------------------------------- */
/* The loop itself                                                            */
/* -------------------------------------------------------------------------- */

export type LoopPosition = {
  stage: LoopStage;
  /** Sessions currently sitting at this stage. */
  sessions: Session[];
};

/** Where every open cycle currently sits. */
export function loopPositions(sessions: Session[]): LoopPosition[] {
  return LOOP_STAGE_ORDER.map((stage) => ({
    stage,
    sessions: sessions.filter((s) => s.stage === stage),
  }));
}

export type LoopSummary = {
  cycles: number;
  latestCycle: number | null;
  departments: number;
  painTotal: number;
  painUnpromoted: number;
  promotionsPending: number;
  resourcesKnown: number;
  resourcesBlocked: number;
};

export function loopSummary(sessions: Session[]): LoopSummary {
  const inventory = resourceInventory(sessions);
  const pain = painBacklog(sessions);

  return {
    cycles: sessions.length,
    latestCycle: sessions.length ? Math.max(...sessions.map((s) => s.cycle)) : null,
    departments: departmentCoverage(sessions).length,
    painTotal: pain.length,
    painUnpromoted: pain.filter((p) => p.promotionId === null).length,
    promotionsPending: promotionQueue(sessions).filter((p) => p.externalRef === null).length,
    resourcesKnown: inventory.length,
    resourcesBlocked: inventory.filter((r) => !r.techHasAccess).length,
  };
}
