import type { Milestone, Project, Task } from "@/domain";
import { daysAgo, onDay } from "./now";

/* -------------------------------------------------------------------------- */
/* Construction helpers                                                       */
/* -------------------------------------------------------------------------- */

type ProjectSeed = Partial<Project> &
  Pick<Project, "id" | "slug" | "name" | "status" | "health" | "ownerId" | "targetDate">;

function project(seed: ProjectSeed): Project {
  return {
    description: "",
    businessGoal: "",
    expectedImpact: "",
    contributorIds: [],
    healthNote: null,
    priority: "normal",
    startDate: daysAgo(60),
    completedAt: null,
    progress: 0,
    estimatedHoursSavedMonthly: 0,
    actualHoursSavedMonthly: null,
    manualProcessesEliminated: 0,
    automationsCreated: 0,
    departmentsImpacted: [],
    systemIds: [],
    tags: [],
    dependsOnProjectIds: [],
    relatedArticleIds: [],
    relatedDiagramIds: [],
    initiative: "Unassigned",
    createdAt: daysAgo(90),
    updatedAt: daysAgo(1),
    ...seed,
  };
}

/**
 * Finished work. Written tersely on purpose — a completed project needs enough
 * detail to be believable in the roadmap and to contribute to impact totals,
 * not a full workspace.
 */
function done(
  id: string,
  name: string,
  opts: {
    slug: string;
    owner: string;
    completedDaysAgo: number;
    goal: string;
    hoursSaved: number;
    processes?: number;
    automations?: number;
    systems: string[];
    departments: string[];
    initiative: string;
  },
): Project {
  return project({
    id,
    slug: opts.slug,
    name,
    description: opts.goal,
    businessGoal: opts.goal,
    expectedImpact: `Roughly ${opts.hoursSaved} hours a month returned to the business.`,
    status: "complete",
    health: "on_track",
    ownerId: opts.owner,
    startDate: daysAgo(opts.completedDaysAgo + 45),
    targetDate: daysAgo(opts.completedDaysAgo + 2),
    completedAt: daysAgo(opts.completedDaysAgo),
    progress: 100,
    estimatedHoursSavedMonthly: opts.hoursSaved,
    actualHoursSavedMonthly: opts.hoursSaved,
    manualProcessesEliminated: opts.processes ?? 0,
    automationsCreated: opts.automations ?? 0,
    systemIds: opts.systems,
    departmentsImpacted: opts.departments,
    initiative: opts.initiative,
    updatedAt: daysAgo(opts.completedDaysAgo),
  });
}

/* -------------------------------------------------------------------------- */
/* Active portfolio                                                           */
/* -------------------------------------------------------------------------- */

export const MOCK_PROJECTS: Project[] = [
  project({
    id: "p-fabric-migration",
    slug: "fabric-analytics-migration",
    name: "Fabric Analytics Migration",
    description:
      "Move reporting off direct Salesforce queries and onto governed semantic models in Microsoft Fabric, so that every report agrees on what a job, an estimate and a consultant are.",
    businessGoal:
      "One set of numbers the whole company trusts, and reports that stop disagreeing with each other in leadership meetings.",
    expectedImpact:
      "Removes the weekly reconciliation between Sales and Finance figures, and cuts report build time from days to hours.",
    status: "in_progress",
    health: "at_risk",
    healthNote:
      "The Employee model is blocked on a territory-history decision, and overnight refreshes have been running late since Tuesday. The October date is still reachable but only if the decision lands this week.",
    ownerId: "u-jonathan",
    contributorIds: ["u-robby", "u-michael"],
    priority: "critical",
    startDate: daysAgo(96),
    targetDate: onDay(52),
    progress: 62,
    estimatedHoursSavedMonthly: 46,
    actualHoursSavedMonthly: null,
    manualProcessesEliminated: 3,
    automationsCreated: 5,
    departmentsImpacted: ["Leadership", "Sales", "Finance", "Operations"],
    systemIds: ["sys-fabric", "sys-power-bi", "sys-salesforce"],
    tags: ["analytics", "data-platform", "strategic"],
    relatedArticleIds: ["kb-fabric-architecture", "kb-powerbi-standards"],
    relatedDiagramIds: ["dg-salesforce-to-powerbi"],
    initiative: "One Source of Truth",
    createdAt: daysAgo(110),
    updatedAt: daysAgo(1),
  }),
  project({
    id: "p-command-center",
    slug: "tech-command-center",
    name: "Tech Command Center",
    description:
      "Build the internal application the Tech Department runs on: tickets, projects, systems, documentation and the map of how they connect, in one place.",
    businessGoal:
      "Stop technology work being scattered across Slack, ClickUp and half a dozen other tools, and give the department a single place to answer what needs attention.",
    expectedImpact:
      "Replaces the Slack-to-ClickUp duplication entirely and gives leadership a real view of what Tech is delivering.",
    status: "in_progress",
    health: "on_track",
    ownerId: "u-robby",
    contributorIds: ["u-michael"],
    priority: "high",
    startDate: daysAgo(22),
    targetDate: onDay(74),
    progress: 34,
    estimatedHoursSavedMonthly: 28,
    manualProcessesEliminated: 2,
    automationsCreated: 0,
    departmentsImpacted: ["Technology"],
    systemIds: ["sys-estimator-portal"],
    tags: ["internal-tools", "strategic"],
    relatedDiagramIds: ["dg-ticket-intake"],
    initiative: "Department Operating System",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  }),
  project({
    id: "p-ticketing-rollout",
    slug: "department-ticketing-rollout",
    name: "Department Ticketing Rollout",
    description:
      "Move each department off ad-hoc Slack requests and onto a single intake path, one department at a time, starting with Sales.",
    businessGoal:
      "Requests stop getting lost in direct messages, and the department can finally say how much work it is actually absorbing.",
    expectedImpact:
      "Removes the Slack-to-ClickUp duplication and gives every request an owner, an age and an SLA.",
    status: "rollout",
    health: "on_track",
    ownerId: "u-robby",
    contributorIds: ["u-alexis", "u-michael"],
    priority: "high",
    startDate: daysAgo(58),
    targetDate: onDay(24),
    progress: 71,
    estimatedHoursSavedMonthly: 22,
    actualHoursSavedMonthly: 16,
    manualProcessesEliminated: 2,
    automationsCreated: 3,
    departmentsImpacted: ["Sales", "Production", "Operations", "Customer Experience"],
    systemIds: ["sys-zapier", "sys-google-workspace"],
    tags: ["process", "adoption"],
    relatedDiagramIds: ["dg-ticket-intake"],
    dependsOnProjectIds: ["p-command-center"],
    initiative: "Department Operating System",
    createdAt: daysAgo(70),
    updatedAt: daysAgo(2),
  }),
  project({
    id: "p-bart-improvements",
    slug: "bart-platform-improvements",
    name: "BART Platform Improvements",
    description:
      "Correct pricing edge cases, speed up bid entry on poor connections, and make the surface-measurement flow usable on a phone in a driveway.",
    businessGoal:
      "A consultant should be able to price a job accurately from the customer's front garden without fighting the tool.",
    expectedImpact:
      "Fewer re-quotes from pricing errors, and less time spent on a bid after leaving the property.",
    status: "testing",
    health: "on_track",
    ownerId: "u-michael",
    contributorIds: ["u-robby"],
    priority: "high",
    startDate: daysAgo(74),
    targetDate: onDay(11),
    progress: 84,
    estimatedHoursSavedMonthly: 31,
    actualHoursSavedMonthly: null,
    manualProcessesEliminated: 1,
    automationsCreated: 2,
    departmentsImpacted: ["Sales", "Production"],
    systemIds: ["sys-bart", "sys-salesforce"],
    tags: ["pricing", "field-tools"],
    relatedArticleIds: ["kb-bart-overview"],
    initiative: "Field Enablement",
    createdAt: daysAgo(84),
    updatedAt: daysAgo(1),
  }),
  project({
    id: "p-exec-reporting",
    slug: "executive-power-bi-reporting",
    name: "Executive Power BI Reporting",
    description:
      "Rebuild the leadership reporting pack on the new Fabric models, with fiscal periods, rolling comparisons and row-level security.",
    businessGoal:
      "Give leadership a pack they can open on a Monday morning and act on without asking three follow-up questions.",
    expectedImpact:
      "Removes the manual spreadsheet leadership currently maintains alongside the dashboard.",
    status: "in_progress",
    health: "on_track",
    ownerId: "u-jonathan",
    contributorIds: ["u-michael"],
    priority: "normal",
    startDate: daysAgo(41),
    targetDate: onDay(38),
    progress: 45,
    estimatedHoursSavedMonthly: 18,
    manualProcessesEliminated: 1,
    automationsCreated: 1,
    departmentsImpacted: ["Leadership", "Finance", "Sales"],
    systemIds: ["sys-power-bi", "sys-fabric"],
    tags: ["reporting", "leadership"],
    dependsOnProjectIds: ["p-fabric-migration"],
    relatedArticleIds: ["kb-powerbi-standards"],
    initiative: "One Source of Truth",
    createdAt: daysAgo(48),
    updatedAt: daysAgo(3),
  }),
  project({
    id: "p-holiday-lights",
    slug: "holiday-lights-systems-integration",
    name: "Holiday Lights Systems Integration",
    description:
      "Bring the Holiday Lights season onto the same systems as the painting business: CRM records, scheduling, crew calendars and reporting.",
    businessGoal:
      "Run the seasonal business on the company's systems rather than on spreadsheets that only Erin understands.",
    expectedImpact:
      "Ends the parallel spreadsheet process and lets the season be reported alongside everything else.",
    status: "planning",
    health: "blocked",
    healthNote:
      "Waiting on a decision about whether Holiday Lights uses its own Salesforce record type or a shared one. The season starts in October, so this needs settling within two weeks to be worth doing this year.",
    ownerId: "u-robby",
    contributorIds: ["u-alexis"],
    priority: "high",
    startDate: daysAgo(30),
    targetDate: onDay(45),
    progress: 18,
    estimatedHoursSavedMonthly: 24,
    manualProcessesEliminated: 4,
    automationsCreated: 0,
    departmentsImpacted: ["Holiday Lights", "Operations", "Sales"],
    systemIds: ["sys-salesforce", "sys-google-workspace", "sys-apptoto"],
    tags: ["seasonal", "needs-decision"],
    initiative: "Seasonal Business",
    createdAt: daysAgo(36),
    updatedAt: daysAgo(4),
  }),

  /* -- Not currently active -------------------------------------------------- */
  project({
    id: "p-hubspot-sync",
    slug: "salesforce-hubspot-sync-cleanup",
    name: "Salesforce / HubSpot Sync Cleanup",
    description:
      "Rewrite the contact matching rules so the two-way sync stops creating duplicates, and clean up the records it has already created.",
    businessGoal:
      "One contact per human being, so that marketing attribution and sales follow-up stop contradicting each other.",
    expectedImpact:
      "Removes roughly forty duplicate merges a month and makes campaign attribution trustworthy.",
    status: "on_hold",
    health: "at_risk",
    healthNote:
      "Parked until the Fabric migration settles — the matching rules should be written once, against the model that will actually be used.",
    ownerId: "u-robby",
    priority: "normal",
    startDate: daysAgo(52),
    targetDate: onDay(96),
    progress: 22,
    estimatedHoursSavedMonthly: 14,
    manualProcessesEliminated: 1,
    departmentsImpacted: ["Marketing", "Sales"],
    systemIds: ["sys-hubspot", "sys-salesforce"],
    tags: ["data-quality"],
    dependsOnProjectIds: ["p-fabric-migration"],
    initiative: "One Source of Truth",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(9),
  }),
  project({
    id: "p-quickbooks-automation",
    slug: "quickbooks-invoice-automation",
    name: "QuickBooks Invoice Automation",
    description:
      "Replace the weekly manual export of won jobs into QuickBooks with a scheduled, reconciled sync.",
    businessGoal:
      "Finance stops re-keying jobs by hand and stops discovering missing ones during reconciliation.",
    expectedImpact: "Removes a recurring four-hour weekly task and a known source of error.",
    status: "backlog",
    health: "on_track",
    ownerId: "u-robby",
    priority: "normal",
    startDate: onDay(60),
    targetDate: onDay(140),
    progress: 0,
    estimatedHoursSavedMonthly: 17,
    manualProcessesEliminated: 1,
    departmentsImpacted: ["Finance"],
    systemIds: ["sys-quickbooks", "sys-salesforce"],
    tags: ["automation", "finance"],
    initiative: "Automate the Manual",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(20),
  }),
  project({
    id: "p-lead-routing",
    slug: "lead-routing-overhaul",
    name: "Lead Routing Overhaul",
    description:
      "Rethink how an inbound lead reaches a consultant: territory, availability and speed-to-first-touch rather than round robin.",
    businessGoal: "Cut the time between a lead arriving and somebody calling it.",
    expectedImpact: "Expected to improve speed-to-contact materially in the busiest territories.",
    status: "idea",
    health: "on_track",
    ownerId: "u-michael",
    priority: "normal",
    startDate: onDay(90),
    targetDate: onDay(180),
    progress: 0,
    estimatedHoursSavedMonthly: 0,
    departmentsImpacted: ["Sales"],
    systemIds: ["sys-salesforce", "sys-zapier"],
    tags: ["revenue", "exploration"],
    initiative: "Field Enablement",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(6),
  }),

  /* -- Completed this quarter ------------------------------------------------ */
  done("p-done-portal-sessions", "Estimator Portal Reliability", {
    slug: "estimator-portal-reliability",
    owner: "u-michael",
    completedDaysAgo: 2,
    goal: "Stop deploys signing estimators out and losing the note they were typing.",
    hoursSaved: 6,
    processes: 0,
    automations: 1,
    systems: ["sys-estimator-portal"],
    departments: ["Sales"],
    initiative: "Field Enablement",
  }),
  done("p-done-activity-writeback", "Follow-up Activity Writeback", {
    slug: "follow-up-activity-writeback",
    owner: "u-robby",
    completedDaysAgo: 9,
    goal: "Log follow-ups from the estimator portal onto the Salesforce record automatically.",
    hoursSaved: 19,
    processes: 1,
    automations: 2,
    systems: ["sys-estimator-portal", "sys-salesforce"],
    departments: ["Sales"],
    initiative: "Automate the Manual",
  }),
  done("p-done-warranty-intake", "Warranty Claim Intake", {
    slug: "warranty-claim-intake",
    owner: "u-alexis",
    completedDaysAgo: 17,
    goal: "Route warranty claims from Jotform straight into the CX queue with an owner.",
    hoursSaved: 12,
    processes: 1,
    automations: 3,
    systems: ["sys-jotform", "sys-zapier", "sys-salesforce"],
    departments: ["Customer Experience", "Production"],
    initiative: "Automate the Manual",
  }),
  done("p-done-rls", "Power BI Row-Level Security", {
    slug: "power-bi-row-level-security",
    owner: "u-jonathan",
    completedDaysAgo: 23,
    goal: "Ensure a sales manager sees their own team's numbers and nobody else's.",
    hoursSaved: 4,
    processes: 0,
    automations: 0,
    systems: ["sys-power-bi", "sys-fabric"],
    departments: ["Sales", "Leadership"],
    initiative: "One Source of Truth",
  }),
  done("p-done-companycam", "CompanyCam Job Linking", {
    slug: "companycam-job-linking",
    owner: "u-alexis",
    completedDaysAgo: 28,
    goal: "Attach every CompanyCam project to the Salesforce job it documents.",
    hoursSaved: 9,
    processes: 1,
    automations: 2,
    systems: ["sys-companycam", "sys-salesforce"],
    departments: ["Production"],
    initiative: "Field Enablement",
  }),
  done("p-done-attribution", "Campaign Attribution Fix", {
    slug: "campaign-attribution-fix",
    owner: "u-robby",
    completedDaysAgo: 34,
    goal: "Make every landing page carry a campaign id so leads stop being attributed to Direct.",
    hoursSaved: 7,
    processes: 0,
    automations: 4,
    systems: ["sys-websites", "sys-zapier", "sys-hubspot"],
    departments: ["Marketing"],
    initiative: "One Source of Truth",
  }),
  done("p-done-onboarding", "Onboarding & Offboarding Runbook", {
    slug: "onboarding-offboarding-runbook",
    owner: "u-alexis",
    completedDaysAgo: 41,
    goal: "One checklist that grants or revokes every system a new starter or leaver touches.",
    hoursSaved: 15,
    processes: 2,
    automations: 3,
    systems: ["sys-google-workspace", "sys-salesforce", "sys-companycam"],
    departments: ["Operations", "Technology"],
    initiative: "Automate the Manual",
  }),
  done("p-done-aircall", "Aircall Call Logging", {
    slug: "aircall-call-logging",
    owner: "u-alexis",
    completedDaysAgo: 47,
    goal: "Log every completed call against the right record, with its recording.",
    hoursSaved: 21,
    processes: 1,
    automations: 2,
    systems: ["sys-aircall", "sys-salesforce"],
    departments: ["Sales", "Customer Experience"],
    initiative: "Automate the Manual",
  }),
  done("p-done-pandadoc", "PandaDoc Proposal Templates", {
    slug: "pandadoc-proposal-templates",
    owner: "u-robby",
    completedDaysAgo: 55,
    goal: "Generate the customer proposal from Salesforce rather than assembling it by hand.",
    hoursSaved: 26,
    processes: 2,
    automations: 3,
    systems: ["sys-pandadoc", "sys-salesforce"],
    departments: ["Sales"],
    initiative: "Automate the Manual",
  }),
  done("p-done-bronze-layer", "Fabric Bronze Layer", {
    slug: "fabric-bronze-layer",
    owner: "u-jonathan",
    completedDaysAgo: 62,
    goal: "Land raw Salesforce extracts in a governed bronze layer instead of ad-hoc queries.",
    hoursSaved: 11,
    processes: 1,
    automations: 4,
    systems: ["sys-fabric", "sys-salesforce"],
    departments: ["Technology", "Leadership"],
    initiative: "One Source of Truth",
  }),
  done("p-done-sso", "Single Sign-On Consolidation", {
    slug: "single-sign-on-consolidation",
    owner: "u-alexis",
    completedDaysAgo: 68,
    goal: "Put every system that supports it behind the Google Workspace account.",
    hoursSaved: 13,
    processes: 1,
    automations: 1,
    systems: ["sys-google-workspace", "sys-salesforce", "sys-power-bi"],
    departments: ["Everyone"],
    initiative: "Department Operating System",
  }),
  done("p-done-apptoto", "Estimate Scheduling Automation", {
    slug: "estimate-scheduling-automation",
    owner: "u-robby",
    completedDaysAgo: 76,
    goal: "Book, confirm and remind estimate appointments without anyone touching a calendar.",
    hoursSaved: 34,
    processes: 3,
    automations: 5,
    systems: ["sys-apptoto", "sys-google-workspace", "sys-salesforce"],
    departments: ["Sales", "Customer Experience"],
    initiative: "Automate the Manual",
  }),
];

/* -------------------------------------------------------------------------- */
/* Milestones                                                                 */
/* -------------------------------------------------------------------------- */

function ms(
  id: string,
  projectId: string,
  name: string,
  description: string,
  targetOffsetDays: number,
  status: Milestone["status"],
  order: number,
  completedDaysAgo?: number,
): Milestone {
  return {
    id,
    projectId,
    name,
    description,
    targetDate: onDay(targetOffsetDays),
    completedAt: completedDaysAgo != null ? daysAgo(completedDaysAgo) : null,
    status,
    order,
  };
}

export const MOCK_MILESTONES: Milestone[] = [
  // Fabric Analytics Migration
  ms("m-fab-1", "p-fabric-migration", "Architecture Approved", "Lakehouse layout and naming standards signed off.", -74, "complete", 1, 74),
  ms("m-fab-2", "p-fabric-migration", "Bronze Layer Live", "Raw Salesforce extracts landing nightly.", -62, "complete", 2, 62),
  ms("m-fab-3", "p-fabric-migration", "Sales Model Complete", "Sales semantic model built and reconciled against Salesforce.", -18, "complete", 3, 18),
  ms("m-fab-4", "p-fabric-migration", "Employee Model Complete", "Employee model, including territory history.", 14, "at_risk", 4),
  ms("m-fab-5", "p-fabric-migration", "Reports Repointed", "Every production report reading models rather than raw tables.", 38, "not_started", 5),
  ms("m-fab-6", "p-fabric-migration", "Production Launch", "Old datasets retired.", 52, "not_started", 6),

  // Tech Command Center
  ms("m-tcc-1", "p-command-center", "Information Architecture Agreed", "Navigation, domain model and data boundaries settled.", -14, "complete", 1, 14),
  ms("m-tcc-2", "p-command-center", "Command Center & Tickets", "Overview and the full ticket workflow usable end to end.", 8, "in_progress", 2),
  ms("m-tcc-3", "p-command-center", "Projects, Systems & Knowledge", "The rest of the workspace, on mock data.", 30, "not_started", 3),
  ms("m-tcc-4", "p-command-center", "Live Data Behind the Service Layer", "Postgres replaces the mock provider.", 55, "not_started", 4),
  ms("m-tcc-5", "p-command-center", "Department Pilot", "Tech Department runs on it for two weeks with no ClickUp.", 74, "not_started", 5),

  // Department Ticketing Rollout
  ms("m-tr-1", "p-ticketing-rollout", "Intake Path Defined", "One route in, with categories and an owner for each.", -44, "complete", 1, 44),
  ms("m-tr-2", "p-ticketing-rollout", "Sales Pilot", "Sales submitting through the new path only.", -16, "complete", 2, 16),
  ms("m-tr-3", "p-ticketing-rollout", "Production & Operations", "Two more departments migrated.", 6, "in_progress", 3),
  ms("m-tr-4", "p-ticketing-rollout", "Slack Intake Retired", "The old Slack-to-ClickUp automation switched off.", 24, "not_started", 4),

  // BART Platform Improvements
  ms("m-bart-1", "p-bart-improvements", "Pricing Audit Complete", "Every pricing edge case catalogued against real bids.", -52, "complete", 1, 52),
  ms("m-bart-2", "p-bart-improvements", "Development Complete", "Rounding, offline entry and mobile measurement shipped to staging.", -6, "complete", 2, 6),
  ms("m-bart-3", "p-bart-improvements", "User Testing", "Four consultants pricing real jobs on the new build.", 4, "in_progress", 3),
  ms("m-bart-4", "p-bart-improvements", "Production Launch", "Rolled out to the whole sales team.", 11, "not_started", 4),

  // Executive Power BI Reporting
  ms("m-exec-1", "p-exec-reporting", "Report Inventory", "What leadership actually opens, and what they ignore.", -30, "complete", 1, 30),
  ms("m-exec-2", "p-exec-reporting", "Fiscal Date Table", "Fiscal periods available to every model.", 5, "in_progress", 2),
  ms("m-exec-3", "p-exec-reporting", "Executive Pack Rebuilt", "New pack built on the Fabric models.", 26, "not_started", 3),
  ms("m-exec-4", "p-exec-reporting", "Leadership Sign-off", "Dana and the leadership team accept the pack.", 38, "not_started", 4),

  // Holiday Lights
  ms("m-hl-1", "p-holiday-lights", "Season Process Mapped", "How a Holiday Lights job differs from a painting job.", -12, "complete", 1, 12),
  ms("m-hl-2", "p-holiday-lights", "Record Type Decision", "Own record type, or shared with painting.", 4, "at_risk", 2),
  ms("m-hl-3", "p-holiday-lights", "Scheduling & Crew Calendars", "Installs booked through the same scheduling path.", 26, "not_started", 3),
  ms("m-hl-4", "p-holiday-lights", "Season Launch", "Live before the first install week.", 45, "not_started", 4),
];

/* -------------------------------------------------------------------------- */
/* Tasks                                                                      */
/* -------------------------------------------------------------------------- */

function task(
  id: string,
  projectId: string,
  title: string,
  opts: {
    status: Task["status"];
    owner?: string | null;
    priority?: Task["priority"];
    dueOffset?: number;
    est?: number;
    actual?: number;
    milestoneId?: string;
    parent?: string;
    description?: string;
    dependsOn?: string[];
    order: number;
  },
): Task {
  return {
    id,
    projectId,
    parentTaskId: opts.parent ?? null,
    milestoneId: opts.milestoneId ?? null,
    title,
    description: opts.description ?? "",
    ownerId: opts.owner ?? null,
    status: opts.status,
    priority: opts.priority ?? "normal",
    dueDate: opts.dueOffset != null ? onDay(opts.dueOffset) : null,
    estimatedHours: opts.est ?? null,
    actualHours: opts.actual ?? null,
    dependsOnTaskIds: opts.dependsOn ?? [],
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
    order: opts.order,
  };
}

export const MOCK_TASKS: Task[] = [
  // -- Fabric Analytics Migration -------------------------------------------
  task("tk-fab-1", "p-fabric-migration", "Reconcile Sales model against Salesforce totals", {
    status: "done", owner: "u-jonathan", milestoneId: "m-fab-3", est: 12, actual: 14, order: 1,
    description: "Row counts and revenue totals must match the CRM before anyone is asked to trust the model.",
  }),
  task("tk-fab-2", "p-fabric-migration", "Decide how territory history is modelled", {
    status: "blocked", owner: "u-michael", priority: "high", milestoneId: "m-fab-4", est: 4, dueOffset: 3, order: 2,
    description: "One row per consultant, or one row per consultant per territory. Needs a business decision, not a technical one.",
  }),
  task("tk-fab-3", "p-fabric-migration", "Build the Employee semantic model", {
    status: "in_progress", owner: "u-jonathan", priority: "high", milestoneId: "m-fab-4", est: 24, actual: 9, dueOffset: 12, dependsOn: ["tk-fab-2"], order: 3,
  }),
  task("tk-fab-4", "p-fabric-migration", "Move the Employee refresh to its own capacity window", {
    status: "review", owner: "u-jonathan", priority: "high", milestoneId: "m-fab-4", est: 3, actual: 2, dueOffset: 1, order: 4,
    description: "Stops it competing with the Opportunity extract, which is the likely cause of the late finishes.",
  }),
  task("tk-fab-5", "p-fabric-migration", "Repoint the Sales Overview report", {
    status: "todo", owner: "u-jonathan", milestoneId: "m-fab-5", est: 6, dueOffset: 24, dependsOn: ["tk-fab-3"], order: 5,
  }),
  task("tk-fab-6", "p-fabric-migration", "Repoint the Production Scorecard", {
    status: "todo", owner: "u-robby", milestoneId: "m-fab-5", est: 6, dueOffset: 30, dependsOn: ["tk-fab-3"], order: 6,
  }),
  task("tk-fab-7", "p-fabric-migration", "Write the model documentation", {
    status: "todo", owner: "u-jonathan", priority: "low", milestoneId: "m-fab-6", est: 8, dueOffset: 44, order: 7,
  }),
  task("tk-fab-8", "p-fabric-migration", "Retire the legacy datasets", {
    status: "todo", owner: "u-jonathan", milestoneId: "m-fab-6", est: 4, dueOffset: 50, dependsOn: ["tk-fab-5", "tk-fab-6"], order: 8,
  }),

  // -- Tech Command Center ---------------------------------------------------
  task("tk-tcc-1", "p-command-center", "Agree the domain model", {
    status: "done", owner: "u-robby", milestoneId: "m-tcc-1", est: 8, actual: 7, order: 1,
    description: "Tickets, projects, systems, diagrams and articles, and how they reference each other.",
  }),
  task("tk-tcc-2", "p-command-center", "Design tokens from the Kind Home brand system", {
    status: "done", owner: "u-robby", milestoneId: "m-tcc-1", est: 4, actual: 3, order: 2,
  }),
  task("tk-tcc-3", "p-command-center", "Build the Command Center overview", {
    status: "done", owner: "u-robby", priority: "high", milestoneId: "m-tcc-2", est: 16, actual: 15, order: 3,
  }),
  task("tk-tcc-4", "p-command-center", "Ticket table, kanban and detail", {
    status: "in_progress", owner: "u-robby", priority: "high", milestoneId: "m-tcc-2", est: 24, actual: 11, dueOffset: 6, order: 4,
  }),
  task("tk-tcc-5", "p-command-center", "Ticket conversation and activity trail", {
    status: "in_progress", owner: "u-robby", milestoneId: "m-tcc-2", est: 10, actual: 4, dueOffset: 8, parent: "tk-tcc-4", order: 5,
  }),
  task("tk-tcc-6", "p-command-center", "SLA evaluation and indicators", {
    status: "done", owner: "u-robby", milestoneId: "m-tcc-2", est: 6, actual: 5, parent: "tk-tcc-4", order: 6,
  }),
  task("tk-tcc-7", "p-command-center", "System map on React Flow", {
    status: "todo", owner: "u-robby", milestoneId: "m-tcc-3", est: 20, dueOffset: 22, order: 7,
  }),
  task("tk-tcc-8", "p-command-center", "Replace the mock provider with Postgres", {
    status: "todo", owner: "u-michael", priority: "high", milestoneId: "m-tcc-4", est: 30, dueOffset: 52, order: 8,
    description: "The service layer already has the shape; this is the implementation behind it.",
  }),

  // -- Department Ticketing Rollout -----------------------------------------
  task("tk-tr-1", "p-ticketing-rollout", "Define categories with each department", {
    status: "done", owner: "u-robby", milestoneId: "m-tr-1", est: 6, actual: 8, order: 1,
  }),
  task("tk-tr-2", "p-ticketing-rollout", "Run the Sales pilot", {
    status: "done", owner: "u-robby", milestoneId: "m-tr-2", est: 12, actual: 13, order: 2,
  }),
  task("tk-tr-3", "p-ticketing-rollout", "Onboard Production", {
    status: "in_progress", owner: "u-alexis", priority: "high", milestoneId: "m-tr-3", est: 8, actual: 3, dueOffset: 4, order: 3,
  }),
  task("tk-tr-4", "p-ticketing-rollout", "Onboard Operations", {
    status: "todo", owner: "u-alexis", milestoneId: "m-tr-3", est: 8, dueOffset: 6, order: 4,
  }),
  task("tk-tr-5", "p-ticketing-rollout", "Switch off the Slack-to-ClickUp zap", {
    status: "todo", owner: "u-robby", priority: "high", milestoneId: "m-tr-4", est: 2, dueOffset: 22, dependsOn: ["tk-tr-3", "tk-tr-4"], order: 5,
    description: "The duplication ends here. Nothing else changes until every department is migrated.",
  }),

  // -- BART Platform Improvements -------------------------------------------
  task("tk-bart-1", "p-bart-improvements", "Catalogue pricing edge cases from real bids", {
    status: "done", owner: "u-michael", milestoneId: "m-bart-1", est: 10, actual: 12, order: 1,
  }),
  task("tk-bart-2", "p-bart-improvements", "Fix multi-surface rounding", {
    status: "done", owner: "u-michael", priority: "high", milestoneId: "m-bart-2", est: 6, actual: 5, order: 2,
  }),
  task("tk-bart-3", "p-bart-improvements", "Offline-tolerant bid entry", {
    status: "done", owner: "u-michael", milestoneId: "m-bart-2", est: 14, actual: 16, order: 3,
  }),
  task("tk-bart-4", "p-bart-improvements", "Verify against six recent bids", {
    status: "in_progress", owner: "u-crystal", priority: "high", milestoneId: "m-bart-3", est: 4, actual: 2, dueOffset: 2, order: 4,
  }),
  task("tk-bart-5", "p-bart-improvements", "Consultant walkthrough session", {
    status: "todo", owner: "u-michael", milestoneId: "m-bart-4", est: 3, dueOffset: 9, order: 5,
  }),

  // -- Executive Power BI Reporting -----------------------------------------
  task("tk-exec-1", "p-exec-reporting", "Audit which reports leadership actually opens", {
    status: "done", owner: "u-jonathan", milestoneId: "m-exec-1", est: 5, actual: 4, order: 1,
  }),
  task("tk-exec-2", "p-exec-reporting", "Build the fiscal date table", {
    status: "in_progress", owner: "u-jonathan", priority: "high", milestoneId: "m-exec-2", est: 8, actual: 5, dueOffset: 3, order: 2,
  }),
  task("tk-exec-3", "p-exec-reporting", "Rolling 13-week comparison page", {
    status: "review", owner: "u-jonathan", milestoneId: "m-exec-2", est: 6, actual: 6, dueOffset: 2, order: 3,
  }),
  task("tk-exec-4", "p-exec-reporting", "Rebuild the executive pack on the new models", {
    status: "todo", owner: "u-jonathan", milestoneId: "m-exec-3", est: 20, dueOffset: 24, dependsOn: ["tk-exec-2"], order: 4,
  }),
  task("tk-exec-5", "p-exec-reporting", "Walk Dana through the new pack", {
    status: "todo", owner: "u-michael", milestoneId: "m-exec-4", est: 2, dueOffset: 36, order: 5,
  }),

  // -- Holiday Lights --------------------------------------------------------
  task("tk-hl-1", "p-holiday-lights", "Map how a Holiday Lights job differs", {
    status: "done", owner: "u-robby", milestoneId: "m-hl-1", est: 6, actual: 6, order: 1,
  }),
  task("tk-hl-2", "p-holiday-lights", "Decide on record type", {
    status: "blocked", owner: "u-michael", priority: "high", milestoneId: "m-hl-2", est: 3, dueOffset: 3, order: 2,
    description: "Own record type keeps the season clean but doubles the reporting work. Needs Erin and Dana in the room.",
  }),
  task("tk-hl-3", "p-holiday-lights", "Crew calendar structure", {
    status: "todo", owner: "u-alexis", milestoneId: "m-hl-3", est: 8, dueOffset: 20, dependsOn: ["tk-hl-2"], order: 3,
  }),
  task("tk-hl-4", "p-holiday-lights", "Scheduling path for installs", {
    status: "todo", owner: "u-robby", milestoneId: "m-hl-3", est: 12, dueOffset: 26, dependsOn: ["tk-hl-2"], order: 4,
  }),
];
