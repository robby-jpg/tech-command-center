import {
  addBusinessMinutes,
  DEFAULT_SLA_CONFIG,
  slaDeadline,
  slaTargetFor,
  TICKET_CATEGORY_ORDER,
  type Ticket,
  type TicketActivity,
  type TicketComment,
} from "@/domain";
import { daysAgo, hoursAgo, minutesAgo, seededRandom } from "./now";
import { MOCK_USERS } from "./users";

/* -------------------------------------------------------------------------- */
/* Construction helper                                                        */
/* -------------------------------------------------------------------------- */

type TicketSeed = Partial<Ticket> &
  Pick<
    Ticket,
    "id" | "ticketNumber" | "title" | "status" | "priority" | "category" | "requesterId" | "createdAt"
  >;

/**
 * Fills in the long tail of a ticket so each literal below states only what is
 * interesting about it. `slaDueAt` is derived rather than typed by hand — the
 * target is a function of priority and creation time, so writing it out would
 * only be an opportunity to get it wrong.
 */
function build(seed: TicketSeed): Ticket {
  const requester = MOCK_USERS.find((u) => u.id === seed.requesterId);
  const target = slaTargetFor(seed.priority, DEFAULT_SLA_CONFIG);
  const slaDueAt = slaDeadline(
    target,
    new Date(seed.createdAt),
    target.resolutionMinutes,
  ).toISOString();

  return {
    description: "",
    requesterDepartment: requester?.department ?? "operations",
    assigneeId: null,
    updatedAt: seed.createdAt,
    firstResponseAt: null,
    resolvedAt: null,
    dueDate: null,
    slaDueAt,
    estimatedEffortHours: null,
    actualTimeSpentHours: null,
    businessImpact: "individual",
    urgency: "soon",
    source: "command_center",
    tags: [],
    relatedSystemIds: [],
    relatedProjectId: null,
    relatedTicketIds: [],
    relatedArticleIds: [],
    attachments: [],
    watcherIds: [],
    reopenCount: 0,
    ...seed,
  };
}

/* -------------------------------------------------------------------------- */
/* Open work — the 17 tickets the department currently owns                   */
/* -------------------------------------------------------------------------- */

const OPEN_TICKETS: Ticket[] = [
  build({
    id: "t-1094",
    ticketNumber: "KHT-1094",
    title: "Zapier → Salesforce automation failing on new leads",
    description:
      "The SalesRabbit lead push started erroring after Zapier rotated the Salesforce connector. Leads are being captured in SalesRabbit but never arrive in the CRM, so nobody is calling them. Twelve leads are sitting in the failed-task queue.",
    status: "new",
    priority: "critical",
    category: "zapier",
    requesterId: "u-danielle",
    assigneeId: "u-robby",
    createdAt: minutesAgo(18),
    updatedAt: minutesAgo(18),
    businessImpact: "department",
    urgency: "immediate",
    estimatedEffortHours: 2,
    tags: ["automation-failure", "lead-capture"],
    relatedSystemIds: ["sys-zapier", "sys-salesforce", "sys-salesrabbit"],
    relatedArticleIds: ["kb-zapier-standards"],
    watcherIds: ["u-michael", "u-danielle"],
  }),
  build({
    id: "t-1084",
    ticketNumber: "KHT-1084",
    title: "New Project Consultant needs Salesforce permissions",
    description:
      "Marisol starts Monday and needs the Estimator Read/Write permission set, the Sales role, and access to the Denver territory. Blocked on confirmation of which territory she is assigned to.",
    status: "triaged",
    priority: "high",
    category: "permissions",
    requesterId: "u-danielle",
    assigneeId: "u-alexis",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
    firstResponseAt: daysAgo(5),
    dueDate: daysAgo(2),
    businessImpact: "individual",
    urgency: "urgent",
    estimatedEffortHours: 1,
    actualTimeSpentHours: 0.5,
    tags: ["onboarding", "access"],
    relatedSystemIds: ["sys-salesforce", "sys-google-workspace"],
    relatedArticleIds: ["kb-salesforce-user-setup"],
  }),
  build({
    id: "t-1091",
    ticketNumber: "KHT-1091",
    title: "Power BI Sales Overview showing yesterday's numbers at 9am",
    description:
      "Sales managers open the Overview before the morning huddle and the figures are a day behind. Suspect this is downstream of the Fabric refresh running late rather than a Power BI problem.",
    status: "in_progress",
    priority: "high",
    category: "power_bi",
    requesterId: "u-danielle",
    assigneeId: "u-jonathan",
    // Raised late yesterday morning. By 09:12 today it has consumed 437 of its
    // 480 business-minute target, leaving the 43-minute window shown on the
    // Command Center.
    createdAt: minutesAgo(1397),
    updatedAt: minutesAgo(52),
    firstResponseAt: minutesAgo(1360),
    businessImpact: "department",
    urgency: "urgent",
    estimatedEffortHours: 3,
    actualTimeSpentHours: 1.5,
    tags: ["refresh", "stale-data"],
    relatedSystemIds: ["sys-power-bi", "sys-fabric"],
    relatedProjectId: "p-fabric-migration",
    relatedTicketIds: ["t-1089"],
    relatedArticleIds: ["kb-powerbi-refresh"],
    watcherIds: ["u-jonathan", "u-michael"],
  }),
  build({
    id: "t-1069",
    ticketNumber: "KHT-1069",
    title: "Fabric Employee model — waiting on architecture decision",
    description:
      "The Employee semantic model needs to decide whether a Project Consultant who changes territory mid-year is one row or two. Reporting cannot be finished until that is settled, and it changes how commission history reads.",
    status: "blocked",
    priority: "normal",
    category: "microsoft_fabric",
    requesterId: "u-jonathan",
    assigneeId: "u-jonathan",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(3),
    firstResponseAt: daysAgo(12),
    businessImpact: "department",
    urgency: "soon",
    estimatedEffortHours: 8,
    actualTimeSpentHours: 5,
    tags: ["architecture", "semantic-model", "needs-decision"],
    relatedSystemIds: ["sys-fabric"],
    relatedProjectId: "p-fabric-migration",
    relatedArticleIds: ["kb-fabric-architecture"],
    watcherIds: ["u-michael"],
  }),
  build({
    id: "t-1089",
    ticketNumber: "KHT-1089",
    title: "Fabric overnight refresh finishing 40–90 minutes late",
    description:
      "Since Tuesday the Employee model refresh has run long. Everything downstream is correct but stale first thing in the morning. Watching whether it is the new bronze-layer pipeline or contention with the Opportunity extract.",
    status: "in_progress",
    priority: "normal",
    category: "microsoft_fabric",
    requesterId: "u-jonathan",
    assigneeId: "u-jonathan",
    createdAt: daysAgo(3),
    updatedAt: hoursAgo(9),
    firstResponseAt: daysAgo(3),
    businessImpact: "department",
    urgency: "urgent",
    estimatedEffortHours: 4,
    actualTimeSpentHours: 2.5,
    tags: ["refresh", "performance"],
    relatedSystemIds: ["sys-fabric", "sys-power-bi"],
    relatedProjectId: "p-fabric-migration",
    relatedTicketIds: ["t-1091"],
  }),
  build({
    id: "t-1092",
    ticketNumber: "KHT-1092",
    title: "Salesforce passkey fails in the iOS app",
    description:
      "Passkey sign-in works in Safari on the same phone but the Salesforce mobile app falls back to a password prompt and then rejects it. Two consultants affected so far, both on iOS 18.",
    status: "in_progress",
    priority: "normal",
    category: "salesforce",
    requesterId: "u-crystal",
    assigneeId: "u-alexis",
    createdAt: daysAgo(1),
    updatedAt: hoursAgo(4),
    firstResponseAt: hoursAgo(20),
    businessImpact: "team",
    urgency: "urgent",
    estimatedEffortHours: 2,
    actualTimeSpentHours: 1,
    tags: ["mfa", "mobile", "passkey"],
    relatedSystemIds: ["sys-salesforce", "sys-google-workspace"],
    relatedArticleIds: ["kb-salesforce-mfa"],
    relatedTicketIds: ["t-1077"],
  }),
  build({
    id: "t-1093",
    ticketNumber: "KHT-1093",
    title: "Power BI estimate count showing duplicates for Apptoto bookings",
    description:
      "The booked-estimate tile is roughly triple what it should be. Apptoto emits an event per lifecycle stage — booked, confirmed, reminded — and the measure is counting all three.",
    status: "triaged",
    priority: "normal",
    category: "power_bi",
    requesterId: "u-tyler",
    assigneeId: "u-jonathan",
    createdAt: hoursAgo(30),
    updatedAt: hoursAgo(6),
    firstResponseAt: hoursAgo(26),
    businessImpact: "department",
    urgency: "soon",
    estimatedEffortHours: 3,
    tags: ["data-quality", "measure", "duplicates"],
    relatedSystemIds: ["sys-power-bi", "sys-apptoto", "sys-fabric"],
    relatedArticleIds: ["kb-powerbi-standards"],
  }),
  build({
    id: "t-1090",
    ticketNumber: "KHT-1090",
    title: "Website contact form not creating a Salesforce lead",
    description:
      "A customer called to ask why nobody had followed up. The form submission is in Framer's log and in the Zapier task history, but the Salesforce step silently skipped because the campaign field was empty.",
    status: "testing",
    priority: "high",
    category: "website",
    requesterId: "u-tyler",
    assigneeId: "u-robby",
    createdAt: daysAgo(2),
    updatedAt: hoursAgo(11),
    firstResponseAt: daysAgo(2),
    businessImpact: "department",
    urgency: "urgent",
    estimatedEffortHours: 2,
    actualTimeSpentHours: 1.75,
    tags: ["lead-capture", "forms"],
    relatedSystemIds: ["sys-websites", "sys-zapier", "sys-salesforce"],
    relatedArticleIds: ["kb-leads-into-salesforce"],
    watcherIds: ["u-tyler", "u-danielle"],
  }),
  build({
    id: "t-1087",
    ticketNumber: "KHT-1087",
    title: "BART pricing incorrect on multi-surface exteriors",
    description:
      "Square footage is being rounded per surface instead of per elevation, which overstates the total on houses with more than four surfaces. Fix is in, being verified against six recent bids.",
    status: "testing",
    priority: "high",
    category: "bart",
    requesterId: "u-crystal",
    assigneeId: "u-michael",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(1),
    firstResponseAt: daysAgo(4),
    businessImpact: "team",
    urgency: "urgent",
    estimatedEffortHours: 5,
    actualTimeSpentHours: 4.5,
    tags: ["pricing", "calculation"],
    relatedSystemIds: ["sys-bart", "sys-salesforce"],
    relatedProjectId: "p-bart-improvements",
    relatedArticleIds: ["kb-bart-overview"],
  }),
  build({
    id: "t-1086",
    ticketNumber: "KHT-1086",
    title: "PandaDoc signature date missing from Salesforce opportunity",
    description:
      "The signed-on date comes back from PandaDoc but is not landing on the opportunity, so won-date reporting is using the stage-change date instead. Affects roughly one in five signed proposals.",
    status: "in_progress",
    priority: "normal",
    category: "salesforce",
    requesterId: "u-sofia",
    assigneeId: "u-robby",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(2),
    firstResponseAt: daysAgo(6),
    businessImpact: "department",
    urgency: "soon",
    estimatedEffortHours: 4,
    actualTimeSpentHours: 2,
    tags: ["integration", "reporting"],
    relatedSystemIds: ["sys-pandadoc", "sys-salesforce"],
  }),
  build({
    id: "t-1085",
    ticketNumber: "KHT-1085",
    title: "Duplicate contacts created by the HubSpot sync",
    description:
      "When a customer fills in a web form with a different capitalisation of their email, HubSpot creates a second contact and pushes it across. Roughly forty duplicates in the last month.",
    status: "triaged",
    priority: "normal",
    category: "salesforce",
    requesterId: "u-nathan",
    assigneeId: "u-robby",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(4),
    firstResponseAt: daysAgo(8),
    businessImpact: "team",
    urgency: "soon",
    estimatedEffortHours: 6,
    tags: ["data-quality", "duplicates"],
    relatedSystemIds: ["sys-hubspot", "sys-salesforce"],
    relatedProjectId: "p-hubspot-sync",
  }),
  build({
    id: "t-1095",
    ticketNumber: "KHT-1095",
    title: "Aircall not logging calls against the right lead",
    description:
      "Calls from a number that appears on two records are attaching to whichever was created first, which is usually the wrong one. CX is losing call history on active jobs.",
    status: "new",
    priority: "normal",
    category: "salesforce",
    requesterId: "u-nathan",
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(3),
    businessImpact: "team",
    urgency: "soon",
    tags: ["telephony", "matching"],
    relatedSystemIds: ["sys-aircall", "sys-salesforce"],
  }),
  build({
    id: "t-1096",
    ticketNumber: "KHT-1096",
    title: "Production office needs a second monitor and dock",
    description:
      "Marcus has a new laptop with a single USB-C port and no dock. Needs a dock, a second monitor and a keyboard.",
    status: "new",
    priority: "low",
    category: "hardware",
    requesterId: "u-marcus",
    createdAt: hoursAgo(7),
    updatedAt: hoursAgo(7),
    businessImpact: "individual",
    urgency: "can_wait",
    estimatedEffortHours: 1,
    tags: ["hardware", "procurement"],
  }),
  build({
    id: "t-1083",
    ticketNumber: "KHT-1083",
    title: "Holiday Lights crew needs shared calendar access",
    description:
      "The install crew leads need read/write on the Holiday Lights install calendar before the season ramps. Waiting on Erin to confirm the final list of names.",
    status: "waiting_on_requester",
    priority: "normal",
    category: "accounts",
    requesterId: "u-erin",
    assigneeId: "u-alexis",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(6),
    firstResponseAt: daysAgo(9),
    businessImpact: "team",
    urgency: "soon",
    estimatedEffortHours: 1,
    tags: ["access", "calendar", "holiday-lights"],
    relatedSystemIds: ["sys-google-workspace"],
    relatedProjectId: "p-holiday-lights",
  }),
  build({
    id: "t-1082",
    ticketNumber: "KHT-1082",
    title: "QuickBooks export missing three won jobs from July",
    description:
      "The weekly manual export skipped three jobs that were won and then had their close date edited. Finance found them during reconciliation.",
    status: "waiting_on_requester",
    priority: "normal",
    category: "other",
    requesterId: "u-sofia",
    assigneeId: "u-robby",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(7),
    firstResponseAt: daysAgo(10),
    businessImpact: "team",
    urgency: "soon",
    estimatedEffortHours: 2,
    tags: ["finance", "reconciliation", "manual-process"],
    relatedSystemIds: ["sys-quickbooks", "sys-salesforce"],
  }),
  build({
    id: "t-1088",
    ticketNumber: "KHT-1088",
    title: "Power BI report needs a fiscal-period date selector",
    description:
      "Leadership wants to compare a fiscal period rather than a calendar month. Needs a date table with fiscal columns before the slicer can exist.",
    status: "triaged",
    priority: "low",
    category: "power_bi",
    requesterId: "u-dana",
    assigneeId: "u-jonathan",
    createdAt: daysAgo(14),
    updatedAt: daysAgo(11),
    firstResponseAt: daysAgo(13),
    businessImpact: "team",
    urgency: "can_wait",
    estimatedEffortHours: 6,
    tags: ["reporting", "enhancement"],
    relatedSystemIds: ["sys-power-bi", "sys-fabric"],
    relatedProjectId: "p-exec-reporting",
  }),
  build({
    id: "t-1081",
    ticketNumber: "KHT-1081",
    title: "SalesRabbit leads arriving without the unit number",
    description:
      "Address line 2 is captured in SalesRabbit but dropped in the mapping, so crews turn up at apartment buildings with no unit. Low volume but wastes a whole visit each time.",
    status: "testing",
    priority: "low",
    category: "zapier",
    requesterId: "u-danielle",
    assigneeId: "u-robby",
    createdAt: daysAgo(16),
    updatedAt: daysAgo(2),
    firstResponseAt: daysAgo(15),
    businessImpact: "team",
    urgency: "can_wait",
    estimatedEffortHours: 2,
    actualTimeSpentHours: 1.5,
    tags: ["data-quality", "field-mapping"],
    relatedSystemIds: ["sys-salesrabbit", "sys-zapier", "sys-salesforce"],
  }),
];

/* -------------------------------------------------------------------------- */
/* Recently resolved — what the department finished this week                 */
/* -------------------------------------------------------------------------- */

const RECENT_RESOLVED: Ticket[] = [
  build({
    id: "t-1080",
    ticketNumber: "KHT-1080",
    title: "Estimator portal signing consultants out mid-note",
    description:
      "Every deploy was silently ending sessions, and saving a note afterwards failed with a bare 'not signed in'. Sessions now live in Postgres and idle rather than expire absolutely.",
    status: "resolved",
    priority: "high",
    category: "other",
    requesterId: "u-crystal",
    assigneeId: "u-michael",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(2),
    firstResponseAt: hoursAgo(94),
    resolvedAt: daysAgo(2),
    businessImpact: "team",
    urgency: "urgent",
    estimatedEffortHours: 6,
    actualTimeSpentHours: 7,
    tags: ["sessions", "postgres", "data-loss"],
    relatedSystemIds: ["sys-estimator-portal"],
    watcherIds: ["u-robby"],
  }),
  build({
    id: "t-1079",
    ticketNumber: "KHT-1079",
    title: "Follow-up Contact Method not reaching Salesforce",
    description:
      "'How did you reach them?' was collected in the portal and then dropped. Now sent on the Task. Needs a Salesforce admin to create the custom field before the value lands anywhere.",
    status: "resolved",
    priority: "normal",
    category: "salesforce",
    requesterId: "u-danielle",
    assigneeId: "u-michael",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(2),
    firstResponseAt: hoursAgo(140),
    resolvedAt: daysAgo(2),
    businessImpact: "team",
    urgency: "soon",
    estimatedEffortHours: 3,
    actualTimeSpentHours: 3.5,
    tags: ["integration", "custom-field"],
    relatedSystemIds: ["sys-estimator-portal", "sys-salesforce"],
  }),
  build({
    id: "t-1078",
    ticketNumber: "KHT-1078",
    title: "Jotform warranty claims not routing to the CX queue",
    description:
      "A renamed field in the form broke the Zapier path. Claims were arriving in a fallback inbox nobody was watching. Six were sitting there.",
    status: "resolved",
    priority: "high",
    category: "zapier",
    requesterId: "u-nathan",
    assigneeId: "u-robby",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(7),
    firstResponseAt: hoursAgo(190),
    resolvedAt: daysAgo(7),
    businessImpact: "team",
    urgency: "urgent",
    estimatedEffortHours: 2,
    actualTimeSpentHours: 2.5,
    tags: ["automation-failure", "routing"],
    relatedSystemIds: ["sys-jotform", "sys-zapier", "sys-salesforce"],
  }),
  build({
    id: "t-1077",
    ticketNumber: "KHT-1077",
    title: "MFA reset for a new Project Consultant",
    description:
      "Phone replaced, authenticator lost. Reset the factor, re-enrolled with a passkey and walked through recovery codes.",
    status: "resolved",
    priority: "normal",
    category: "accounts",
    requesterId: "u-crystal",
    assigneeId: "u-alexis",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(9),
    firstResponseAt: hoursAgo(215),
    resolvedAt: hoursAgo(212),
    businessImpact: "individual",
    urgency: "urgent",
    estimatedEffortHours: 0.5,
    actualTimeSpentHours: 0.75,
    tags: ["mfa", "passkey", "access"],
    relatedSystemIds: ["sys-salesforce", "sys-google-workspace"],
    relatedArticleIds: ["kb-salesforce-mfa"],
  }),
  build({
    id: "t-1076",
    ticketNumber: "KHT-1076",
    title: "Offboarding: revoke access for a departed consultant",
    description:
      "Workspace suspended, Salesforce deactivated with records reassigned, SalesRabbit and CompanyCam removed, phone extension released.",
    status: "resolved",
    priority: "high",
    category: "permissions",
    requesterId: "u-priya",
    assigneeId: "u-alexis",
    createdAt: daysAgo(11),
    updatedAt: daysAgo(11),
    firstResponseAt: hoursAgo(262),
    resolvedAt: hoursAgo(259),
    businessImpact: "individual",
    urgency: "urgent",
    estimatedEffortHours: 1.5,
    actualTimeSpentHours: 1.25,
    tags: ["offboarding", "security", "access"],
    relatedSystemIds: ["sys-google-workspace", "sys-salesforce", "sys-companycam"],
    relatedArticleIds: ["kb-salesforce-user-setup"],
  }),
  build({
    id: "t-1075",
    ticketNumber: "KHT-1075",
    title: "Opportunity stage automation firing twice",
    description:
      "A flow and a legacy workflow rule were both reacting to the same stage change, sending customers two emails. Retired the workflow rule.",
    status: "resolved",
    priority: "normal",
    category: "salesforce",
    requesterId: "u-danielle",
    assigneeId: "u-robby",
    createdAt: daysAgo(13),
    updatedAt: daysAgo(12),
    firstResponseAt: hoursAgo(305),
    resolvedAt: daysAgo(12),
    businessImpact: "team",
    urgency: "urgent",
    estimatedEffortHours: 3,
    actualTimeSpentHours: 2.5,
    tags: ["automation", "customer-facing"],
    relatedSystemIds: ["sys-salesforce"],
  }),
  build({
    id: "t-1074",
    ticketNumber: "KHT-1074",
    title: "Laptop replacement for a Project Manager",
    description:
      "Battery would no longer hold a charge. Imaged a replacement, migrated the profile and collected the old machine for wipe.",
    status: "resolved",
    priority: "normal",
    category: "hardware",
    requesterId: "u-marcus",
    assigneeId: "u-alexis",
    createdAt: daysAgo(15),
    updatedAt: daysAgo(13),
    firstResponseAt: hoursAgo(350),
    resolvedAt: daysAgo(13),
    businessImpact: "individual",
    urgency: "soon",
    estimatedEffortHours: 3,
    actualTimeSpentHours: 4,
    tags: ["hardware", "replacement"],
  }),
  build({
    id: "t-1073",
    ticketNumber: "KHT-1073",
    title: "Row-level security so managers see only their own team",
    description:
      "Sales managers were seeing every consultant's numbers. Added a role-based RLS rule on the Employee model and tested with three accounts.",
    status: "resolved",
    priority: "normal",
    category: "power_bi",
    requesterId: "u-danielle",
    assigneeId: "u-jonathan",
    createdAt: daysAgo(18),
    updatedAt: daysAgo(16),
    firstResponseAt: hoursAgo(420),
    resolvedAt: daysAgo(16),
    businessImpact: "team",
    urgency: "soon",
    estimatedEffortHours: 5,
    actualTimeSpentHours: 6,
    tags: ["security", "reporting"],
    relatedSystemIds: ["sys-power-bi", "sys-fabric"],
    relatedArticleIds: ["kb-powerbi-standards"],
  }),
  build({
    id: "t-1072",
    ticketNumber: "KHT-1072",
    title: "CompanyCam photos not linking to the job record",
    description:
      "Projects created from the mobile app were not receiving the Salesforce id, so photos had nowhere to attach. Corrected the create step.",
    status: "resolved",
    priority: "normal",
    category: "other",
    requesterId: "u-marcus",
    assigneeId: "u-alexis",
    createdAt: daysAgo(21),
    updatedAt: daysAgo(20),
    firstResponseAt: hoursAgo(495),
    resolvedAt: daysAgo(20),
    businessImpact: "team",
    urgency: "soon",
    estimatedEffortHours: 3,
    actualTimeSpentHours: 3,
    tags: ["integration", "field"],
    relatedSystemIds: ["sys-companycam", "sys-salesforce"],
  }),
  build({
    id: "t-1071",
    ticketNumber: "KHT-1071",
    title: "Framer landing page fields not mapping to campaign",
    description:
      "Two new interior-painting pages posted without a campaign id, so their leads were attributed to Direct. Added the hidden field and backfilled 31 records.",
    status: "resolved",
    priority: "normal",
    category: "website",
    requesterId: "u-tyler",
    assigneeId: "u-robby",
    createdAt: daysAgo(24),
    updatedAt: daysAgo(23),
    firstResponseAt: hoursAgo(566),
    resolvedAt: daysAgo(23),
    businessImpact: "team",
    urgency: "soon",
    estimatedEffortHours: 2,
    actualTimeSpentHours: 2.25,
    tags: ["attribution", "forms"],
    relatedSystemIds: ["sys-websites", "sys-zapier", "sys-hubspot"],
  }),
  build({
    id: "t-1070",
    ticketNumber: "KHT-1070",
    title: "Shared drive permissions for the Holiday Lights team",
    description:
      "Created the shared drive, moved last season's material in, and granted the crew leads contributor access.",
    status: "resolved",
    priority: "low",
    category: "accounts",
    requesterId: "u-erin",
    assigneeId: "u-alexis",
    createdAt: daysAgo(27),
    updatedAt: daysAgo(25),
    firstResponseAt: hoursAgo(640),
    resolvedAt: daysAgo(25),
    businessImpact: "team",
    urgency: "can_wait",
    estimatedEffortHours: 1,
    actualTimeSpentHours: 1,
    tags: ["access", "holiday-lights"],
    relatedSystemIds: ["sys-google-workspace"],
    relatedProjectId: "p-holiday-lights",
  }),
];

/* -------------------------------------------------------------------------- */
/* Historical tail                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Ninety days of closed work, so the analytics charts have something honest to
 * draw. Titles come from a pool of real request shapes rather than a counter,
 * and the generator is seeded — the same dataset is produced on every render,
 * on every machine, which is what keeps server and client markup identical.
 */
const HISTORY_TITLES: { title: string; category: Ticket["category"]; systems: string[] }[] = [
  { title: "Password reset for a returning seasonal employee", category: "accounts", systems: ["sys-google-workspace"] },
  { title: "Salesforce list view not showing new territory", category: "salesforce", systems: ["sys-salesforce"] },
  { title: "Power BI report timing out on the 13-month page", category: "power_bi", systems: ["sys-power-bi"] },
  { title: "Zap failing on a renamed Jotform field", category: "zapier", systems: ["sys-zapier", "sys-jotform"] },
  { title: "New laptop setup for a Project Consultant", category: "hardware", systems: [] },
  { title: "Add a user to the Production shared drive", category: "accounts", systems: ["sys-google-workspace"] },
  { title: "Opportunity record type missing for Holiday Lights", category: "salesforce", systems: ["sys-salesforce"] },
  { title: "BART bid not saving on a slow connection", category: "bart", systems: ["sys-bart"] },
  { title: "Fabric pipeline retry after a transient auth failure", category: "microsoft_fabric", systems: ["sys-fabric"] },
  { title: "Website form spam filter blocking real submissions", category: "website", systems: ["sys-websites"] },
  { title: "Aircall extension reassignment", category: "other", systems: ["sys-aircall"] },
  { title: "PandaDoc template pricing table misaligned", category: "other", systems: ["sys-pandadoc"] },
  { title: "Permission set update for a promoted manager", category: "permissions", systems: ["sys-salesforce"] },
  { title: "Duplicate lead merge for a repeat customer", category: "salesforce", systems: ["sys-salesforce", "sys-hubspot"] },
  { title: "Monitor replacement in the Denver office", category: "hardware", systems: [] },
  { title: "Power BI workspace access for a new manager", category: "power_bi", systems: ["sys-power-bi"] },
  { title: "SalesRabbit territory boundary correction", category: "other", systems: ["sys-salesrabbit"] },
  { title: "CompanyCam project not appearing for the crew", category: "other", systems: ["sys-companycam"] },
  { title: "Calendar invite not reaching the customer", category: "other", systems: ["sys-apptoto", "sys-google-workspace"] },
  { title: "Estimator portal showing a stale commission batch", category: "other", systems: ["sys-estimator-portal"] },
];

const HISTORY_REQUESTERS = [
  "u-crystal",
  "u-danielle",
  "u-marcus",
  "u-priya",
  "u-tyler",
  "u-sofia",
  "u-nathan",
  "u-erin",
];
const HISTORY_ASSIGNEES = ["u-robby", "u-michael", "u-jonathan", "u-alexis"];
/**
 * Priority mix for generated history.
 *
 * Weighted rather than drawn from a flat list: Critical is reserved for genuine
 * operational impact, so it has to be rare. A uniform pool put it at roughly
 * one ticket in eight, which would mean the definition had drifted rather than
 * the world getting worse — exactly what the Analytics page warns about.
 */
function pickPriority(rand: () => number): Ticket["priority"] {
  const r = rand();
  if (r < 0.03) return "critical";
  if (r < 0.2) return "high";
  if (r < 0.8) return "normal";
  return "low";
}

/**
 * One closed ticket.
 *
 * Either `factor` (a fraction of the SLA budget, applied on the target's own
 * clock) or an explicit `resolvedHoursAgo` decides when it closed. The explicit
 * form exists because the long-running cohort below needs to control the
 * closing date directly rather than have it fall out of a ratio.
 */
function historicalTicket(
  rand: () => number,
  number: number,
  createdHoursAgo: number,
  opts: { factor?: number; resolvedHoursAgo?: number; priority?: Ticket["priority"] },
): Ticket {
  const seedItem = HISTORY_TITLES[Math.floor(rand() * HISTORY_TITLES.length)]!;
  const priority = opts.priority ?? pickPriority(rand);
  const requesterId = HISTORY_REQUESTERS[Math.floor(rand() * HISTORY_REQUESTERS.length)]!;
  const assigneeId = HISTORY_ASSIGNEES[Math.floor(rand() * HISTORY_ASSIGNEES.length)]!;

  const target = slaTargetFor(priority, DEFAULT_SLA_CONFIG);
  const createdAt = hoursAgo(createdHoursAgo);
  const created = new Date(createdAt);

  const consumed =
    opts.resolvedHoursAgo != null
      ? 0
      : Math.max(15, Math.round(target.resolutionMinutes * (opts.factor ?? 0.4)));

  const resolvedAt =
    opts.resolvedHoursAgo != null
      ? hoursAgo(opts.resolvedHoursAgo)
      : slaDeadline(target, created, consumed).toISOString();

  const firstResponseAt = addBusinessMinutes(
    created,
    Math.round(target.firstResponseMinutes * (0.15 + rand() * 0.6)),
  ).toISOString();

  return build({
    id: `t-h${number}`,
    ticketNumber: `KHT-${number}`,
    title: seedItem.title,
    description:
      "Closed. Retained for reporting; see the activity trail for what was done.",
    status: "resolved",
    priority,
    category: seedItem.category,
    requesterId,
    assigneeId,
    createdAt,
    updatedAt: resolvedAt,
    firstResponseAt,
    resolvedAt,
    actualTimeSpentHours:
      Math.round(
        ((consumed ||
          Math.max(
            30,
            (createdHoursAgo - (opts.resolvedHoursAgo ?? 0)) * 60 * 0.06,
          )) /
          60) *
          0.3 *
          4,
      ) / 4,
    relatedSystemIds: seedItem.systems,
    reopenCount: rand() < 0.035 ? 1 : 0,
    source: rand() < 0.25 ? "slack" : "command_center",
  });
}

function buildHistory(): Ticket[] {
  const rand = seededRandom(20260821);
  const out: Ticket[] = [];
  let number = 1000;

  // Two to four closures a weekday for ninety days, thinner at weekends.
  for (let dayOffset = 92; dayOffset >= 3; dayOffset--) {
    const weekday = (dayOffset + 4) % 7; // arbitrary but stable phase
    const isWeekend = weekday === 0 || weekday === 6;
    const count = isWeekend ? (rand() < 0.7 ? 0 : 1) : 2 + Math.floor(rand() * 3);

    for (let i = 0; i < count; i++) {
      // Most work closes well inside target. A small tail runs over, which is
      // what keeps attainment in the low nineties rather than a suspicious 100%.
      const factor = rand() < 0.03 ? 1.1 + rand() * 1.2 : 0.06 + rand() * 0.6;
      number += 1;
      out.push(
        historicalTicket(rand, number, dayOffset * 24 - Math.floor(rand() * 9), {
          factor,
        }),
      );
    }
  }

  /**
   * A cohort of low-priority work that sat for a week or two before being
   * closed in the last few days.
   *
   * This is what a real queue looks like, and without it the reconstructed
   * backlog from seven days ago is far smaller than today's — which made the
   * week-on-week figure on the Command Center read as a dramatic jump that
   * never happened. Roughly half of these run past their five-business-day
   * target, which is also what keeps SLA attainment honest rather than perfect.
   */
  for (let i = 0; i < 12; i++) {
    number += 1;
    const createdDaysAgo = 8 + Math.floor(rand() * 6);
    const resolvedDaysAgo = 1 + Math.floor(rand() * 4);
    out.push(
      historicalTicket(rand, number, createdDaysAgo * 24, {
        resolvedHoursAgo: resolvedDaysAgo * 24,
        priority: "low",
      }),
    );
  }

  return out;
}

export const MOCK_TICKETS: Ticket[] = [
  ...OPEN_TICKETS,
  ...RECENT_RESOLVED,
  ...buildHistory(),
];

/* -------------------------------------------------------------------------- */
/* Conversation                                                               */
/* -------------------------------------------------------------------------- */

export const MOCK_TICKET_COMMENTS: TicketComment[] = [
  {
    id: "c-1",
    ticketId: "t-1094",
    authorId: "u-danielle",
    body: "Flagging this straight away — the canvassing team submitted 12 leads this morning and none of them are in Salesforce. Reps are asking whether to re-enter them by hand.",
    createdAt: minutesAgo(16),
    internal: false,
    attachments: [],
  },
  {
    id: "c-2",
    ticketId: "t-1094",
    authorId: "u-robby",
    body: "Confirmed on the Zapier side. The Salesforce connector was re-authorised overnight and the new token is missing the Lead create scope. Nothing is lost — the 12 are held in the failed-task queue and will replay once the connection is fixed.\n\nPlease hold off on re-entering, we would end up with duplicates.",
    createdAt: minutesAgo(11),
    internal: false,
    attachments: [],
  },
  {
    id: "c-3",
    ticketId: "t-1094",
    authorId: "u-robby",
    body: "Same root cause is likely behind the Apptoto writeback failing. Checking whether both zaps share the connection before I re-auth, so we fix it once.",
    createdAt: minutesAgo(4),
    internal: true,
    attachments: [],
  },
  {
    id: "c-4",
    ticketId: "t-1091",
    authorId: "u-danielle",
    body: "Third morning in a row. The huddle is at 8:30 and the numbers on screen are yesterday's, which makes the whole meeting awkward.",
    createdAt: minutesAgo(430),
    internal: false,
    attachments: [],
  },
  {
    id: "c-5",
    ticketId: "t-1091",
    authorId: "u-jonathan",
    body: "This is downstream of KHT-1089 rather than a Power BI fault — the report is doing exactly what it should with data that has not landed yet. I am treating the Fabric refresh as the real ticket and will keep this one open until the morning numbers are right.",
    createdAt: minutesAgo(398),
    internal: false,
    attachments: [],
  },
  {
    id: "c-6",
    ticketId: "t-1091",
    authorId: "u-jonathan",
    body: "Moved the Employee model to its own capacity window so it stops competing with the Opportunity extract. Tomorrow morning tells us whether that was enough.",
    createdAt: minutesAgo(52),
    internal: false,
    attachments: [],
  },
  {
    id: "c-7",
    ticketId: "t-1069",
    authorId: "u-jonathan",
    body: "Setting this to blocked. The model cannot be finished until we decide whether a consultant who changes territory mid-year is one row or two.\n\nOne row is simpler and keeps a person's history together. Two rows makes territory reporting correct but splits an individual's numbers, which will confuse anyone comparing to last year. This is a business decision more than a technical one.",
    createdAt: daysAgo(12),
    internal: false,
    attachments: [],
  },
  {
    id: "c-8",
    ticketId: "t-1069",
    authorId: "u-michael",
    body: "Agreed it is a business call. Putting it in front of Dana this week. My instinct is two rows with a stable person key so both readings are possible, but I would rather ask than guess.",
    createdAt: daysAgo(3),
    internal: false,
    attachments: [],
  },
  {
    id: "c-9",
    ticketId: "t-1092",
    authorId: "u-crystal",
    body: "Works fine in Safari on the same phone. It is only the app that will not take the passkey.",
    createdAt: hoursAgo(22),
    internal: false,
    attachments: [],
  },
  {
    id: "c-10",
    ticketId: "t-1092",
    authorId: "u-alexis",
    body: "Reproduced on a test device running iOS 18.2. The app is falling back to password because the passkey was enrolled against the browser domain rather than the app's associated domain. Raising with Salesforce support and documenting the workaround in the meantime.",
    createdAt: hoursAgo(20),
    internal: false,
    attachments: [],
  },
  {
    id: "c-11",
    ticketId: "t-1084",
    authorId: "u-alexis",
    body: "Permission set and role are ready to apply. I still need to know which territory Marisol is in before I can finish — Denver Metro and South Denver have different sharing rules.",
    createdAt: daysAgo(4),
    internal: false,
    attachments: [],
  },
  {
    id: "c-12",
    ticketId: "t-1090",
    authorId: "u-robby",
    body: "Root cause: the Salesforce step required a campaign id and the two new landing pages were not sending one. Zapier treated the missing field as a skipped step rather than an error, which is why nothing alerted.\n\nFixed the mapping and added a fallback campaign so a missing value can never silently drop a lead again. In testing now against live submissions.",
    createdAt: hoursAgo(11),
    internal: false,
    attachments: [],
  },
  {
    id: "c-13",
    ticketId: "t-1080",
    authorId: "u-michael",
    body: "Root cause was sessions living in process memory — every deploy signed everyone out, and the save that followed failed with a bare 'not signed in'. Sessions are in Postgres now and expire on 8 hours idle rather than 8 hours absolute. A save against a dead session offers a way back in without eating the typed note.",
    createdAt: daysAgo(2),
    internal: false,
    attachments: [],
  },
];

/**
 * Hand-authored activity for tickets with a story worth reading. Baseline
 * activity — created, assigned, status moves, resolution — is derived from each
 * ticket's own timestamps in the service layer, so every ticket has a coherent
 * trail without a hundred entries being typed out here.
 */
export const MOCK_TICKET_ACTIVITY: TicketActivity[] = [
  {
    id: "ta-1",
    ticketId: "t-1094",
    kind: "linked_system",
    actorId: "u-robby",
    from: null,
    to: "Zapier, Salesforce, SalesRabbit",
    detail: "Linked the three systems on the failing path.",
    createdAt: minutesAgo(13),
  },
  {
    id: "ta-2",
    ticketId: "t-1094",
    kind: "sla_breached",
    actorId: "u-robby",
    from: null,
    to: "First response",
    detail: "Critical tickets carry a 15 minute first-response target.",
    createdAt: minutesAgo(3),
  },
  {
    id: "ta-3",
    ticketId: "t-1069",
    kind: "status_changed",
    actorId: "u-jonathan",
    from: "In Progress",
    to: "Blocked",
    detail: "Waiting on a decision about territory history.",
    createdAt: daysAgo(12),
  },
  {
    id: "ta-4",
    ticketId: "t-1091",
    kind: "linked_ticket",
    actorId: "u-jonathan",
    from: null,
    to: "KHT-1089",
    detail: "Same root cause.",
    createdAt: minutesAgo(396),
  },
  {
    id: "ta-5",
    ticketId: "t-1090",
    kind: "status_changed",
    actorId: "u-robby",
    from: "In Progress",
    to: "Testing",
    detail: null,
    createdAt: hoursAgo(11),
  },
  {
    id: "ta-6",
    ticketId: "t-1087",
    kind: "status_changed",
    actorId: "u-michael",
    from: "In Progress",
    to: "Testing",
    detail: "Verifying against six recent bids before this goes out.",
    createdAt: daysAgo(1),
  },
  {
    id: "ta-7",
    ticketId: "t-1084",
    kind: "priority_changed",
    actorId: "u-alexis",
    from: "Normal",
    to: "High",
    detail: "Start date is Monday.",
    createdAt: daysAgo(4),
  },
];

/** Categories in the order the analytics page should present them. */
export const TICKET_CATEGORY_PRESENTATION_ORDER = TICKET_CATEGORY_ORDER;

