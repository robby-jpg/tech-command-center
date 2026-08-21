import type { KnowledgeArticle } from "@/domain";
import { daysAgo } from "./now";

type ArticleSeed = Partial<KnowledgeArticle> &
  Pick<KnowledgeArticle, "id" | "slug" | "title" | "summary" | "content" | "category" | "authorId">;

function article(seed: ArticleSeed): KnowledgeArticle {
  return {
    tags: [],
    relatedSystemIds: [],
    relatedProjectIds: [],
    relatedDiagramIds: [],
    relatedTicketIds: [],
    createdAt: daysAgo(120),
    updatedAt: daysAgo(30),
    views: 0,
    ...seed,
  };
}

export const MOCK_ARTICLES: KnowledgeArticle[] = [
  article({
    id: "kb-salesforce-user-setup",
    slug: "salesforce-user-setup",
    title: "Salesforce User Setup",
    summary:
      "What a new Project Consultant needs in Salesforce, in the order it has to be granted.",
    category: "salesforce",
    authorId: "u-alexis",
    tags: ["onboarding", "access", "permissions"],
    relatedSystemIds: ["sys-salesforce", "sys-google-workspace"],
    relatedTicketIds: ["t-1084", "t-1076"],
    createdAt: daysAgo(210),
    updatedAt: daysAgo(11),
    views: 184,
    content: `A new user is not usable until all four of these exist. Granting them out of order produces confusing errors, so work down the list.

## 1. The Google Workspace account

Salesforce federates against Workspace. Create the account first, in the right organisational unit — the OU decides whether passkey enrolment is offered.

## 2. The Salesforce user record

Create the user with:

- **Profile** — Standard Platform User for most roles.
- **Role** — this drives record visibility up the hierarchy. Getting it wrong means a manager cannot see their own team.
- **Licence** — check availability before promising a start date. We have been short before.

## 3. The permission set

Profiles handle the baseline. Everything specific comes from a permission set:

| Role | Permission set |
| --- | --- |
| Project Consultant | Estimator Read/Write |
| Sales Manager | Estimator Read/Write, Team Reporting |
| Production | Production Job Access |
| Finance | Finance Read, Invoice Export |

**Estimator Read/Write** includes Task edit. That was added deliberately so consultants can log follow-ups from the estimator portal — do not strip it.

## 4. Territory

Territory decides which records the user sees through sharing rules. Denver Metro and South Denver have different rules, so confirm which one before finishing. If nobody can tell you, stop and ask rather than guessing — a wrong territory is worse than a delayed start.

## Offboarding

Reverse in the same order. See [Offboarding Checklist](/knowledge/offboarding-checklist).`,
  }),
  article({
    id: "kb-salesforce-mfa",
    slug: "salesforce-mfa-troubleshooting",
    title: "Salesforce MFA Troubleshooting",
    summary:
      "Why a passkey works in the browser but not the mobile app, and what to do about each failure mode.",
    category: "troubleshooting",
    authorId: "u-alexis",
    tags: ["mfa", "passkey", "mobile", "access"],
    relatedSystemIds: ["sys-salesforce", "sys-google-workspace"],
    relatedTicketIds: ["t-1092", "t-1077"],
    relatedDiagramIds: ["dg-signin-troubleshooting"],
    createdAt: daysAgo(160),
    updatedAt: daysAgo(1),
    views: 312,
    content: `Most MFA tickets are one of four things. Work through them in this order.

## The passkey works in Safari but not in the app

This is the common one and it is **not** a broken passkey.

A passkey is bound to a domain. Enrolling through the browser binds it to the Salesforce web domain; the mobile app presents its own associated domain. The app therefore does not see a credential, falls back to a password prompt, and then rejects the password because the org requires a second factor.

**Fix:** re-enrol from inside the mobile app. The user ends up with two passkeys, which is expected and correct.

## No MFA prompt appears at all

Check whether the user is being caught by a trusted-network exemption. If they are on the office network the prompt may legitimately be skipped. Ask them to try from a mobile connection before assuming a fault.

## The authenticator app is on a lost phone

Reset the factor from Setup → Users → the user → **Disconnect** the authenticator. Then have them re-enrol with a passkey rather than an authenticator app — it is faster to recover and does not depend on a device they might replace again.

Always regenerate recovery codes afterwards and confirm the user has stored them somewhere that is not the phone.

## Google sign-in fails first

If Workspace itself will not authenticate, nothing downstream will. Stop troubleshooting Salesforce and fix the Workspace account.

> A user who is locked out is losing selling time. If you cannot resolve it within about fifteen minutes, reset the factor and re-enrol properly afterwards rather than continuing to diagnose.`,
  }),
  article({
    id: "kb-fabric-architecture",
    slug: "fabric-data-architecture",
    title: "Fabric Data Architecture",
    summary:
      "The layers inside Microsoft Fabric, what belongs in each, and why reports never read raw tables.",
    category: "architecture",
    authorId: "u-jonathan",
    tags: ["fabric", "lakehouse", "semantic-model", "standards"],
    relatedSystemIds: ["sys-fabric", "sys-salesforce", "sys-power-bi"],
    relatedProjectIds: ["p-fabric-migration"],
    relatedDiagramIds: ["dg-salesforce-to-powerbi"],
    relatedTicketIds: ["t-1069", "t-1089"],
    createdAt: daysAgo(95),
    updatedAt: daysAgo(6),
    views: 141,
    content: `Three layers, each with one job.

## Bronze — raw

Salesforce extracts land here untouched. No renaming, no filtering, no business logic. If the bronze layer disagrees with Salesforce, the extract is broken and that is the only thing bronze can be wrong about.

Refreshed nightly at 02:00 MT via the Bulk API.

## Silver — conformed

Cleansing, de-duplication and conformed keys. This is where a customer who exists twice becomes one customer, and where the difference between a Lead and a Contact is reconciled.

## Gold — semantic models

What Power BI actually reads. Three models today:

- **Sales** — leads, opportunities, closing ratio, speed to close.
- **Production** — jobs, crews, schedule adherence.
- **Employee** — consultants, territory, tenure.

## Why reports never read bronze

A measure defined inside a report is invisible to everyone else, so two reports drift apart and nobody can say which is right. A measure defined in a model changes every report at once. That is the entire reason the layer exists.

If somebody asks for a report that needs a new measure, the measure goes in the model.

## The open question on the Employee model

A consultant who changes territory mid-year is either one row or two:

- **One row** keeps a person's history together, and territory reporting becomes approximate.
- **Two rows** makes territory reporting correct, and splits an individual's numbers across the year.

This is a business decision. It is tracked on KHT-1069 and it is currently blocking the model.`,
  }),
  article({
    id: "kb-powerbi-refresh",
    slug: "power-bi-refresh-troubleshooting",
    title: "Power BI Refresh Troubleshooting",
    summary:
      "A report showing yesterday's numbers is almost never a Power BI fault. Where to actually look.",
    category: "power_bi",
    authorId: "u-jonathan",
    tags: ["refresh", "troubleshooting", "stale-data"],
    relatedSystemIds: ["sys-power-bi", "sys-fabric"],
    relatedTicketIds: ["t-1091", "t-1089"],
    relatedDiagramIds: ["dg-salesforce-to-powerbi"],
    createdAt: daysAgo(140),
    updatedAt: daysAgo(2),
    views: 227,
    content: `## Start at the end of the chain, not the beginning

When somebody reports stale numbers, the instinct is to open Power BI. That is the wrong end. Power BI reads a live connection to a Fabric model — if the model has not been refreshed, the report is faithfully showing old data and there is nothing to fix in Power BI.

Work backwards:

1. **Did the Fabric refresh complete?** Check the pipeline run history for the model behind the report.
2. **Did the Salesforce extract complete?** A refresh that ran against an incomplete extract will finish successfully and still be wrong.
3. **Is the model in the right capacity window?** Two heavy refreshes competing for the same capacity is the usual cause of a late finish.
4. **Only then** look at the report itself.

## The current known issue

Since Tuesday the Employee model has been finishing 40–90 minutes late. Everything downstream is correct but stale first thing in the morning. Tracked on KHT-1089; the Employee refresh has been moved to its own capacity window.

## What to tell the person who reported it

Say plainly that the number is late rather than wrong, and give them the time it will be correct. People plan around a straight answer; they cannot plan around "looking into it".`,
  }),
  article({
    id: "kb-powerbi-standards",
    slug: "power-bi-data-model-standards",
    title: "Power BI Data Model Standards",
    summary:
      "Naming, measures and the rule that keeps two reports from disagreeing about the same number.",
    category: "power_bi",
    authorId: "u-jonathan",
    tags: ["standards", "modelling", "measures"],
    relatedSystemIds: ["sys-power-bi", "sys-fabric"],
    relatedProjectIds: ["p-exec-reporting", "p-fabric-migration"],
    createdAt: daysAgo(120),
    updatedAt: daysAgo(16),
    views: 98,
    content: `## The one rule

**Measures live in the model, never in the report.** Everything else here is detail.

## Naming

- Tables are singular and business-facing: \`Opportunity\`, not \`sf_opportunity_c\`.
- Measures read as English: \`Closing Ratio\`, \`Speed to Close (days)\`.
- Anything that is a count says so: \`Estimates Booked\`, not \`Estimates\`.

## Counting things that arrive more than once

Several source systems emit an event per lifecycle stage rather than per thing. Apptoto is the clearest example: one appointment produces a booked event, a confirmed event and a reminded event.

A naive count of Apptoto events overstates booked estimates by roughly three times. Every measure over an event stream must state which event it counts.

## Dates

One date table, marked as the date table, related to everything. Fiscal columns live alongside calendar columns rather than in a second table.

## Row-level security

Applied on the Employee model by role. A sales manager sees their own team. Test with three accounts — a manager, a consultant and an administrator — before publishing, every time.`,
  }),
  article({
    id: "kb-leads-into-salesforce",
    slug: "how-leads-enter-salesforce",
    title: "How Leads Enter Salesforce",
    summary:
      "Five front doors, one destination, and the failure mode that used to lose leads silently.",
    category: "integrations",
    authorId: "u-robby",
    tags: ["leads", "zapier", "attribution"],
    relatedSystemIds: [
      "sys-websites",
      "sys-salesrabbit",
      "sys-jotform",
      "sys-aircall",
      "sys-hubspot",
      "sys-zapier",
      "sys-salesforce",
    ],
    relatedDiagramIds: ["dg-lead-capture"],
    relatedTicketIds: ["t-1090", "t-1094"],
    createdAt: daysAgo(100),
    updatedAt: daysAgo(2),
    views: 203,
    content: `Leads reach Salesforce five ways. Four of them pass through Zapier, which is why a single Zapier connection problem can stop most of the funnel at once.

| Source | Route | Notes |
| --- | --- | --- |
| Website form | Framer → Zapier webhook → Salesforce | Highest volume |
| SalesRabbit | Automation → Zapier → Salesforce | Canvassing |
| Jotform | Webhook → Zapier → Salesforce | Warranty, sign-off |
| Aircall | Direct API | Does not touch Zapier |
| HubSpot | Two-way sync every 15 minutes | Source of duplicates |

## The failure that used to lose leads

The Salesforce create step required a campaign id. When a new landing page went live without one, Zapier treated the missing field as a **skipped step** rather than an error — so nothing failed, nothing alerted, and the lead simply never existed.

It was found because a customer rang to ask why nobody had called them back.

**Now:** a fallback campaign is applied when the id is absent, so a missing value can never silently drop a lead. Any new form must still send a campaign id; the fallback is a safety net, not a substitute.

## Before you change a zap

Check whether it shares a Salesforce connection with the others. Re-authorising one connection affects every zap using it — which is exactly what happened on KHT-1094.`,
  }),
  article({
    id: "kb-zapier-standards",
    slug: "zapier-integration-standards",
    title: "Zapier Integration Standards",
    summary:
      "How to build a zap that fails loudly, and the naming that makes 86 of them navigable.",
    category: "zapier",
    authorId: "u-robby",
    tags: ["zapier", "standards", "automation", "monitoring"],
    relatedSystemIds: ["sys-zapier"],
    relatedTicketIds: ["t-1094", "t-1078"],
    createdAt: daysAgo(150),
    updatedAt: daysAgo(9),
    views: 167,
    content: `There are roughly 86 zaps in production. They are navigable only because they follow these rules.

## Naming

\`[Source] → [Destination] — [what it does]\`

For example: \`SalesRabbit → Salesforce — create lead\`. Anyone can then find every zap touching a system by searching its name.

## Fail loudly

The default Zapier behaviour on a missing field is to skip the step. **Silent skips are the single biggest cause of lost data at Kind Home.** Every zap must either:

- supply a fallback so the step cannot skip, or
- raise an explicit error so the failure appears in the task history.

A zap that can quietly do nothing is worse than no zap.

## Route errors somewhere a human looks

Every production zap sends failures to the shared error path, which posts to the Tech channel and opens a ticket. A zap whose failures land in an inbox nobody watches is how six warranty claims sat unread for a week.

## Shared connections

Zaps share authenticated connections per app. Re-authorising a connection touches every zap using it, so:

- check what else uses the connection before re-authorising,
- confirm the new token carries every scope the old one had.

A rotated Salesforce connector missing the Lead create scope is exactly how KHT-1094 happened.

## Before deleting a zap

Turn it off and leave it for two weeks. Deleting removes the task history, which is often the only record of how something used to work.`,
  }),
  article({
    id: "kb-bart-overview",
    slug: "bart-architecture-overview",
    title: "BART Architecture Overview",
    summary:
      "What BART is, where the pricing logic lives, and what to be careful about when changing it.",
    category: "architecture",
    authorId: "u-michael",
    tags: ["bart", "pricing", "internal"],
    relatedSystemIds: ["sys-bart", "sys-salesforce"],
    relatedProjectIds: ["p-bart-improvements"],
    relatedDiagramIds: ["dg-estimate-lifecycle"],
    relatedTicketIds: ["t-1087"],
    createdAt: daysAgo(180),
    updatedAt: daysAgo(4),
    views: 129,
    content: `BART turns a measured scope into a priced proposal. It is the point where a walkthrough becomes a number, which makes it one of the few systems where a bug has a direct financial consequence.

## Shape

- A consultant opens the opportunity from Salesforce; BART reads it by id.
- Surfaces are measured and entered, elevation by elevation.
- The pricing engine applies rates, minimums and modifiers.
- The total is written back to the Salesforce opportunity.
- PandaDoc generates the customer-facing proposal from Salesforce, not from BART.

## Where pricing lives

All of it is in the engine, none of it in the interface. If a number looks wrong, it is a rate table or a rule — not a display problem.

## The rounding rule

Square footage rounds **per elevation**, not per surface. A house with eight surfaces across four elevations rounds four times, not eight.

Rounding per surface overstated totals on complex exteriors, which is what KHT-1087 was. The correction is in testing against six recent bids before it goes out.

## Changing pricing

Two rules, both learned the hard way:

1. **Never change a rate without a dated record of what it was.** Re-quoting a job from last month has to be possible.
2. **Verify against real historical bids**, not invented ones. Edge cases in this domain are almost always real houses, not hypotheticals.`,
  }),
  article({
    id: "kb-offboarding-checklist",
    slug: "offboarding-checklist",
    title: "Offboarding Checklist",
    summary:
      "Every system a departing employee touches, in the order access should be removed.",
    category: "accounts_access",
    authorId: "u-alexis",
    tags: ["offboarding", "security", "access", "checklist"],
    relatedSystemIds: ["sys-google-workspace", "sys-salesforce", "sys-companycam"],
    relatedProjectIds: ["p-done-onboarding"],
    relatedTicketIds: ["t-1076"],
    createdAt: daysAgo(190),
    updatedAt: daysAgo(41),
    views: 156,
    content: `Order matters. Suspending Workspace first cuts federated access to several systems at once, which buys time for the rest.

1. **Google Workspace** — suspend, do not delete. Deleting destroys mail and file ownership. Transfer the drive to their manager.
2. **Salesforce** — deactivate the user, then reassign open opportunities and tasks. Deactivating without reassigning orphans live work.
3. **SalesRabbit** — remove from territory, or their leads become unassignable.
4. **CompanyCam** — remove from the company; photos stay with the projects.
5. **Aircall** — release the extension so the number can be reused.
6. **PandaDoc / Power BI / Fabric** — remove from workspaces.
7. **Hardware** — collect, wipe, and record the asset as returned.

## Same day, not next week

Access removal is same-day for a departure of any kind. If a manager asks to keep an account live "for a few days to catch stray emails", set up forwarding instead — that is a supported request and does not leave a signed-in account behind.

## What to record on the ticket

The systems removed, who reassigned the Salesforce records, and where the hardware went. This is the trail that gets checked if something surfaces months later.`,
  }),
  article({
    id: "kb-hardware-provisioning",
    slug: "hardware-provisioning",
    title: "Hardware Provisioning",
    summary: "What we buy, how it is imaged, and what to do with the machine coming back.",
    category: "hardware",
    authorId: "u-alexis",
    tags: ["hardware", "procurement", "imaging"],
    relatedTicketIds: ["t-1074", "t-1096"],
    createdAt: daysAgo(170),
    updatedAt: daysAgo(52),
    views: 74,
    content: `## Standard builds

| Role | Machine | Notes |
| --- | --- | --- |
| Project Consultant | 14" laptop, 16 GB | Field use — a rugged case is not optional |
| Production / PM | 14" laptop, 16 GB, dock | Usually a second monitor too |
| Office / Finance | 14" laptop, 16 GB, dock, dual monitors | |
| Tech | 16" laptop, 32 GB | |

Order the dock at the same time as the laptop. A machine with one USB-C port and no dock is not a working setup, and ordering it separately adds a week.

## Imaging

Enrol in device management **before** handing it over. A machine that reaches a user unenrolled tends to stay unenrolled.

## Machines coming back

Wipe, then record the asset as returned on the offboarding ticket. Hold serviceable machines as spares rather than disposing of them — a same-day replacement for a failed laptop is worth more than the resale value.`,
  }),
];
