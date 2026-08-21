import { z } from "zod";
import {
  addBusinessMinutes,
  businessMinutesBetween,
  BUSINESS_MINUTES_PER_DAY,
} from "./business-hours";
import type { Tone } from "./common";
import {
  TICKET_PRIORITY_ORDER,
  ticketPrioritySchema,
  type Ticket,
  type TicketPriority,
} from "./ticket";

/**
 * Service level targets.
 *
 * Durations are stored in business minutes, and every comparison against them
 * runs through the business-hours calculator. A target of "3 business days" is
 * therefore three actual working days — a ticket raised on Friday afternoon is
 * not reported as breaching on Monday morning because a weekend happened.
 *
 * `elapsed` is the only clock that matters for Critical, which is measured in
 * wall-clock minutes: when work has stopped, the fact that it is 6pm does not
 * make the outage less urgent.
 */
export const slaTargetSchema = z.object({
  priority: ticketPrioritySchema,
  firstResponseMinutes: z.number().positive(),
  resolutionMinutes: z.number().positive(),
  /**
   * Critical targets run against the wall clock; everything else runs against
   * working hours.
   */
  clock: z.enum(["elapsed", "business"]),
  /** Shown in Settings, phrased the way people say it out loud. */
  firstResponseLabel: z.string(),
  resolutionLabel: z.string(),
});
export type SLATarget = z.infer<typeof slaTargetSchema>;

export const slaConfigSchema = z.object({
  id: z.string(),
  businessHoursPerDay: z.number(),
  targets: z.record(ticketPrioritySchema, slaTargetSchema),
});
export type SLAConfig = z.infer<typeof slaConfigSchema>;

const HOUR = 60;
const BUSINESS_DAY = BUSINESS_MINUTES_PER_DAY;

export const DEFAULT_SLA_CONFIG: SLAConfig = {
  id: "default",
  businessHoursPerDay: BUSINESS_MINUTES_PER_DAY / 60,
  targets: {
    critical: {
      priority: "critical",
      firstResponseMinutes: 15,
      resolutionMinutes: 4 * HOUR,
      clock: "elapsed",
      firstResponseLabel: "15 minutes",
      resolutionLabel: "4 hours",
    },
    high: {
      priority: "high",
      firstResponseMinutes: 1 * HOUR,
      resolutionMinutes: 1 * BUSINESS_DAY,
      clock: "business",
      firstResponseLabel: "1 hour",
      resolutionLabel: "1 business day",
    },
    normal: {
      priority: "normal",
      firstResponseMinutes: 4 * HOUR,
      resolutionMinutes: 3 * BUSINESS_DAY,
      clock: "business",
      firstResponseLabel: "4 business hours",
      resolutionLabel: "3 business days",
    },
    low: {
      priority: "low",
      firstResponseMinutes: 1 * BUSINESS_DAY,
      resolutionMinutes: 5 * BUSINESS_DAY,
      clock: "business",
      firstResponseLabel: "1 business day",
      resolutionLabel: "5 business days",
    },
  },
};

export const SLA_STATES = ["met", "healthy", "risk", "breached"] as const;
export type SLAState = (typeof SLA_STATES)[number];

export const SLA_STATE_META: Record<
  SLAState,
  { label: string; tone: Tone; short: string }
> = {
  met: { label: "Met", tone: "success", short: "Met" },
  healthy: { label: "On track", tone: "success", short: "OK" },
  risk: { label: "At risk", tone: "warning", short: "Risk" },
  breached: { label: "Breached", tone: "critical", short: "Breached" },
};

export type SLAEvaluation = {
  state: SLAState;
  /** Working minutes left. Negative once past target. Null once resolved. */
  minutesRemaining: number | null;
  dueAt: string | null;
  target: SLATarget;
  /** True while first response is outstanding — the tighter of the two clocks. */
  awaitingFirstResponse: boolean;
};

export function slaTargetFor(
  priority: TicketPriority,
  config: SLAConfig = DEFAULT_SLA_CONFIG,
): SLATarget {
  return config.targets[priority] ?? DEFAULT_SLA_CONFIG.targets.normal!;
}

/** Minutes consumed between two instants, on whichever clock the target uses. */
export function minutesConsumed(target: SLATarget, from: Date, to: Date): number {
  return target.clock === "elapsed"
    ? Math.max(0, (to.getTime() - from.getTime()) / 60_000)
    : businessMinutesBetween(from, to);
}

/** The instant a target falls due, measured from when the ticket was raised. */
export function slaDeadline(target: SLATarget, from: Date, minutes: number): Date {
  return target.clock === "elapsed"
    ? new Date(from.getTime() + minutes * 60_000)
    : addBusinessMinutes(from, minutes);
}

/**
 * Evaluates a ticket against its target.
 *
 * A resolved ticket is never reported as breaching. It is judged once — on
 * whether it actually landed inside the target — and then it stops moving.
 * This is deliberate: a dashboard that keeps counting finished work as overdue
 * produces a number nobody can act on.
 */
export function evaluateSLA(
  ticket: Ticket,
  now: Date,
  config: SLAConfig = DEFAULT_SLA_CONFIG,
): SLAEvaluation {
  const target = slaTargetFor(ticket.priority, config);
  const created = new Date(ticket.createdAt);

  if (ticket.resolvedAt) {
    const consumed = minutesConsumed(target, created, new Date(ticket.resolvedAt));
    return {
      state: consumed <= target.resolutionMinutes ? "met" : "breached",
      minutesRemaining: null,
      dueAt: ticket.slaDueAt,
      target,
      awaitingFirstResponse: false,
    };
  }

  const awaitingFirstResponse = !ticket.firstResponseAt;
  const budget = awaitingFirstResponse
    ? target.firstResponseMinutes
    : target.resolutionMinutes;

  const consumed = minutesConsumed(target, created, now);
  const minutesRemaining = budget - consumed;

  // "At risk" covers the last fifth of the window, clamped at both ends: a
  // fifteen-minute response target should not spend its whole life in warning,
  // and a five-day target should not sit in warning for most of a day.
  const riskWindow = Math.min(Math.max(budget * 0.2, 5), 240);

  let state: SLAState;
  if (minutesRemaining < 0) state = "breached";
  else if (minutesRemaining <= riskWindow) state = "risk";
  else state = "healthy";

  return {
    state,
    minutesRemaining,
    dueAt: slaDeadline(target, created, budget).toISOString(),
    target,
    awaitingFirstResponse,
  };
}

export const SLA_PRIORITY_ORDER = TICKET_PRIORITY_ORDER;
