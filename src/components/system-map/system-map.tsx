"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  ArrowRight,
  Focus,
  Maximize2,
  Network,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  CONNECTION_METHOD_META,
  CONNECTION_METHOD_ORDER,
  SYSTEM_CRITICALITY_META,
  SYSTEM_CRITICALITY_ORDER,
  SYSTEM_HEALTH_META,
  SYSTEM_HEALTH_ORDER,
  SYSTEM_KIND_META,
  SYSTEM_KIND_ORDER,
  type ConnectionMethod,
  type TechSystem,
} from "@/domain";
import { blastRadius, systemSummary } from "@/lib/selectors";
import { useActions, useSnapshot } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  Separator,
} from "@/components/ui/primitives";
import { FacetFilter, SearchInput } from "@/components/shared/filter-bar";
import { CriticalityBadge, HealthIndicator, UserChip } from "@/components/shared/indicators";
import { KindIcon } from "@/components/systems/systems-page";
import { useChrome } from "@/components/app/app-chrome";

/* -------------------------------------------------------------------------- */
/* Node                                                                       */
/* -------------------------------------------------------------------------- */

type SystemNodeData = {
  system: TechSystem;
  openTickets: number;
  dimmed: boolean;
  highlighted: boolean;
};

function SystemNode({ data, selected }: NodeProps<Node<SystemNodeData>>) {
  const { system, openTickets, dimmed, highlighted } = data;
  const health = SYSTEM_HEALTH_META[system.health];

  return (
    <div
      className={cn(
        "w-44 rounded-lg border bg-surface px-2.5 py-2 shadow-sm transition-all duration-150",
        selected
          ? "border-teal-500 ring-2 ring-teal-500/25"
          : system.health === "operational"
            ? "border-line"
            : "border-warning-border",
        highlighted && !selected && "border-navy-400 ring-2 ring-navy-400/20",
        dimmed && "opacity-25",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !border-2 !bg-navy-300"
      />

      <div className="flex items-start gap-2">
        <span
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-md",
            system.health === "operational" ? "bg-subtle" : "bg-warning-bg",
          )}
        >
          <KindIcon
            name={SYSTEM_KIND_META[system.kind].icon}
            className={cn(
              "size-3.5",
              system.health === "operational" ? "text-fg-muted" : "text-warning",
            )}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] leading-4 font-semibold text-fg">
            {system.shortName}
          </p>
          <p className="truncate text-[9px] leading-3 text-fg-subtle">
            {SYSTEM_KIND_META[system.kind].label}
          </p>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-1 border-t border-line-soft pt-1.5">
        <span className="flex items-center gap-1">
          <Dot
            tone={health.tone}
            className="size-1.5"
            pulse={system.health === "outage" || system.health === "partial_outage"}
          />
          <span className="text-[9px] text-fg-muted">{health.label}</span>
        </span>
        {openTickets > 0 && (
          <span className="tabular rounded-full bg-subtle px-1 text-[9px] font-semibold text-fg-muted">
            {openTickets}
          </span>
        )}
        {system.criticality === "critical" && (
          <span className="size-1.5 rounded-full bg-critical" title="Business critical" />
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!size-2 !border-2 !bg-navy-300"
      />
    </div>
  );
}

const nodeTypes = { system: SystemNode };

/* -------------------------------------------------------------------------- */
/* Map                                                                        */
/* -------------------------------------------------------------------------- */

export function SystemMapPage() {
  return (
    <ReactFlowProvider>
      <SystemMapInner />
    </ReactFlowProvider>
  );
}

function SystemMapInner() {
  const snapshot = useSnapshot();
  const actions = useActions();
  const router = useRouter();
  const { fitView } = useReactFlow();
  const { openQuickCreate } = useChrome();

  const [selectedSystemId, setSelectedSystemId] = React.useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [kindFilter, setKindFilter] = React.useState<string[]>([]);
  const [healthFilter, setHealthFilter] = React.useState<string[]>([]);
  const [criticalityFilter, setCriticalityFilter] = React.useState<string[]>([]);
  const [traceFrom, setTraceFrom] = React.useState<string | null>(null);

  const openTicketCount = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ticket of snapshot.tickets) {
      if (ticket.status === "resolved") continue;
      for (const id of ticket.relatedSystemIds) counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }, [snapshot.tickets]);

  /** Systems downstream of the traced node, so an outage can be walked. */
  const traced = React.useMemo(() => {
    if (!traceFrom) return null;
    const ids = new Set(blastRadius(snapshot, traceFrom).map((s) => s.id));
    ids.add(traceFrom);
    return ids;
  }, [snapshot, traceFrom]);

  const matchesFilters = React.useCallback(
    (system: TechSystem) => {
      const q = search.trim().toLowerCase();
      if (kindFilter.length && !kindFilter.includes(system.kind)) return false;
      if (healthFilter.length && !healthFilter.includes(system.health)) return false;
      if (criticalityFilter.length && !criticalityFilter.includes(system.criticality))
        return false;
      if (q && !`${system.name} ${system.shortName} ${system.tags.join(" ")}`.toLowerCase().includes(q))
        return false;
      return true;
    },
    [search, kindFilter, healthFilter, criticalityFilter],
  );

  const filtersActive =
    search.trim() !== "" ||
    kindFilter.length > 0 ||
    healthFilter.length > 0 ||
    criticalityFilter.length > 0 ||
    traced !== null;

  const nodes: Node<SystemNodeData>[] = React.useMemo(
    () =>
      snapshot.systems.map((system) => {
        const position = snapshot.systemMapLayout[system.id] ?? { x: 0, y: 0 };
        const inFilter = matchesFilters(system);
        const inTrace = traced ? traced.has(system.id) : true;
        const visible = inFilter && inTrace;

        return {
          id: system.id,
          type: "system",
          position,
          selected: system.id === selectedSystemId,
          data: {
            system,
            openTickets: openTicketCount[system.id] ?? 0,
            dimmed: filtersActive && !visible,
            highlighted: traced?.has(system.id) === true && system.id !== traceFrom,
          },
        };
      }),
    [
      snapshot.systems,
      snapshot.systemMapLayout,
      openTicketCount,
      matchesFilters,
      filtersActive,
      traced,
      traceFrom,
      selectedSystemId,
    ],
  );

  const edges: Edge[] = React.useMemo(
    () =>
      snapshot.connections.map((connection) => {
        const method = CONNECTION_METHOD_META[connection.method];
        const unhealthy = connection.health !== "operational";
        const inTrace = traced
          ? traced.has(connection.sourceSystemId) && traced.has(connection.targetSystemId)
          : true;

        return {
          id: connection.id,
          source: connection.sourceSystemId,
          target: connection.targetSystemId,
          label: method.label,
          animated: unhealthy,
          selected: connection.id === selectedEdgeId,
          style: {
            stroke: unhealthy ? "var(--color-warning)" : "var(--color-navy-300)",
            strokeDasharray: method.dashed ? "5 4" : undefined,
            opacity: filtersActive && !inTrace ? 0.12 : 1,
          },
          labelStyle: {
            fontSize: 9,
            fill: "var(--color-fg-subtle)",
            fontWeight: 500,
          },
          labelBgStyle: { fill: "var(--color-canvas)" },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 3,
        };
      }),
    [snapshot.connections, selectedEdgeId, filtersActive, traced],
  );

  // Position changes are written back to the layout so a rearrangement sticks.
  const onNodesChange = React.useCallback(
    (changes: NodeChange<Node<SystemNodeData>>[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position && !change.dragging) {
          actions.moveSystemOnMap(change.id, change.position);
        }
        if (change.type === "select") {
          setSelectedSystemId(change.selected ? change.id : null);
          if (change.selected) setSelectedEdgeId(null);
        }
      }
    },
    [actions],
  );

  const onEdgesChange = React.useCallback((changes: EdgeChange[]) => {
    for (const change of changes) {
      if (change.type === "select") {
        setSelectedEdgeId(change.selected ? change.id : null);
        if (change.selected) setSelectedSystemId(null);
      }
    }
  }, []);

  const onConnect = React.useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      actions.addConnection({
        sourceSystemId: connection.source,
        targetSystemId: connection.target,
        method: "api",
      });
    },
    [actions],
  );

  const selectedSystem = selectedSystemId
    ? snapshot.systems.find((s) => s.id === selectedSystemId)
    : null;
  const selectedConnection = selectedEdgeId
    ? snapshot.connections.find((c) => c.id === selectedEdgeId)
    : null;

  const visibleCount = snapshot.systems.filter(
    (s) => matchesFilters(s) && (!traced || traced.has(s.id)),
  ).length;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Find a system…"
          className="w-56"
        />
        <FacetFilter
          label="Type"
          selected={kindFilter}
          onChange={setKindFilter}
          options={SYSTEM_KIND_ORDER.map((k) => ({
            value: k,
            label: SYSTEM_KIND_META[k].label,
            count: snapshot.systems.filter((s) => s.kind === k).length,
          }))}
        />
        <FacetFilter
          label="Health"
          selected={healthFilter}
          onChange={setHealthFilter}
          options={SYSTEM_HEALTH_ORDER.map((h) => ({
            value: h,
            label: SYSTEM_HEALTH_META[h].label,
            count: snapshot.systems.filter((s) => s.health === h).length,
          }))}
        />
        <FacetFilter
          label="Criticality"
          selected={criticalityFilter}
          onChange={setCriticalityFilter}
          options={SYSTEM_CRITICALITY_ORDER.map((c) => ({
            value: c,
            label: SYSTEM_CRITICALITY_META[c].label,
            count: snapshot.systems.filter((s) => s.criticality === c).length,
          }))}
        />

        {filtersActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setKindFilter([]);
              setHealthFilter([]);
              setCriticalityFilter([]);
              setTraceFrom(null);
            }}
          >
            <X />
            Reset
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-2xs text-fg-subtle">
            {visibleCount} of {snapshot.systems.length} shown
          </span>
          <Separator orientation="vertical" className="h-4" />
          <Button variant="secondary" size="sm" onClick={() => fitView({ duration: 350 })}>
            <Maximize2 />
            Fit
          </Button>
          <Button variant="primary" size="sm" onClick={() => openQuickCreate("system")}>
            <Plus />
            Add system
          </Button>
        </div>
      </div>

      {traceFrom && (
        <div className="flex items-center gap-2 border-b border-line bg-navy-50 px-4 py-2">
          <Focus className="size-3.5 shrink-0 text-navy-600" />
          <p className="text-xs text-navy-700">
            Showing everything downstream of{" "}
            <strong>
              {snapshot.systems.find((s) => s.id === traceFrom)?.name}
            </strong>{" "}
            — this is what stops working if it fails.
          </p>
          <Button
            variant="ghost"
            size="xs"
            className="ml-auto"
            onClick={() => setTraceFrom(null)}
          >
            Clear
          </Button>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={(_, node) => {
              const system = snapshot.systems.find((s) => s.id === node.id);
              if (system) router.push(`/systems/${system.slug}`);
            }}
            onPaneClick={() => {
              setSelectedSystemId(null);
              setSelectedEdgeId(null);
            }}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.25}
            maxZoom={1.8}
            proOptions={{ hideAttribution: true }}
            className="bg-canvas"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1}
              color="var(--color-line-strong)"
            />
            <Controls showInteractive={false} className="!shadow-sm" />
            <MiniMap
              pannable
              zoomable
              className="!rounded-md !border !border-line !bg-surface"
              maskColor="rgb(11 33 122 / 0.06)"
              nodeColor={(node) => {
                const system = (node.data as SystemNodeData)?.system;
                if (!system) return "var(--color-navy-200)";
                return system.health === "operational"
                  ? "var(--color-navy-200)"
                  : "var(--color-warning)";
              }}
            />
          </ReactFlow>
        </div>

        {/* Side panel */}
        {(selectedSystem || selectedConnection) && (
          <aside className="scrollbar-slim w-80 shrink-0 overflow-y-auto border-l border-line bg-surface">
            {selectedSystem && (
              <SystemPanel
                system={selectedSystem}
                onClose={() => setSelectedSystemId(null)}
                onTrace={() => setTraceFrom(selectedSystem.id)}
              />
            )}
            {selectedConnection && (
              <ConnectionPanel
                connectionId={selectedConnection.id}
                onClose={() => setSelectedEdgeId(null)}
              />
            )}
          </aside>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-t border-line bg-surface px-4 py-2">
        <span className="text-[10px] font-semibold tracking-wide text-fg-subtle uppercase">
          Connections
        </span>
        {CONNECTION_METHOD_ORDER.slice(0, 6).map((method) => (
          <span
            key={method}
            className="flex items-center gap-1.5 text-2xs text-fg-muted"
          >
            <svg width="18" height="6" aria-hidden>
              <line
                x1="0"
                y1="3"
                x2="18"
                y2="3"
                stroke="var(--color-navy-300)"
                strokeWidth="1.6"
                strokeDasharray={CONNECTION_METHOD_META[method].dashed ? "4 3" : undefined}
              />
            </svg>
            {CONNECTION_METHOD_META[method].label}
          </span>
        ))}
        <span className="ml-auto text-2xs text-fg-subtle">
          Drag to rearrange · drag a handle to connect · double-click to open
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Panels                                                                     */
/* -------------------------------------------------------------------------- */

function SystemPanel({
  system,
  onClose,
  onTrace,
}: {
  system: TechSystem;
  onClose: () => void;
  onTrace: () => void;
}) {
  const snapshot = useSnapshot();
  const summary = React.useMemo(
    () => systemSummary(snapshot, system.id),
    [snapshot, system.id],
  );
  if (!summary) return null;

  const connected = [...summary.upstream, ...summary.downstream];

  return (
    <div>
      <header className="flex items-start justify-between gap-2 border-b border-line-soft px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-fg">{system.name}</h2>
          <p className="text-2xs text-fg-subtle">{SYSTEM_KIND_META[system.kind].label}</p>
        </div>
        <Button variant="ghost" size="iconXs" onClick={onClose} aria-label="Close panel">
          <X />
        </Button>
      </header>

      <div className="space-y-3 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <HealthIndicator health={system.health} note={system.healthNote} />
          <CriticalityBadge criticality={system.criticality} />
        </div>

        <p className="text-xs leading-5 text-fg-muted">{system.description}</p>

        <div className="flex items-center gap-2">
          <UserChip user={summary.owner} muted />
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-md border border-line bg-subtle px-2 py-2 text-center">
          <div>
            <p className="tabular text-sm font-semibold text-fg">
              {summary.openTickets.length}
            </p>
            <p className="text-[10px] text-fg-subtle">Open tickets</p>
          </div>
          <div>
            <p className="tabular text-sm font-semibold text-fg">
              {summary.activeProjects.length}
            </p>
            <p className="text-[10px] text-fg-subtle">Projects</p>
          </div>
          <div>
            <p className="tabular text-sm font-semibold text-fg">{connected.length}</p>
            <p className="text-[10px] text-fg-subtle">Connections</p>
          </div>
        </div>

        <Button variant="secondary" size="sm" className="w-full" onClick={onTrace}>
          <Focus />
          Trace what depends on this
        </Button>

        {connected.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-fg-subtle uppercase">
              Connected systems
            </p>
            <ul className="space-y-1">
              {summary.upstream.map(({ connection, system: other }) => (
                <li key={connection.id} className="flex items-center gap-1.5 text-xs">
                  <span className="truncate text-fg-body">{other.shortName}</span>
                  <ArrowRight className="size-3 shrink-0 text-fg-subtle" />
                  <span className="shrink-0 text-fg-subtle">{system.shortName}</span>
                  <Badge
                    tone={CONNECTION_METHOD_META[connection.method].tone}
                    className="ml-auto"
                  >
                    {CONNECTION_METHOD_META[connection.method].label}
                  </Badge>
                </li>
              ))}
              {summary.downstream.map(({ connection, system: other }) => (
                <li key={connection.id} className="flex items-center gap-1.5 text-xs">
                  <span className="shrink-0 text-fg-subtle">{system.shortName}</span>
                  <ArrowRight className="size-3 shrink-0 text-fg-subtle" />
                  <span className="truncate text-fg-body">{other.shortName}</span>
                  <Badge
                    tone={CONNECTION_METHOD_META[connection.method].tone}
                    className="ml-auto"
                  >
                    {CONNECTION_METHOD_META[connection.method].label}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.openTickets.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-fg-subtle uppercase">
              Open tickets
            </p>
            <ul className="space-y-0.5">
              {summary.openTickets.slice(0, 4).map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="block rounded-sm px-1.5 py-1 transition-colors hover:bg-subtle"
                  >
                    <span className="block truncate text-xs text-fg">{ticket.title}</span>
                    <span className="text-[10px] text-fg-subtle">
                      {ticket.ticketNumber}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button variant="primary" size="sm" className="w-full" asChild>
          <Link href={`/systems/${system.slug}`}>Open system detail</Link>
        </Button>
      </div>
    </div>
  );
}

function ConnectionPanel({
  connectionId,
  onClose,
}: {
  connectionId: string;
  onClose: () => void;
}) {
  const snapshot = useSnapshot();
  const actions = useActions();
  const connection = snapshot.connections.find((c) => c.id === connectionId);
  if (!connection) return null;

  const source = snapshot.systems.find((s) => s.id === connection.sourceSystemId);
  const target = snapshot.systems.find((s) => s.id === connection.targetSystemId);

  return (
    <div>
      <header className="flex items-start justify-between gap-2 border-b border-line-soft px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-fg">Connection</h2>
          <p className="truncate text-2xs text-fg-subtle">
            {source?.shortName} → {target?.shortName}
          </p>
        </div>
        <Button variant="ghost" size="iconXs" onClick={onClose} aria-label="Close panel">
          <X />
        </Button>
      </header>

      <div className="space-y-3 px-4 py-3">
        <div>
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-fg-subtle uppercase">
            Method
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="w-full justify-between">
                {CONNECTION_METHOD_META[connection.method].label}
                <Plus className="rotate-45" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Change method</DropdownMenuLabel>
              {CONNECTION_METHOD_ORDER.map((method) => (
                <DropdownMenuItem
                  key={method}
                  onSelect={() =>
                    actions.updateConnection(connection.id, {
                      method: method as ConnectionMethod,
                    })
                  }
                >
                  {CONNECTION_METHOD_META[method].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <dl className="space-y-2 text-xs">
          <div>
            <dt className="text-[10px] text-fg-subtle">Data transferred</dt>
            <dd className="text-fg-body">{connection.dataDescription}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-fg-subtle">Frequency</dt>
            <dd className="text-fg-body">{connection.frequency}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-fg-subtle">Direction</dt>
            <dd className="text-fg-body">
              {connection.direction === "bidirectional" ? "Two-way" : "One-way"}
            </dd>
          </div>
          {connection.description && (
            <div>
              <dt className="text-[10px] text-fg-subtle">Notes</dt>
              <dd className="leading-5 text-fg-body">{connection.description}</dd>
            </div>
          )}
          <div>
            <dt className="text-[10px] text-fg-subtle">Health</dt>
            <dd>
              <HealthIndicator health={connection.health} />
            </dd>
          </div>
        </dl>

        <Separator />

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-critical hover:bg-critical-bg"
          onClick={() => {
            actions.deleteConnection(connection.id);
            onClose();
          }}
        >
          <Trash2 />
          Remove connection
        </Button>
      </div>
    </div>
  );
}

export { Network };
