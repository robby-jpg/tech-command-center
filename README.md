# Tech Command Center

**Kind Home Solutions — Technology Department**

The internal application the Tech Department runs on. It exists to answer five
questions the moment you open it:

1. What needs our attention right now?
2. What tickets are we handling?
3. What are we building?
4. How healthy are the company's systems?
5. What impact is the Tech Department having on the company?

Today technology work is scattered across Slack, ClickUp, Salesforce, Power BI,
Microsoft Fabric, Zapier and a dozen other places. A request can start in Slack,
get duplicated into ClickUp by an automation, and be discussed in a third place.
This application is the beginning of collapsing that into one.

> **V1 status.** Everything runs on a realistic mock dataset. No external API is
> required, or even configured — the application is fully usable with zero
> credentials. Every control operates on real state: statuses change, cards drag,
> comments post, diagrams save. What is *not* here is a database and real
> integrations, and the architecture is arranged so those slot in behind an
> existing boundary rather than being retrofitted through the UI.

---

## Table of contents

- [Running it](#running-it)
- [What is in it](#what-is-in-it)
- [Architecture](#architecture)
- [The data layer](#the-data-layer)
- [Mock data strategy](#mock-data-strategy)
- [Design system](#design-system)
- [Decisions worth knowing about](#decisions-worth-knowing-about)
- [Routes](#routes)
- [Environment variables](#environment-variables)
- [Future PostgreSQL](#future-postgresql)
- [Future integrations](#future-integrations)
- [Deployment to Sevalla](#deployment-to-sevalla)
- [Recommended next phase](#recommended-next-phase)

---

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>. No `.env` file is needed — the application
starts on the mock provider by default.

```bash
npm run build     # production build
npm run start     # serve the production build
npm run lint      # eslint
npx tsc --noEmit  # typecheck
```

Requires Node 20 or newer.

---

## What is in it

| Area | What it does |
| --- | --- |
| **Command Center** | Morning view. KPIs, a prioritised attention queue, a combined ticket-and-task work queue, active projects, business impact, ticket trend, system health and recent activity. |
| **Tickets** | Table, Kanban and analytics views. Filter by status, priority, category, system, department, assignee, SLA state and age. Sorting, column visibility, pagination, row selection and bulk actions. Full detail page with conversation, activity trail, SLA and related work. |
| **Projects** | Portfolio, list, Kanban, timeline and calendar. Detail workspace with overview, tasks, milestones, tickets, documentation and activity. |
| **Roadmap** | Current quarter, next quarter or the year, grouped by stage, quarter, initiative, owner or system. |
| **Systems** | Catalogue of the estate with health, criticality, ownership and counts. Detail pages carry integrations, tickets, projects, documentation, diagrams and change history. |
| **System Map** | Interactive React Flow map of how everything connects. Pan, zoom, rearrange, add connections, filter, and trace what breaks downstream of any system. |
| **Diagrams** | Architecture, workflow, troubleshooting and data-flow diagrams. Create, rename, duplicate, delete, add and connect nodes; nodes can link to real systems and reflect their live health. |
| **Knowledge Base** | Markdown articles with categories, related systems, projects, diagrams and the tickets that prompted them. |
| **Analytics** | Support performance, delivery performance, and business impact — deeper than the overview, not a repeat of it. |
| **Activity** | The department-wide audit stream, filterable by type, person and significance. |
| **Settings** | Ticket configuration, SLA rules, project configuration, systems, team, integrations and the local dataset. |

Global search (`Cmd/Ctrl + K`) covers tickets, projects, systems, documentation
and diagrams. `C` opens quick-create; `/` opens search.

---

## Architecture

```
src/
  domain/          What technology work at Kind Home IS.
                   Types, Zod schemas, display metadata, SLA evaluation and
                   business-hours arithmetic. Depends on nothing but Zod —
                   no React, no data source, no rendering.

  lib/
    data/          The seam. A DataSource interface, a mock implementation,
                   and the service functions everything above calls.
      types.ts       DataSource contract + WorkspaceSnapshot
      mock/          The fixtures
      mock-source.ts The mock implementation
      index.ts       getTickets(), getProject(), searchEverything(), …
    selectors.ts   Pure derivations over a snapshot: metrics, attention queue,
                   work queue, analytics, blast radius. Shared by server pages
                   and the client store, so both agree by construction.
    store/         Client-side working set with typed mutations.
    search.ts      Cross-entity search, pure over a snapshot.
    markdown.tsx   Small Markdown renderer that emits React elements.
    format.ts      Dates, durations and numbers, timezone-pinned.

  components/
    ui/            Radix primitives, hand-rolled against the token file.
    shared/        Badges, indicators, metric cards, filters, empty states.
    app/           Sidebar, header, command palette, quick-create.
    <feature>/     One folder per area of the product.

  app/             Routes. Server components that fetch through the data layer.
```

The dependency direction is strictly one way: `app` → `components` → `lib` →
`domain`. Nothing in `domain` knows React exists, and no component anywhere
imports a mock array.

### Server and client

The root layout is a server component. It reads the entire working set once
through the data layer and hands it to a client provider. Feature views are
client components that read from that provider, which is what makes every
interaction immediate — changing a status, dragging a card, filtering a table
and moving a node all update without a round trip, and the command palette
searches on every keystroke with nothing to wait for.

This is a deliberate V1 trade. The whole dataset is a few thousand small
records, so holding it client-side is cheap and buys a great deal of
responsiveness. It is also the thing to revisit first at scale: the granular
methods on `DataSource` already exist as the seam for pushing filtering down
into SQL, and detail routes (`/tickets/[id]`, `/projects/[id]`) already resolve
their own records server-side.

---

## The data layer

Every read goes through `src/lib/data`:

```ts
import { getTickets, getSystemGraph, searchEverything } from "@/lib/data";
```

Behind those functions sits a `DataSource`:

```ts
interface DataSource {
  readonly name: string;
  getSnapshot(): Promise<WorkspaceSnapshot>;
  getTickets(query?: TicketQuery): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | null>;
  getProjects(): Promise<Project[]>;
  getSystemGraph(): Promise<SystemGraph>;
  searchEverything(query: string, limit?: number): Promise<SearchResult[]>;
  // …
}
```

The provider is chosen by `DATA_SOURCE` and resolved in exactly one place. Today
only `mock` exists; asking for anything else fails loudly with a message that
says what is available rather than silently falling back.

Two properties this buys:

- **No component knows where data comes from.** Swapping in Postgres is an
  implementation change, not a refactor.
- **`src/lib/data/index.ts` imports `server-only`.** A mistaken import from a
  client component fails at build time rather than shipping the dataset — and
  eventually a connection string — to the browser.

Writes go through the client store (`src/lib/store/workspace-store.tsx`). Each
mutation is already shaped like the server action that will replace it; when the
database arrives, each becomes an optimistic update followed by a request and
the calling components do not change.

---

## Mock data strategy

The dataset describes one coherent moment in a real technology department:

- 16 systems and 18 mapped integrations, including the real paths — SalesRabbit
  → Zapier → Salesforce, Salesforce → Fabric → Power BI, website → Zapier →
  Salesforce.
- ~250 tickets: 17 open and hand-written, plus 90 days of closed work generated
  from a pool of realistic request shapes so the analytics have something honest
  to draw.
- 21 projects across active, backlog and completed, with tasks, milestones,
  dependencies and impact figures.
- 6 diagrams, 10 knowledge articles, and an audit stream derived from all of it.

Two decisions are load-bearing:

**The dataset is anchored to a fixed instant** (`src/lib/data/mock/now.ts`)
rather than reading the wall clock. Relative timestamps render on the server and
again in the browser; if either side read the real time they would disagree and
React would report a hydration mismatch. Anchoring removes the whole class of
bug, and keeps the sample coherent — a ticket described as 43 minutes from
breaching still says that tomorrow. Every module reads the time through the data
layer, so a live provider returns the real clock from the same place.

**Generation is seeded.** The historical tail uses a seeded PRNG, so the same
dataset is produced on every render on every machine — which is the other half
of keeping server and client markup identical.

Formatting is pinned to `America/Denver` for the same reason: a server running
in UTC and a browser in Colorado must produce identical strings.

---

## Design system

Every colour, radius and shadow resolves to a variable in
`src/app/globals.css`. Nothing downstream carries a hex value, so revising the
brand means editing one file.

Values come from the Kind Home brand system:

| Token | Hex | Role here |
| --- | --- | --- |
| Ink Navy | `#0B217A` | Primary text, headings, primary buttons, UI chrome |
| KHP Teal | `#1CB8A7` | Active navigation, links, progress, focus rings |
| Stone / Mist | `#E4E6ED` / `#F1F4F8` | Surfaces and table headers |
| Snow | `#FBFAF8` | Page background — never pure white |
| Coral | `#F06F4D` | **Deliberately unused.** See below. |

**Coral is absent from the interface on purpose.** The brand reserves it for the
single primary CTA on a *conversion* surface — a landing page, a form. This is
internal operations software with no conversion action, so using Coral here
would weaken the rule everywhere it actually matters. It remains defined as a
token.

Severity colours keep their conventional meanings — red critical, orange risk,
green healthy, blue informational — and are never reassigned to brand duty.
Greys are navy-tinted rather than neutral so the interface reads as one family.

Typography is **DM Sans** for the interface and **Fraunces** for the product
identity and page greetings. Fraunces ships with defaults that are wrong for the
brand (`opsz 9`, `WONK 1`); its axes are pinned in `globals.css`, without which
it renders as a visibly different typeface.

The type scale tops out early and the workhorse size is 13px. This is software
people work in all day, not a marketing page.

---

## Decisions worth knowing about

**SLA runs on business time.** Targets stated in business hours are compared on
a business-hours clock (Mon–Fri, 09:00–17:00 MT). A ticket raised at 4pm Friday
and resolved at 9am Monday consumed one business hour, not sixty-five. Critical
is the exception and runs on the wall clock — when work has stopped, the fact
that it is the evening does not make the outage less urgent. The clock also
pauses while a ticket is *Waiting on Requester*, because counting that time
against the department measures the requester's response rather than the team's.
Resolved tickets are judged once and then stop moving; they are never reported
as still breaching. See `src/domain/business-hours.ts` and `src/domain/sla.ts`.

**Severity is earned.** The attention queue admits critical tickets, overdue
work, blocked items, systems that are not operational, and SLA pressure *only on
high or critical tickets*. A Normal ticket drifting past a three-day target is a
backlog problem, not an interrupt, and it appears in Backlog Aging instead.
Without that rule the section filled with routine ageing and stopped meaning
anything.

**Project health is set by a person, never derived from progress.** A project
can be 80% complete and completely stuck. Progress and health are shown together
and answer different questions.

**Impact counts shipped work only.** A project's estimated hours saved
contribute nothing to department totals until it completes, and a measured
figure replaces the estimate once there is one. The method is deliberately
conservative; the point is to make the department legible as an investment, not
to produce an audited number.

**Markdown renders to React elements, never HTML.** `src/lib/markdown.tsx`
builds elements directly and never touches `dangerouslySetInnerHTML`, so article
content cannot inject markup or script. That matters before articles become
editable by people outside the department, not after.

**Systems reference credentials, never store them.** A `System` record holds the
*name* of the environment variable holding its credentials. The value stays in
the server environment.

---

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Command Center |
| `/tickets` | Table, Kanban, analytics |
| `/tickets/[id]` | Ticket detail |
| `/projects` | Portfolio, list, Kanban, timeline, calendar |
| `/projects/[id]` | Project workspace |
| `/roadmap` | Technology roadmap |
| `/systems` | Systems catalogue |
| `/systems/[slug]` | System detail |
| `/system-map` | Interactive estate map |
| `/diagrams` | Diagram library |
| `/diagrams/[id]` | Diagram editor |
| `/knowledge` | Knowledge base |
| `/knowledge/[slug]` | Article |
| `/analytics` | Support, delivery and business impact |
| `/activity` | Audit stream |
| `/settings` | Configuration |

`/tickets` accepts `status`, `priority`, `category`, `system` and `assignee` as
comma-separated query parameters, which is how the Command Center KPIs link
through with a filter already applied.

---

## Environment variables

Copy `.env.example` to `.env.local`. **Nothing is required to run V1.**

| Variable | Purpose |
| --- | --- |
| `DATA_SOURCE` | `mock` (default). `postgres` once that provider exists. |
| `DATABASE_URL` | Sevalla-hosted PostgreSQL, later. |

`.env.example` also documents the credential variables each future integration
will use. None are read today; they are named so the Integrations screen can
report configured/not-configured and so the names are settled in advance.

None of them may be prefixed `NEXT_PUBLIC_` — that would ship the secret to the
browser.

---

## Future PostgreSQL

`prisma/schema.prisma` contains the full intended schema. It is not wired up:
nothing in the application imports Prisma today. It exists so the shape can be
reviewed before the provider is written.

Only objects this department owns are modelled — tickets, comments, activity,
projects, tasks, milestones, diagrams, articles, relationships and internal
configuration. Salesforce, Power BI, Fabric and Zapier stay their own source of
truth. The one deliberate exception is `System`, which is a local *catalogue* of
external systems, not a copy of anything inside them.

To bring it up:

1. Provision PostgreSQL on Sevalla and set `DATABASE_URL`.
2. `npx prisma migrate dev --name init`
3. Seed from the mock fixtures — they are already domain-shaped.
4. Add `PostgresDataSource implements DataSource` and register it in
   `src/lib/data/index.ts`.
5. Set `DATA_SOURCE=postgres`.

No component changes.

---

## Future integrations

Each becomes an adapter composed behind `DataSource` rather than a parallel
access path, so a page never learns where a record physically lives.

| System | First useful thing |
| --- | --- |
| **Slack** | Ticket intake from the Tech channel, plus a one-time import of historical requests. |
| **Zapier** | Zap failure counts feeding system health directly — this would have raised KHT-1094 before a person noticed. |
| **Microsoft Fabric** | Pipeline run history, so a late refresh raises itself. |
| **Power BI** | Dataset and report refresh monitoring. |
| **Salesforce** | User directory and automation status, read-only to begin with. |
| **Google Workspace** | Identity, and the directory behind onboarding and offboarding. |
| **ClickUp** | One-time historical import. Not an ongoing sync. |
| **Department portals** | Sales, Project Consultant and Production submitting into the same queue, distinguished by `source`. |

---

## Deployment to Sevalla

Standard Next.js build. Set `DATA_SOURCE` (and `DATABASE_URL` once the Postgres
provider exists) in the Sevalla environment, then:

```bash
npm ci && npm run build && npm run start
```

The application is not indexable (`robots: noindex`) since it is internal.

---

## Recommended next phase

In order:

1. **Postgres behind the data layer.** The largest single unlock: work stops
   being per-browser and becomes shared. The seam already exists.
2. **Authentication.** `getCurrentUser()` in `src/lib/data/index.ts` is the only
   place that decides who the user is. Company SSO replaces it there.
3. **Zapier and Fabric health adapters.** The two highest-value reads: both feed
   system health directly, and both currently rely on somebody noticing.
4. **Slack intake, then the ClickUp import.** Together these retire the
   duplication the department is living with today.
5. **Department portals.** Ticket creation already carries a `source`, so a
   portal is a new writer against an existing model rather than a new system.

Deliberately deferred: mobile, role-based permissions, notification and email
infrastructure, and anything customer-facing.

---

**Kind Home Solutions** · Technology Department · V1
