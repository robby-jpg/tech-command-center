"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_SERIES } from "@/domain";
import { cn } from "@/lib/utils";

/**
 * Chart primitives.
 *
 * Every chart in the application is built from these so that axes, gridlines,
 * tooltips and colour ordering stay identical across pages. Series colours come
 * from the token file; nothing here carries a hex value.
 */

const AXIS = {
  stroke: "var(--color-line)",
  tick: { fill: "var(--color-fg-subtle)", fontSize: 10 },
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({
  active,
  payload,
  label,
  valueSuffix,
  labelFormatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string; dataKey?: string }[];
  label?: string | number;
  valueSuffix?: string;
  labelFormatter?: (label: string | number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-line bg-surface px-2.5 py-2 shadow-lg">
      {label != null && (
        <p className="mb-1 text-2xs font-medium text-fg">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <ul className="space-y-0.5">
        {payload.map((entry, index) => (
          <li key={index} className="flex items-center gap-2 text-2xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-fg-muted capitalize">{entry.name ?? entry.dataKey}</span>
            <span className="tabular ml-auto font-medium text-fg">
              {entry.value}
              {valueSuffix}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Created vs resolved                                                        */
/* -------------------------------------------------------------------------- */

export function VolumeChart({
  data,
  height = 190,
}: {
  data: { label: string; created: number; resolved: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
        <defs>
          <linearGradient id="tcc-created" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-navy-500)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--color-navy-500)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="tcc-resolved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-teal-500)" stopOpacity={0.24} />
            <stop offset="100%" stopColor="var(--color-teal-500)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
        <XAxis dataKey="label" {...AXIS} minTickGap={18} />
        <YAxis {...AXIS} width={44} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-line-strong)" }} />
        <Legend
          verticalAlign="top"
          align="right"
          height={24}
          iconType="circle"
          iconSize={7}
          formatter={(value) => (
            <span className="text-2xs text-fg-muted capitalize">{value}</span>
          )}
        />
        <Area
          type="monotone"
          dataKey="created"
          name="Created"
          stroke="var(--color-navy-500)"
          strokeWidth={1.8}
          fill="url(#tcc-created)"
        />
        <Area
          type="monotone"
          dataKey="resolved"
          name="Resolved"
          stroke="var(--color-teal-500)"
          strokeWidth={1.8}
          fill="url(#tcc-resolved)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------------------------------- */
/* Distribution — a labelled bar list, not a pie                              */
/* -------------------------------------------------------------------------- */

/**
 * A horizontal bar list reads more accurately than a pie for this kind of
 * breakdown, and it leaves room for the label and the figure side by side.
 */
export function DistributionList({
  data,
  max = 6,
  valueLabel,
  onSelect,
  className,
}: {
  data: { key: string; label: string; value: number; share: number }[];
  max?: number;
  valueLabel?: (item: { value: number; share: number }) => string;
  onSelect?: (key: string) => void;
  className?: string;
}) {
  const shown = data.slice(0, max);
  const rest = data.slice(max);
  const otherValue = rest.reduce((sum, d) => sum + d.value, 0);
  const otherShare = rest.reduce((sum, d) => sum + d.share, 0);

  const rows = [
    ...shown,
    ...(rest.length > 0
      ? [{ key: "__other", label: "Other", value: otherValue, share: otherShare }]
      : []),
  ];

  return (
    <ul className={cn("space-y-2", className)}>
      {rows.map((item, index) => {
        const Row = onSelect && item.key !== "__other" ? "button" : "div";
        return (
          <li key={item.key}>
            <Row
              {...(Row === "button"
                ? { type: "button" as const, onClick: () => onSelect?.(item.key) }
                : {})}
              className={cn(
                "block w-full text-left",
                Row === "button" && "cursor-pointer rounded-sm",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs text-fg-body">{item.label}</span>
                <span className="tabular shrink-0 text-xs font-medium text-fg">
                  {valueLabel
                    ? valueLabel(item)
                    : `${item.share.toFixed(0)}%`}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.max(item.share, 1.5)}%`,
                    background:
                      item.key === "__other"
                        ? "var(--color-line-strong)"
                        : CHART_SERIES[index % CHART_SERIES.length],
                  }}
                />
              </div>
            </Row>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Bars                                                                       */
/* -------------------------------------------------------------------------- */

export function SimpleBarChart({
  data,
  dataKey = "value",
  height = 180,
  color = "var(--color-navy-500)",
  horizontal = false,
  valueSuffix,
}: {
  data: { label: string; value: number }[];
  dataKey?: string;
  height?: number;
  color?: string;
  horizontal?: boolean;
  valueSuffix?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 6, right: 10, bottom: 0, left: horizontal ? 8 : -22 }}
      >
        <CartesianGrid stroke="var(--color-line-soft)" vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" {...AXIS} allowDecimals={false} />
            <YAxis type="category" dataKey="label" {...AXIS} width={78} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" {...AXIS} minTickGap={10} />
            <YAxis {...AXIS} width={44} allowDecimals={false} />
          </>
        )}
        <Tooltip
          content={<ChartTooltip valueSuffix={valueSuffix} />}
          cursor={{ fill: "var(--color-subtle)" }}
        />
        <Bar dataKey={dataKey} fill={color} radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]} maxBarSize={horizontal ? 16 : 34} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoricalBarChart({
  data,
  height = 180,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
        <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
        <XAxis dataKey="label" {...AXIS} interval={0} />
        <YAxis {...AXIS} width={44} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-subtle)" }} />
        <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={44}>
          {data.map((_, index) => (
            <Cell key={index} fill={CHART_SERIES[index % CHART_SERIES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------------------------------- */
/* Lines and areas                                                            */
/* -------------------------------------------------------------------------- */

export function TrendLine({
  data,
  dataKey = "value",
  height = 170,
  color = "var(--color-teal-500)",
  valueSuffix,
}: {
  data: Record<string, string | number>[];
  dataKey?: string;
  height?: number;
  color?: string;
  valueSuffix?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -22 }}>
        <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
        <XAxis dataKey="label" {...AXIS} minTickGap={16} />
        <YAxis {...AXIS} width={44} />
        <Tooltip
          content={<ChartTooltip valueSuffix={valueSuffix} />}
          cursor={{ stroke: "var(--color-line-strong)" }}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.9}
          dot={{ r: 2, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 3.5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** The impact-over-time visual: small, calm, cumulative. */
export function ImpactArea({
  data,
  height = 96,
}: {
  data: { label: string; hours: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="tcc-impact" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-teal-500)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-teal-500)" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" {...AXIS} height={16} />
        <Tooltip
          content={<ChartTooltip valueSuffix=" hrs/mo" />}
          cursor={{ stroke: "var(--color-line-strong)" }}
        />
        <Area
          type="monotone"
          dataKey="hours"
          name="Saved"
          stroke="var(--color-teal-500)"
          strokeWidth={1.8}
          fill="url(#tcc-impact)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------------------------------------------------- */
/* Donut — used once, for delivery performance                                */
/* -------------------------------------------------------------------------- */

export function DonutChart({
  data,
  height = 170,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number }[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            stroke="var(--color-surface)"
            strokeWidth={2}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={CHART_SERIES[index % CHART_SERIES.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {centerValue && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-xl font-semibold text-fg">{centerValue}</span>
          {centerLabel && <span className="text-2xs text-fg-muted">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}
