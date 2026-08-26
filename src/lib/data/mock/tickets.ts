import type { Ticket, TicketActivity, TicketComment } from "@/domain";
import { importTickets } from "@/lib/data/import/clickup";
import { importSlackIntake } from "@/lib/data/import/slack";
import { reconcile } from "@/lib/data/import/reconcile";
import { CLICKUP_IT_TICKETS } from "./imported/clickup-it-tickets";
import { SLACK_INTAKE } from "./imported/slack-intake";
import { DATASET_NOW } from "./now";

/**
 * Tickets, reconciled from both places the same requests live.
 *
 *   Slack intake   ─┐
 *                   ├─→ reconcile() ─→ linkSystems() ─→ MOCK_TICKETS
 *   ClickUp copies ─┘
 *
 * A Zapier automation copies every Slack intake message into ClickUp, so
 * importing both without reconciling would double the department's ticket
 * count. They are joined on the Slack message timestamp, which the automation
 * writes into ClickUp's `due_date` field — an exact key, not a fuzzy match.
 *
 * Slack wins on who asked and what for; ClickUp supplies whether it was ever
 * done. See import/reconcile.ts for why it is a merge rather than a choice.
 */

/* -------------------------------------------------------------------------- */
/* System linking                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Neither source records a relationship between a ticket and a system, so the
 * link is inferred from what the request actually talks about.
 *
 * This is the step that turns a list of tickets into a graph — it is what lets
 * a system page say "four open tickets" and the map show where pressure is
 * building. It is keyword matching and it will be imperfect; the alternative is
 * asking somebody to hand-classify several hundred tickets.
 */
const SYSTEM_PATTERNS: [string, RegExp][] = [
  ["sys-bart", /\bbart\b|crew sheet|crew pay|elevation|3\.[23]\b|copy of bar\b|measure(ment)?s?\b/i],
  ["sys-salesforce", /salesforce|\bsf\b|opportunit|\blead\b|\bopp\b|record type|closed won|picklist|\bj-\d/i],
  ["sys-spotio", /spotio|\bifc\b|ifcs|canvass|field rep|bluesheet|blue sheet/i],
  ["sys-zapier", /\bzap(s|ping|ier)?\b|automation/i],
  ["sys-jotform", /jotform|jot form|\bcrf\b|ww error form/i],
  ["sys-pandadoc", /pandadoc|panda doc|\bpd\b|proposal/i],
  ["sys-apptoto", /apptoto/i],
  ["sys-companycam", /company ?cam|\bcc\b (link|media|calendar)/i],
  ["sys-aircall", /aircall/i],
  ["sys-birdeye", /birdeye|birdseye|\bnps\b|review (request|link|score)/i],
  ["sys-looker", /looker|scorecard/i],
  ["sys-fabric", /fabric|lakehouse|\belt\b|silver stage|bronze/i],
  ["sys-power-bi", /power ?bi/i],
  ["sys-google-workspace", /calendar|google|drive|gmail|\bemail\b|passkey|log ?in/i],
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

    const combined = Array.from(new Set([...ticket.relatedSystemIds, ...matched])).slice(
      0,
      3,
    );

    return combined.length > 0 ? { ...ticket, relatedSystemIds: combined } : ticket;
  });
}

/* -------------------------------------------------------------------------- */
/* Build                                                                      */
/* -------------------------------------------------------------------------- */

const fromClickUp = importTickets(CLICKUP_IT_TICKETS, { now: DATASET_NOW });
const fromSlack = importSlackIntake(SLACK_INTAKE);

const reconciled = reconcile(
  fromSlack.tickets,
  fromClickUp.tickets,
  CLICKUP_IT_TICKETS,
  { ticketNumberStart: 1000 },
);

export const MOCK_TICKETS: Ticket[] = linkSystems(reconciled.tickets);

/**
 * What the import could not determine, and how much duplication it removed.
 * Surfaced on Settings → Data rather than swallowed: every gap is something a
 * source system never captured, which is the argument for moving intake here.
 */
export const TICKET_IMPORT_REPORT = {
  clickUp: fromClickUp.stats,
  warnings: fromClickUp.warnings,
  unknownSlackSubmitters: fromSlack.unknownSubmitters,
  reconciliation: reconciled.stats,
};

/**
 * Conversation is not imported yet.
 *
 * The replies exist — they are threads on the Slack intake messages, and the
 * capture records how many each has. Pulling them is a separate API call per
 * thread and was not part of this pass. The ClickUp copies have no conversation
 * at all, which is another thing that side loses.
 */
export const MOCK_TICKET_COMMENTS: TicketComment[] = [];
export const MOCK_TICKET_ACTIVITY: TicketActivity[] = [];
