import { TASK_STATUS_META, type Milestone, type Project, type Task } from "@/domain";
import { daysAgo, onDay } from "./now";

/**
 * Projects, taken from the real ClickUp project folders.
 *
 * In ClickUp a *list* inside a project folder is what the department actually
 * treats as a project — "ELT of SF Data in Microsoft Fabric", "Cabinet
 * Scheduling", "Spotio Launch". Those lists are the projects here, and the
 * tasks inside them are the tasks.
 *
 * What ClickUp does not have is milestones, business goals, health, or any
 * measure of impact. Those are Command Center concepts. Rather than invent
 * them against real projects, the fields are left honest: health defaults to
 * on-track unless a real blocker is visible in the tickets, and impact is only
 * populated where the value is actually known.
 */

/* -------------------------------------------------------------------------- */
/* Real tasks, captured from ClickUp                                          */
/* -------------------------------------------------------------------------- */

type CapturedTask = {
  id: string;
  name: string;
  status: string;
  project: string;
  due?: string;
  closed?: string;
  owner?: string;
  priority?: "urgent" | "high" | "normal";
};

const CAPTURED_TASKS: CapturedTask[] = [
  // ELT of SF Data in Microsoft Fabric
  { id: "86dzb3eam", name: "Go through all Fields Nomenclature in ETL Process Dimensions", status: "completed", project: "p-fabric-elt", due: "1768824000000", closed: "1769196146538" },
  { id: "86dzb3fhu", name: "Fix the issue with jobs in Silver Stage. May be because of deleted fields in SF still in the schema", status: "completed", project: "p-fabric-elt", due: "1768910400000", closed: "1769194019030", owner: "u-robby" },

  // Cabinet Scheduling
  { id: "86dy2v4qm", name: "Create push tool for cabinet scheduling push", status: "to do", project: "p-cabinet-scheduling" },
  { id: "86dy2v1ue", name: "Create Opportunity record type", status: "to do", project: "p-cabinet-scheduling" },
  { id: "86dy2v62j", name: "What reports will I need to edit?", status: "planning", project: "p-cabinet-scheduling" },
  { id: "86dy2wpe0", name: "When creating a new Opp record type will all the automations work the same?", status: "planning", project: "p-cabinet-scheduling" },
  { id: "86dy2wqeu", name: "Whose calendar should this go on? The assigned Project Manager.", status: "planning", project: "p-cabinet-scheduling" },
  { id: "86dy2v5qv", name: "Quick-fix table for PTO days that can be mapped on a chart", status: "to do", project: "p-cabinet-scheduling" },
  { id: "86dy2v5cb", name: "Make sure there is a chart showing load by PM", status: "to do", project: "p-cabinet-scheduling" },
  { id: "86dy2v4wh", name: "Create push tool for cabinet warranty push", status: "to do", project: "p-cabinet-scheduling" },
  { id: "86dy2v49y", name: "Link doors and drawers to the job", status: "to do", project: "p-cabinet-scheduling" },
  { id: "86dy2v463", name: "Make doors and drawers required to move to closed won", status: "to do", project: "p-cabinet-scheduling" },
  { id: "86dy2v2xx", name: "Make sure Path is configured correctly", status: "to do", project: "p-cabinet-scheduling" },

  // Scorecards
  { id: "86dzrkzbj", name: "Cancelled Reason", status: "to do", project: "p-scorecards" },
  { id: "86dzrkyzf", name: "Move more fields into the D_Opportunity and F_Opportunity tables", status: "to do", project: "p-scorecards", due: "1770804000000" },
  { id: "86dzb5nte", name: "Update Looker Studio to show 2026", status: "complete", project: "p-scorecards", due: "1768824000000", closed: "1768852574822", owner: "u-robby" },
  { id: "86duf9ca5", name: "PM Leaderboard", status: "complete", project: "p-scorecards", due: "1748689200000", closed: "1745268468755", owner: "u-robby" },
  { id: "86dwkf55n", name: "Colour-format the scheduled number on the 90-day commission calculator to match the table", status: "complete", project: "p-scorecards", due: "1745838000000", closed: "1745947551912", owner: "u-robby" },
  { id: "86dwhgaku", name: "Investigate month-end behaviour in the SDR scorecard", status: "complete", project: "p-scorecards", due: "1744801200000", closed: "1745290212862", owner: "u-robby" },
  { id: "86dwhrn6f", name: "Self-gen contest leaderboard development", status: "complete", project: "p-scorecards", due: "1745316000000", closed: "1744913098225", owner: "u-robby" },
  { id: "86dwgn3wy", name: "Goal vs actual in scorecards, estimator first", status: "complete", project: "p-scorecards", due: "1744624800000", closed: "1744665747682", owner: "u-robby" },
  { id: "86dwhd1e2", name: "Create Chloe Hackathorn team in SDR scorecard", status: "complete", project: "p-scorecards", due: "1745312400000", closed: "1744829704612", owner: "u-robby", priority: "urgent" },
  { id: "86dwh1p1p", name: "Update commissionable calculator to reflect 90 days out", status: "complete", project: "p-scorecards", due: "1744729200000", closed: "1744760650947", owner: "u-robby", priority: "urgent" },
  { id: "86dwgn3jy", name: "Estimator Marketing/SDR DPE in scorecard", status: "complete", project: "p-scorecards", due: "1744711200000", closed: "1744746979256", owner: "u-robby", priority: "high" },
  { id: "86dwh1p6r", name: "Commissionable calculator roster should equal the active roster", status: "complete", project: "p-scorecards", due: "1744730100000", closed: "1744741279885", owner: "u-robby" },
  { id: "86dwgq2uz", name: "Confirm estimator 90-day runs on all record types, not just exteriors", status: "complete", project: "p-scorecards", due: "1744624800000", closed: "1744661677010", owner: "u-robby" },
  { id: "86dueqgj5", name: "Add profit dollars to main", status: "complete", project: "p-scorecards", due: "1724670000000", closed: "1744395017301" },

  // Salesforce General To-do's
  { id: "86dzbzzbf", name: "Create a profile so CAMs cannot delete records of any kind", status: "not doing", project: "p-salesforce-general", due: "1769774400000" },
  { id: "86dzb4by1", name: "Check why Mike does not get all ready-to-schedule emails", status: "to do", project: "p-salesforce-general", due: "1769860800000" },
  { id: "86dzb48ap", name: "Two Angi List Quote Request records in the system — needs cleaning up", status: "to do", project: "p-salesforce-general", due: "1769169600000" },
  { id: "86dzb3zax", name: "Set up contact fields to start unreasonable-hospitality tracking", status: "to do", project: "p-salesforce-general", due: "1769342400000", owner: "u-robby" },
  { id: "86dwjkg9p", name: "Add Greenlit to SF Lead and Opportunity", status: "complete", project: "p-salesforce-general", due: "1748775600000", closed: "1745269913694", owner: "u-robby" },
  { id: "86dwkak8j", name: "Create CAM colour notes for CompanyCam", status: "complete", project: "p-salesforce-general", due: "1749294000000", closed: "1745518452187", owner: "u-robby" },
  { id: "86dwg9uku", name: "Lifetime value of client", status: "complete", project: "p-salesforce-general", due: "1749207600000", closed: "1749747929101", owner: "u-robby" },
  { id: "86dwuvr2c", name: "Job costing update", status: "complete", project: "p-salesforce-general", due: "1749808800000", closed: "1747940108461", owner: "u-robby", priority: "normal" },
  { id: "86dwhn9xd", name: "NPS into Salesforce", status: "complete", project: "p-salesforce-general", due: "1746476100000", closed: "1747065663050", owner: "u-robby" },
  { id: "86dwjf9rk", name: "Get NPS in Salesforce — landing formula and score formula", status: "complete", project: "p-salesforce-general", due: "1745233200000", closed: "1746210766416", owner: "u-robby" },
  { id: "86dwjhgxb", name: "Built on Process Builder — needs moving before end of year", status: "complete", project: "p-salesforce-general", closed: "1745421922220" },
  { id: "86dwj7g8k", name: "Add final project price to the ready-to-schedule email", status: "complete", project: "p-salesforce-general", due: "1745488800000", closed: "1745421922220", owner: "u-robby" },
  { id: "86dwgn3rb", name: "Build SF 7-day closing report", status: "complete", project: "p-salesforce-general", due: "1744711200000", closed: "1744739603638", owner: "u-robby" },
  { id: "86dwgxy89", name: "Opportunities 2 field", status: "complete", project: "p-salesforce-general", due: "1744711200000", closed: "1744740939587", owner: "u-robby" },
  { id: "86duf2kft", name: "Enter cabinet job fields", status: "complete", project: "p-salesforce-general", due: "1724670000000", closed: "1728331798097" },

  // Exterior BART
  { id: "86dzbzh8p", name: "Update material prices for interior and exterior", status: "complete", project: "p-bart-exterior", due: "1768996800000", closed: "1769197141210", owner: "u-robby" },
];

function epoch(value?: string): string | null {
  if (!value) return null;
  const ms = Number(value);
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null;
}

const TASK_STATUS: Record<string, Task["status"]> = {
  "to do": "todo",
  planning: "todo",
  "in progress": "in_progress",
  blocked: "blocked",
  review: "review",
  complete: "done",
  completed: "done",
  "not doing": "done",
};

export const MOCK_TASKS: Task[] = CAPTURED_TASKS.map((task, index) => ({
  id: `tk-cu-${task.id}`,
  projectId: task.project,
  parentTaskId: null,
  milestoneId: null,
  title: task.name,
  description: "",
  ownerId: task.owner ?? null,
  status: TASK_STATUS[task.status] ?? "todo",
  priority: task.priority === "urgent" || task.priority === "high" ? "high" : "normal",
  dueDate: epoch(task.due),
  estimatedHours: null,
  actualHours: null,
  dependsOnTaskIds: [],
  createdAt: epoch(task.due) ?? daysAgo(120),
  updatedAt: epoch(task.closed) ?? epoch(task.due) ?? daysAgo(120),
  order: index + 1,
}));

/* -------------------------------------------------------------------------- */
/* Projects                                                                   */
/* -------------------------------------------------------------------------- */

type ProjectSeed = Partial<Project> &
  Pick<Project, "id" | "slug" | "name" | "status" | "ownerId" | "targetDate" | "initiative">;

/** Progress follows completed tasks wherever real tasks exist. */
function progressFor(projectId: string, fallback: number): number {
  const tasks = MOCK_TASKS.filter((t) => t.projectId === projectId);
  if (tasks.length === 0) return fallback;
  const done = tasks.filter((t) => TASK_STATUS_META[t.status].done).length;
  return Math.round((done / tasks.length) * 100);
}

function project(seed: ProjectSeed): Project {
  return {
    description: "",
    businessGoal: "",
    expectedImpact: "",
    contributorIds: [],
    health: "on_track",
    healthNote: null,
    priority: "normal",
    startDate: daysAgo(120),
    completedAt: null,
    progress: progressFor(seed.id, 0),
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
    createdAt: daysAgo(160),
    updatedAt: daysAgo(4),
    ...seed,
    // Applied after the spread so an explicit progress still wins.
    ...(seed.progress === undefined ? { progress: progressFor(seed.id, 0) } : {}),
  };
}

export const MOCK_PROJECTS: Project[] = [
  project({
    id: "p-fabric-elt",
    slug: "elt-of-sf-data-in-microsoft-fabric",
    name: "ELT of SF Data in Microsoft Fabric",
    description:
      "Move Salesforce data into Fabric through a governed bronze/silver/gold pipeline so reporting stops reading the CRM directly.",
    businessGoal:
      "One set of numbers the whole company trusts, instead of scorecards that break whenever a Salesforce field is renamed.",
    status: "in_progress",
    health: "on_track",
    ownerId: "u-jonathan",
    contributorIds: ["u-robby", "u-michael"],
    priority: "critical",
    startDate: daysAgo(210),
    targetDate: onDay(60),
    systemIds: ["sys-fabric", "sys-salesforce", "sys-power-bi"],
    tags: ["analytics", "data-platform"],
    initiative: "One Source of Truth",
  }),
  project({
    id: "p-scorecards",
    slug: "scorecards",
    name: "Scorecards",
    description:
      "The CAM, SDR, EST, PM and Cabinet scorecards, plus the commission calculator behind them.",
    businessGoal:
      "Every manager can see their team's real numbers without asking for them.",
    status: "in_progress",
    health: "at_risk",
    healthNote:
      "Scorecards are the single most common source of tickets — breakages are reported most weeks. They read Salesforce and Sheets directly, so they will keep breaking until they move onto the Fabric models.",
    ownerId: "u-robby",
    contributorIds: ["u-jonathan"],
    priority: "high",
    startDate: daysAgo(400),
    targetDate: onDay(90),
    systemIds: ["sys-looker", "sys-salesforce", "sys-google-workspace"],
    tags: ["reporting", "scorecards"],
    dependsOnProjectIds: ["p-fabric-elt"],
    initiative: "One Source of Truth",
  }),
  project({
    id: "p-cabinet-scheduling",
    slug: "cabinet-scheduling",
    name: "Cabinet Scheduling",
    description:
      "A dedicated Opportunity record type, push tools and PM load charts for the cabinet side of the business.",
    businessGoal:
      "Cabinet jobs stop being squeezed into a process built for painting.",
    status: "planning",
    health: "on_track",
    ownerId: "u-robby",
    priority: "normal",
    startDate: daysAgo(90),
    targetDate: onDay(75),
    systemIds: ["sys-salesforce", "sys-google-workspace"],
    tags: ["cabinets", "scheduling"],
    initiative: "Cabinet Business",
  }),
  project({
    id: "p-salesforce-general",
    slug: "salesforce-general",
    name: "Salesforce General",
    description:
      "The standing queue of Salesforce configuration work: fields, reports, profiles and automation cleanup.",
    businessGoal:
      "Keep the CRM matching how the business actually runs, rather than how it ran two years ago.",
    status: "in_progress",
    health: "on_track",
    ownerId: "u-robby",
    priority: "normal",
    startDate: daysAgo(500),
    targetDate: onDay(120),
    systemIds: ["sys-salesforce"],
    tags: ["salesforce", "maintenance"],
    initiative: "Keep the Lights On",
  }),
  project({
    id: "p-bart-exterior",
    slug: "exterior-bart",
    name: "Exterior BART",
    description:
      "Pricing and formula work on the exterior estimating workbook, currently version 3.3.",
    businessGoal:
      "An estimator can price an exterior accurately from the driveway without the sheet fighting them.",
    status: "in_progress",
    health: "blocked",
    healthNote:
      "3.3 is in circulation while 3.2 copies are still live, and copies are currently carrying fixed receipt totals into other people's sheets. Most Production tickets are BART copy requests — the volume is the real problem.",
    ownerId: "u-robby",
    contributorIds: ["u-michael"],
    priority: "critical",
    startDate: daysAgo(300),
    targetDate: onDay(30),
    systemIds: ["sys-bart", "sys-salesforce", "sys-google-workspace"],
    tags: ["pricing", "estimating"],
    initiative: "Field Enablement",
  }),
  project({
    id: "p-spotio-launch",
    slug: "spotio-launch",
    name: "Spotio Launch",
    description:
      "Rolling SPOTIO out to the SDR team and getting canvassed leads into Salesforce cleanly.",
    businessGoal:
      "Every door knocked becomes a lead somebody can actually call, without duplicates.",
    status: "rollout",
    health: "at_risk",
    healthNote:
      "IFCs are intermittently failing to convert and duplicating whenever a new SDR is added. Live, but not yet reliable.",
    ownerId: "u-robby",
    priority: "high",
    startDate: daysAgo(150),
    targetDate: onDay(20),
    progress: 70,
    systemIds: ["sys-spotio", "sys-zapier", "sys-salesforce"],
    tags: ["sdr", "lead-capture"],
    initiative: "Field Enablement",
  }),
  project({
    id: "p-jotform-companycam",
    slug: "jotforms-to-companycam-checklists",
    name: "Convert Jotforms to CompanyCam Checklists",
    description:
      "Move the PM checklist forms off Jotform and onto CompanyCam, where the photos already live.",
    businessGoal:
      "One place for the job record instead of a form in one system and the photos in another.",
    status: "in_progress",
    health: "on_track",
    ownerId: "u-robby",
    priority: "normal",
    startDate: daysAgo(70),
    targetDate: onDay(55),
    progress: 30,
    systemIds: ["sys-jotform", "sys-companycam"],
    tags: ["process", "field"],
    initiative: "Automate the Manual",
  }),
  project({
    id: "p-leads-accounts-contacts",
    slug: "rework-of-leads-accounts-contacts",
    name: "Rework of Leads, Accounts & Contacts",
    description:
      "Rebuild how leads become accounts and contacts, including duplicate handling on IFC conversion.",
    businessGoal:
      "One record per human being, so follow-up and attribution stop contradicting each other.",
    status: "planning",
    health: "on_track",
    ownerId: "u-robby",
    priority: "high",
    startDate: daysAgo(60),
    targetDate: onDay(100),
    progress: 15,
    systemIds: ["sys-salesforce", "sys-spotio", "sys-zapier"],
    tags: ["data-quality", "duplicates"],
    initiative: "One Source of Truth",
  }),
  project({
    id: "p-job-costing",
    slug: "job-costing-revamp",
    name: "Job Costing Revamp",
    description:
      "A Job Costing object with PM and estimator reasons and notes, and a push back to Salesforce from the costing sheet.",
    businessGoal:
      "Understand where margin is actually lost, by job, without a spreadsheet reconciliation.",
    status: "in_progress",
    health: "on_track",
    ownerId: "u-robby",
    contributorIds: ["u-jonathan"],
    priority: "high",
    startDate: daysAgo(120),
    targetDate: onDay(45),
    progress: 45,
    systemIds: ["sys-salesforce", "sys-google-workspace"],
    tags: ["margin", "reporting"],
    initiative: "One Source of Truth",
  }),
  project({
    id: "p-holiday-lights",
    slug: "holiday-light-dashboard",
    name: "Holiday Light Dashboard",
    description: "Reporting for the Holiday Lights season, ahead of the October ramp.",
    businessGoal: "Run the seasonal business on the same reporting as everything else.",
    status: "backlog",
    health: "on_track",
    ownerId: "u-jonathan",
    priority: "normal",
    startDate: onDay(20),
    targetDate: onDay(70),
    progress: 0,
    systemIds: ["sys-looker", "sys-salesforce"],
    tags: ["seasonal", "reporting"],
    initiative: "Seasonal Business",
  }),
  project({
    id: "p-sherwin-bot",
    slug: "sherwin-williams-material-bot",
    name: "Sherwin Williams Material Bot",
    description: "Automate material ordering and pricing against the Sherwin Williams catalogue.",
    businessGoal: "Stop re-keying material orders and stop pricing drifting from the supplier.",
    status: "idea",
    health: "on_track",
    ownerId: "u-michael",
    priority: "normal",
    startDate: onDay(45),
    targetDate: onDay(150),
    progress: 0,
    systemIds: ["sys-salesforce", "sys-bart"],
    tags: ["materials", "automation"],
    initiative: "Automate the Manual",
  }),
  project({
    id: "p-command-center",
    slug: "tech-command-center",
    name: "Tech Command Center",
    description:
      "The internal application the Tech Department runs on: tickets, projects, systems, documentation and the map of how they connect.",
    businessGoal:
      "Retire the Slack-to-ClickUp duplication and give the department one place to answer what needs attention.",
    expectedImpact:
      "Replaces ClickUp for technology work and gives leadership a real view of what Tech is delivering.",
    status: "in_progress",
    health: "on_track",
    ownerId: "u-robby",
    contributorIds: ["u-michael"],
    priority: "high",
    startDate: daysAgo(4),
    targetDate: onDay(80),
    progress: 30,
    estimatedHoursSavedMonthly: 24,
    systemIds: ["sys-slack", "sys-estimator-portal"],
    tags: ["internal-tools", "strategic"],
    initiative: "Department Operating System",
  }),
];

/* -------------------------------------------------------------------------- */
/* Milestones                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * ClickUp has no concept of a milestone, so none were imported.
 *
 * The only project with milestones is the Command Center itself, because that
 * plan genuinely exists. Inventing phases for the other projects would be
 * putting words in somebody's mouth — the Milestones tab shows an empty state
 * instead, which is also the honest argument for the feature.
 */
export const MOCK_MILESTONES: Milestone[] = [
  {
    id: "m-tcc-1",
    projectId: "p-command-center",
    name: "V1 on real data",
    description:
      "Application built, with people, systems, projects and tickets imported from ClickUp.",
    targetDate: onDay(0),
    completedAt: null,
    status: "in_progress",
    order: 1,
  },
  {
    id: "m-tcc-2",
    projectId: "p-command-center",
    name: "Postgres behind the data layer",
    description:
      "Sevalla Postgres replaces the mock provider so work is shared rather than per-browser.",
    targetDate: onDay(21),
    completedAt: null,
    status: "not_started",
    order: 2,
  },
  {
    id: "m-tcc-3",
    projectId: "p-command-center",
    name: "Authentication",
    description: "Company SSO replaces the mocked current user.",
    targetDate: onDay(35),
    completedAt: null,
    status: "not_started",
    order: 3,
  },
  {
    id: "m-tcc-4",
    projectId: "p-command-center",
    name: "Live intake",
    description:
      "The Slack request form writes here directly instead of into ClickUp.",
    targetDate: onDay(56),
    completedAt: null,
    status: "not_started",
    order: 4,
  },
  {
    id: "m-tcc-5",
    projectId: "p-command-center",
    name: "Department pilot",
    description: "Two weeks of technology work run here with ClickUp closed.",
    targetDate: onDay(80),
    completedAt: null,
    status: "not_started",
    order: 5,
  },
];
