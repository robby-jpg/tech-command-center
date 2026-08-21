"use client";

import * as React from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { DEPARTMENTS, PROJECT_STATUS_META } from "@/domain";
import {
  backlogAging,
  impactMetrics,
  projectAnalytics,
  resolutionTrend,
  ticketAnalytics,
  ticketVolumeSeries,
  ticketsByDepartment,
  ticketsByPriority,
  ticketsBySystem,
} from "@/lib/selectors";
import { useSnapshot } from "@/lib/store/workspace-store";
import { formatHours, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/primitives";
import {
  CategoricalBarChart,
  DistributionList,
  DonutChart,
  ImpactArea,
  SimpleBarChart,
  TrendLine,
  VolumeChart,
} from "@/components/charts/charts";
import { MetricCard, StatTile } from "@/components/shared/metric-card";
import { PageBody } from "@/components/shared/page";
import { UserAvatar } from "@/components/shared/indicators";

export function AnalyticsPage() {
  const [range, setRange] = React.useState("30");

  return (
    <PageBody>
      <Tabs defaultValue="tickets" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="tickets">Support</TabsTrigger>
            <TabsTrigger value="projects">Delivery</TabsTrigger>
            <TabsTrigger value="impact">Business Impact</TabsTrigger>
          </TabsList>

          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v)}
            aria-label="Date range"
          >
            <ToggleGroupItem value="7">7 days</ToggleGroupItem>
            <ToggleGroupItem value="30">30 days</ToggleGroupItem>
            <ToggleGroupItem value="90">90 days</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <TabsContent value="tickets">
          <SupportAnalytics days={Number(range)} />
        </TabsContent>
        <TabsContent value="projects">
          <DeliveryAnalytics />
        </TabsContent>
        <TabsContent value="impact">
          <ImpactAnalytics />
        </TabsContent>
      </Tabs>
    </PageBody>
  );
}

/* ========================================================================== */
/* Support                                                                    */
/* ========================================================================== */

function SupportAnalytics({ days }: { days: number }) {
  const snapshot = useSnapshot();

  const analytics = React.useMemo(() => ticketAnalytics(snapshot, days), [snapshot, days]);
  const volume = React.useMemo(() => ticketVolumeSeries(snapshot, days), [snapshot, days]);
  const bySystem = React.useMemo(() => ticketsBySystem(snapshot, days), [snapshot, days]);
  const byPriority = React.useMemo(() => ticketsByPriority(snapshot, days), [snapshot, days]);
  const byDepartment = React.useMemo(
    () =>
      ticketsByDepartment(snapshot, days).map((d) => ({
        ...d,
        label: DEPARTMENTS[d.key as keyof typeof DEPARTMENTS]?.shortName ?? d.label,
      })),
    [snapshot, days],
  );
  const aging = React.useMemo(() => backlogAging(snapshot), [snapshot]);
  const resolution = React.useMemo(() => resolutionTrend(snapshot, 12), [snapshot]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Created" value={analytics.created} deltaLabel={`Last ${days} days`} />
        <MetricCard
          label="Resolved"
          value={analytics.resolved}
          deltaLabel={`Last ${days} days`}
          icon={CheckCircle2}
        />
        <MetricCard
          label="Backlog"
          value={analytics.backlog}
          deltaLabel={
            analytics.backlogChange === 0
              ? "Created and resolved balanced"
              : `${analytics.backlogChange > 0 ? "+" : "−"}${Math.abs(analytics.backlogChange)} net over the period`
          }
          tone={analytics.backlogChange > 3 ? "warning" : undefined}
        />
        <MetricCard
          label="Avg first response"
          value={Math.round(analytics.avgFirstResponseMinutes)}
          unit="business min"
          icon={Clock}
        />
        <MetricCard
          label="Avg resolution"
          value={analytics.avgResolutionHours.toFixed(1)}
          unit="business hrs"
        />
        <MetricCard
          label="SLA attainment"
          value={formatPercent(analytics.slaAttainment)}
          tone={analytics.slaAttainment < 90 ? "warning" : undefined}
          icon={ShieldCheck}
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Created vs Resolved</CardTitle>
            <p className="mt-0.5 text-xs text-fg-muted">
              When the two lines diverge, the backlog is moving.
            </p>
          </div>
        </CardHeader>
        <div className="p-3">
          <VolumeChart data={volume} height={250} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>By system</CardTitle>
          </CardHeader>
          <div className="p-4">
            <DistributionList
              data={bySystem}
              max={8}
              valueLabel={(item) => `${item.value} · ${item.share.toFixed(0)}%`}
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By department</CardTitle>
            <span className="text-2xs text-fg-subtle">Who is asking</span>
          </CardHeader>
          <div className="p-3">
            <CategoricalBarChart
              data={byDepartment.map((d) => ({ label: d.label, value: d.value }))}
              height={228}
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By priority</CardTitle>
          </CardHeader>
          <div className="p-4">
            <DistributionList
              data={byPriority}
              max={4}
              valueLabel={(item) => `${item.value} · ${item.share.toFixed(0)}%`}
            />
            <p className="mt-4 border-t border-line-soft pt-3 text-[10px] leading-4 text-fg-subtle">
              Critical is reserved for genuine operational impact. If it climbs above a few
              percent, the definition has drifted rather than the world getting worse.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Resolution time trend</CardTitle>
              <p className="mt-0.5 text-xs text-fg-muted">
                Average business hours to resolve, by week.
              </p>
            </div>
          </CardHeader>
          <div className="p-3">
            <TrendLine data={resolution} dataKey="hours" height={210} valueSuffix=" hrs" />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Backlog aging</CardTitle>
              <p className="mt-0.5 text-xs text-fg-muted">
                How long open tickets have been waiting.
              </p>
            </div>
            <span className="tabular text-2xs text-fg-subtle">
              {analytics.backlog} open
            </span>
          </CardHeader>
          <div className="p-3">
            <SimpleBarChart
              data={aging.map((a) => ({ label: a.label, value: a.value }))}
              horizontal
              height={210}
              color="var(--color-warning)"
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Per team member</CardTitle>
            <p className="mt-0.5 text-xs text-fg-muted">
              Load and throughput. A queue that is lopsided is worth a conversation, not a
              scoreboard.
            </p>
          </div>
        </CardHeader>
        <div className="grid grid-cols-2 divide-x divide-line-soft md:grid-cols-4">
          {analytics.perTechMember.map(({ user, open, resolved }) => (
            <div key={user.id} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <UserAvatar user={user} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-fg">{user.name}</p>
                  <p className="truncate text-[10px] text-fg-subtle">{user.title}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-4">
                <div>
                  <p className="tabular text-lg leading-none font-semibold text-fg">
                    {open}
                  </p>
                  <p className="mt-1 text-[10px] text-fg-subtle">Open</p>
                </div>
                <div>
                  <p className="tabular text-lg leading-none font-semibold text-teal-700">
                    {resolved}
                  </p>
                  <p className="mt-1 text-[10px] text-fg-subtle">Resolved</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ========================================================================== */
/* Delivery                                                                   */
/* ========================================================================== */

function DeliveryAnalytics() {
  const snapshot = useSnapshot();
  const analytics = React.useMemo(() => projectAnalytics(snapshot), [snapshot]);

  const delivery = [
    { label: "On time", value: analytics.deliveryPerformance.onTime },
    { label: "Late", value: analytics.deliveryPerformance.late },
  ];
  const totalDelivered =
    analytics.deliveryPerformance.onTime + analytics.deliveryPerformance.late;
  const onTimeRate =
    totalDelivered === 0
      ? 0
      : (analytics.deliveryPerformance.onTime / totalDelivered) * 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Active" value={analytics.active} />
        <MetricCard
          label="Completed this quarter"
          value={analytics.completedThisQuarter}
          icon={CheckCircle2}
        />
        <MetricCard label="On track" value={analytics.onTrack} tone="success" />
        <MetricCard
          label="At risk"
          value={analytics.atRisk}
          tone={analytics.atRisk > 0 ? "warning" : undefined}
        />
        <MetricCard
          label="Blocked"
          value={analytics.blocked}
          tone={analytics.blocked > 0 ? "critical" : undefined}
        />
        <MetricCard
          label="Avg cycle time"
          value={Math.round(analytics.avgCycleTimeDays)}
          unit="days"
          deltaLabel="Start to ship"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Projects completed over time</CardTitle>
              <p className="mt-0.5 text-xs text-fg-muted">
                Delivery cadence, by month.
              </p>
            </div>
          </CardHeader>
          <div className="p-3">
            <SimpleBarChart
              data={analytics.completedOverTime.map((p) => ({
                label: p.label,
                value: p.count,
              }))}
              height={220}
              color="var(--color-teal-500)"
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery performance</CardTitle>
          </CardHeader>
          <div className="p-3">
            <DonutChart
              data={delivery}
              height={190}
              centerValue={formatPercent(onTimeRate)}
              centerLabel="on time"
            />
            <p className="mt-2 px-1 text-[10px] leading-4 text-fg-subtle">
              Measured against the target date set when the project started, not against a
              date revised along the way.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projects by status</CardTitle>
          </CardHeader>
          <div className="p-4">
            <DistributionList
              data={analytics.byStatus}
              max={8}
              valueLabel={(item) => `${item.value}`}
            />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Where the work lands</CardTitle>
              <p className="mt-0.5 text-xs text-fg-muted">
                Projects touching each system.
              </p>
            </div>
          </CardHeader>
          <div className="p-4">
            <DistributionList
              data={analytics.bySystem}
              max={8}
              valueLabel={(item) => `${item.value}`}
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active portfolio health</CardTitle>
        </CardHeader>
        <div className="divide-y divide-line-soft">
          {snapshot.projects
            .filter((p) => PROJECT_STATUS_META[p.status].active)
            .map((project) => (
              <div key={project.id} className="flex items-center gap-4 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm text-fg">
                  {project.name}
                </span>
                <span className="w-40">
                  <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        project.health === "blocked"
                          ? "bg-critical"
                          : project.health === "at_risk"
                            ? "bg-warning"
                            : "bg-teal-500",
                      )}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </span>
                <span className="tabular w-10 text-right text-2xs text-fg-muted">
                  {project.progress}%
                </span>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

/* ========================================================================== */
/* Business impact                                                            */
/* ========================================================================== */

function ImpactAnalytics() {
  const snapshot = useSnapshot();
  const impact = React.useMemo(() => impactMetrics(snapshot), [snapshot]);

  const completed = snapshot.projects
    .filter((p) => p.completedAt)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-teal-200">
        <div className="bg-teal-50/60 px-5 py-4">
          <h2 className="font-display text-xl leading-tight text-fg">
            The Tech Department returned{" "}
            <span className="text-teal-700">{formatHours(impact.hoursSavedMonthly)}</span> a
            month to the business.
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-fg-muted">
            That is roughly {formatNumber(Math.round(impact.hoursSavedAnnual))} hours a year,
            from {impact.manualProcessesEliminated} manual processes removed and{" "}
            {impact.automationsRunning} automations kept running. Only shipped work counts;
            estimates on projects still in flight are excluded.
          </p>
        </div>
        <div className="px-2 pt-3 pb-1">
          <p className="px-3 text-2xs font-semibold tracking-wide text-fg-subtle uppercase">
            Cumulative hours saved per month, as each project landed
          </p>
          <ImpactArea data={impact.trend} height={150} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <MetricCard
          label="Projects shipped"
          value={impact.projectsCompletedThisQuarter}
          deltaLabel="This quarter"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Automations running"
          value={impact.automationsRunning}
          icon={Zap}
        />
        <MetricCard
          label="Hours saved / month"
          value={Math.round(impact.hoursSavedMonthly)}
          tone="brand"
          icon={Clock}
        />
        <MetricCard
          label="Hours saved / year"
          value={formatNumber(Math.round(impact.hoursSavedAnnual))}
          icon={TrendingUp}
        />
        <MetricCard
          label="Manual processes gone"
          value={impact.manualProcessesEliminated}
          icon={Sparkles}
        />
        <MetricCard label="Systems improved" value={impact.systemsImproved} icon={Layers} />
        <MetricCard
          label="Departments helped"
          value={impact.departmentsImpacted}
          icon={Building2}
        />
        <MetricCard label="Major launches" value={impact.majorLaunches} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>What each shipped project gave back</CardTitle>
            <p className="mt-0.5 text-xs text-fg-muted">
              Measured figures where a project has been live long enough to check;
              estimates otherwise.
            </p>
          </div>
        </CardHeader>
        <table className="w-full">
          <thead className="bg-subtle">
            <tr className="border-b border-line">
              {["Project", "Shipped", "Hours / month", "Processes", "Automations", "Departments"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-2xs font-semibold tracking-wide text-fg-muted uppercase"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {completed.map((project) => {
              const measured = project.actualHoursSavedMonthly != null;
              return (
                <tr key={project.id} className="transition-colors hover:bg-subtle">
                  <td className="px-3 py-2 text-sm text-fg">{project.name}</td>
                  <td className="px-3 py-2 text-2xs whitespace-nowrap text-fg-muted">
                    {project.completedAt
                      ? new Date(project.completedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          timeZone: "America/Denver",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "tabular text-sm font-medium",
                        measured ? "text-teal-700" : "text-fg-body",
                      )}
                    >
                      {formatHours(
                        project.actualHoursSavedMonthly ??
                          project.estimatedHoursSavedMonthly,
                      )}
                    </span>
                    <span className="ml-1.5 text-[10px] text-fg-subtle">
                      {measured ? "measured" : "estimated"}
                    </span>
                  </td>
                  <td className="tabular px-3 py-2 text-xs text-fg-body">
                    {project.manualProcessesEliminated || "—"}
                  </td>
                  <td className="tabular px-3 py-2 text-xs text-fg-body">
                    {project.automationsCreated || "—"}
                  </td>
                  <td className="px-3 py-2 text-2xs text-fg-muted">
                    {project.departmentsImpacted.join(", ") || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How these numbers are worked out</CardTitle>
        </CardHeader>
        <div className="space-y-2 px-4 py-3.5 text-xs leading-6 text-fg-muted">
          <p>
            <strong className="text-fg">Hours saved</strong> is estimated per project when it
            is planned, and replaced with a measured figure once it has been live long enough
            to check. Only completed projects contribute — an estimate on work still in flight
            counts for nothing.
          </p>
          <p>
            <strong className="text-fg">Automations running</strong> counts automations this
            department built and maintains, including those inherited before the ticketing
            rollout began.
          </p>
          <p>
            <strong className="text-fg">Manual processes eliminated</strong> means a task
            somebody used to do by hand, on a schedule, that nobody does any more.
          </p>
          <p className="border-t border-line-soft pt-2 text-fg-subtle">
            The method is deliberately conservative rather than precise. The point is to make
            the department legible as an investment, not to produce an audited number.
          </p>
        </div>
      </Card>
    </div>
  );
}

export { StatTile };
