import type { Ticket, TicketActivity, TicketComment } from "@/domain";
import { importTickets } from "@/lib/data/import/clickup";
import { CLICKUP_IT_TICKETS } from "./imported/clickup-it-tickets";
import { DATASET_NOW } from "./now";

/**
 * Tickets, imported from the real ClickUp IT Tickets folder.
 *
 * Nothing here is invented. The full pipeline is:
 *
 *   ClickUp capture  →  importTickets()  →  linkSystems()  →  MOCK_TICKETS
 *
 * When the ClickUp API is connected the first step becomes a live fetch and
 * the rest is unchanged.
 */

/* -------------------------------------------------------------------------- */
/* System linking                                                             */
/* -------------------------------------------------------------------------- */

/**
 * ClickUp records no relationship between a ticket and a system, so the link
 * is inferred from what the request actually talks about.
 *
 * This is the step that turns a list of tickets into a graph — it is what makes
 * a system page able to say "four open tickets" and the map able to show where
 * pressure is building. It is keyword matching and it will be imperfect; the
 * alternative is asking somebody to hand-classify several hundred tickets.
 *
 * Ordered loosely by specificity so that a ticket mentioning both BART and
 * Salesforce is linked to both, which is usually the truth.
 */
const SYSTEM_PATTERNS: [string, RegExp][] = [
  ["sys-bart", /\bbart\b|crew sheet|crew pay|elevation|3\.[23]\b|copy of bar\b|measure(ment)?s?\b/i],
  ["sys-salesforce", /salesforce|\bsf\b|opportunit|\blead\b|\bopp\b|record type|closed won|picklist|\bj-\d/i],
  ["sys-spotio", /spotio|\bifc\b|ifcs|canvass|field rep|bluesheet|blue sheet/i],
  ["sys-zapier", /\bzap(s|ping|ier)?\b|automation/i],
  ["sys-jotform", /jotform|jot form|\bcrf\b|ww error form/i],
  ["sys-pandadoc", /pandadoc|panda doc|\bpd\b proposal|proposal/i],
  ["sys-apptoto", /apptoto/i],
  ["sys-companycam", /company ?cam|\bcc\b (link|media|calendar)/i],
  ["sys-aircall", /aircall/i],
  ["sys-birdeye", /birdeye|birdseye|\bnps\b|review (request|link|score)/i],
  ["sys-looker", /looker|scorecard/i],
  ["sys-fabric", /fabric|lakehouse|\belt\b|silver stage|bronze/i],
  ["sys-power-bi", /power ?bi/i],
  ["sys-google-workspace", /calendar|google|drive|gmail|\bemail\b|passkey|log ?in|access/i],
  ["sys-websites", /gravity form|\bkhp\b|website|landing page/i],
  ["sys-quickbooks", /quickbooks|\bqb\b invoice/i],
  ["sys-greensky", /greensky|green sky|monthly payment/i],
  ["sys-hubstaff", /hubstaff/i],
  ["sys-slack", /slack/i],
  ["sys-estimator-portal", /estimator portal|commission calc|pendings/i],
];

function linkSystems(tickets: Ticket[]): Ticket[] {
  return tickets.map((ticket) => {
    const haystack = `${ticket.title} ${ticket.description}`;
    const matched = SYSTEM_PATTERNS.filter(([, pattern]) => pattern.test(haystack))
      .map(([id]) => id)
      // Three is enough to be useful; beyond that the badges stop meaning much.
      .slice(0, 3);

    return matched.length > 0 ? { ...ticket, relatedSystemIds: matched } : ticket;
  });
}

/* -------------------------------------------------------------------------- */
/* Build                                                                      */
/* -------------------------------------------------------------------------- */

const imported = importTickets(CLICKUP_IT_TICKETS, {
  ticketNumberStart: 1000,
  now: DATASET_NOW,
});

export const MOCK_TICKETS: Ticket[] = linkSystems(imported.tickets);

/**
 * What the import could not determine. Surfaced on Settings → Data rather than
 * swallowed, because the gaps are the argument for moving intake into this
 * application: everything missing here is something ClickUp never captured.
 */
export const TICKET_IMPORT_REPORT = {
  warnings: imported.warnings,
  stats: imported.stats,
};

/**
 * Conversation is not imported.
 *
 * ClickUp holds comments on these tickets, but they are a separate API call per
 * task and were not part of this capture. Ticket detail therefore shows the
 * derived activity trail and an empty conversation, which is honest — and the
 * conversation people actually had happened in Slack, not in ClickUp.
 */
export const MOCK_TICKET_COMMENTS: TicketComment[] = [];
export const MOCK_TICKET_ACTIVITY: TicketActivity[] = [];
