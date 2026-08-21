"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Maximize2,
  Plus,
  Trash2,
  Workflow,
  X,
} from "lucide-react";
import {
  DIAGRAM_NODE_KIND_META,
  DIAGRAM_NODE_KIND_ORDER,
  DIAGRAM_TYPE_META,
  DIAGRAM_TYPE_ORDER,
  type Diagram,
  type DiagramNodeKind,
  type DiagramType,
} from "@/domain";
import { useActions, useSnapshot } from "@/lib/store/workspace-store";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,

  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Separator,
  Textarea,
} from "@/components/ui/primitives";
import { EmptyState } from "@/components/shared/states";
import { diagramNodeTypes, type DiagramNodeData } from "./diagram-nodes";

export function DiagramEditor({ diagramId }: { diagramId: string }) {
  return (
    <ReactFlowProvider>
      <EditorInner diagramId={diagramId} />
    </ReactFlowProvider>
  );
}

function EditorInner({ diagramId }: { diagramId: string }) {
  const snapshot = useSnapshot();
  const actions = useActions();
  const router = useRouter();
  const { fitView, screenToFlowPosition } = useReactFlow();

  const diagram = snapshot.diagrams.find((d) => d.id === diagramId || d.slug === diagramId);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null);

  const nodes: Node<DiagramNodeData>[] = React.useMemo(() => {
    if (!diagram) return [];
    return diagram.nodes.map((node) => {
      const system = node.systemId
        ? snapshot.systems.find((s) => s.id === node.systemId)
        : null;
      return {
        id: node.id,
        type: "diagram",
        position: node.position,
        selected: node.id === selectedNodeId,
        data: {
          kind: node.kind,
          label: node.label,
          description: node.description,
          systemId: node.systemId,
          systemHealthy: system ? system.health === "operational" : true,
        },
      };
    });
  }, [diagram, snapshot.systems, selectedNodeId]);

  const edges: Edge[] = React.useMemo(() => {
    if (!diagram) return [];
    return diagram.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label || undefined,
      selected: edge.id === selectedEdgeId,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      style: {
        stroke: "var(--color-navy-300)",
        strokeDasharray: edge.dashed ? "5 4" : undefined,
      },
      labelStyle: { fontSize: 9, fill: "var(--color-fg-muted)", fontWeight: 500 },
      labelBgStyle: { fill: "var(--color-canvas)" },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 3,
    }));
  }, [diagram, selectedEdgeId]);

  const onNodesChange = React.useCallback(
    (changes: NodeChange<Node<DiagramNodeData>>[]) => {
      if (!diagram) return;
      for (const change of changes) {
        if (change.type === "position" && change.position && !change.dragging) {
          actions.updateDiagramNode(diagram.id, change.id, { position: change.position });
        }
        if (change.type === "select") {
          setSelectedNodeId(change.selected ? change.id : null);
          if (change.selected) setSelectedEdgeId(null);
        }
        if (change.type === "remove") {
          actions.deleteDiagramNode(diagram.id, change.id);
        }
      }
    },
    [actions, diagram],
  );

  const onEdgesChange = React.useCallback(
    (changes: EdgeChange[]) => {
      if (!diagram) return;
      for (const change of changes) {
        if (change.type === "select") {
          setSelectedEdgeId(change.selected ? change.id : null);
          if (change.selected) setSelectedNodeId(null);
        }
        if (change.type === "remove") {
          actions.deleteDiagramEdge(diagram.id, change.id);
        }
      }
    },
    [actions, diagram],
  );

  const onConnect = React.useCallback(
    (connection: Connection) => {
      if (!diagram || !connection.source || !connection.target) return;
      actions.addDiagramEdge(diagram.id, {
        source: connection.source,
        target: connection.target,
        label: "",
        dashed: false,
      });
    },
    [actions, diagram],
  );

  const addNode = React.useCallback(
    (kind: DiagramNodeKind) => {
      if (!diagram) return;
      // Drop new nodes near the middle of what the user is currently looking at.
      const position = screenToFlowPosition({
        x: window.innerWidth / 2 - 120,
        y: window.innerHeight / 2 - 60,
      });
      const id = actions.addDiagramNode(diagram.id, {
        kind,
        label: DIAGRAM_NODE_KIND_META[kind].label,
        description: "",
        position: {
          x: Math.round(position.x + (diagram.nodes.length % 3) * 30),
          y: Math.round(position.y + (diagram.nodes.length % 4) * 24),
        },
        systemId: null,
      });
      setSelectedNodeId(id);
    },
    [actions, diagram, screenToFlowPosition],
  );

  if (!diagram) {
    return (
      <div className="px-6 py-16">
        <EmptyState
          icon={Workflow}
          title="That diagram does not exist."
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href="/diagrams">Back to diagrams</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const selectedNode = diagram.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedEdge = diagram.edges.find((e) => e.id === selectedEdgeId) ?? null;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <Toolbar
        diagram={diagram}
        onAddNode={addNode}
        onFit={() => fitView({ duration: 350 })}
        onDeleted={() => router.push("/diagrams")}
      />

      <div className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={diagramNodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2}
            deleteKeyCode={["Backspace", "Delete"]}
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
          </ReactFlow>
        </div>

        {(selectedNode || selectedEdge) && (
          <aside className="scrollbar-slim w-72 shrink-0 overflow-y-auto border-l border-line bg-surface">
            {selectedNode && (
              <NodeInspector
                diagramId={diagram.id}
                node={selectedNode}
                onClose={() => setSelectedNodeId(null)}
              />
            )}
            {selectedEdge && (
              <EdgeInspector
                diagramId={diagram.id}
                edge={selectedEdge}
                onClose={() => setSelectedEdgeId(null)}
              />
            )}
          </aside>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-2">
        <span className="text-2xs text-fg-subtle">
          {diagram.nodes.length} nodes · {diagram.edges.length} connections · saved
          automatically
        </span>
        <span className="text-2xs text-fg-subtle">
          Drag a handle to connect · Delete removes the selection
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Toolbar                                                                    */
/* -------------------------------------------------------------------------- */

function Toolbar({
  diagram,
  onAddNode,
  onFit,
  onDeleted,
}: {
  diagram: Diagram;
  onAddNode: (kind: DiagramNodeKind) => void;
  onFit: () => void;
  onDeleted: () => void;
}) {
  const actions = useActions();
  const router = useRouter();
  const snapshot = useSnapshot();
  const [renaming, setRenaming] = React.useState(false);
  const [name, setName] = React.useState(diagram.name);

  // Follow the stored name when it changes elsewhere — on duplicate, say —
  // without clobbering what is currently being typed.
  const [lastName, setLastName] = React.useState(diagram.name);
  if (diagram.name !== lastName) {
    setLastName(diagram.name);
    setName(diagram.name);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
      <Link
        href="/diagrams"
        className="inline-flex items-center gap-1 text-2xs font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3" />
        Diagrams
      </Link>

      <Separator orientation="vertical" className="h-4" />

      {renaming ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) actions.saveDiagram(diagram.id, { name: name.trim() });
            setRenaming(false);
          }}
          className="flex items-center gap-1.5"
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-56"
            aria-label="Diagram name"
          />
          <Button type="submit" variant="primary" size="xs">
            <Check />
          </Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setRenaming(true)}
          className="cursor-pointer rounded-sm px-1 py-0.5 text-sm font-semibold text-fg transition-colors hover:bg-subtle"
          title="Rename"
        >
          {diagram.name}
        </button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="xs">
            <Badge tone={DIAGRAM_TYPE_META[diagram.type].tone}>
              {DIAGRAM_TYPE_META[diagram.type].label}
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Diagram type</DropdownMenuLabel>
          {DIAGRAM_TYPE_ORDER.map((type) => (
            <DropdownMenuItem
              key={type}
              onSelect={() => actions.saveDiagram(diagram.id, { type: type as DiagramType })}
              className="flex-col items-start gap-0.5"
            >
              <span className="flex w-full items-center gap-2">
                <span className="font-medium">{DIAGRAM_TYPE_META[type].label}</span>
                {type === diagram.type && (
                  <Check className="ml-auto size-3.5 text-teal-600" />
                )}
              </span>
              <span className="text-[10px] leading-4 text-fg-subtle">
                {DIAGRAM_TYPE_META[type].description}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="text-2xs text-fg-subtle">
        Updated {formatRelative(diagram.updatedAt, snapshot.now)}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="primary" size="sm">
              <Plus />
              Add node
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Node type</DropdownMenuLabel>
            {DIAGRAM_NODE_KIND_ORDER.map((kind) => (
              <DropdownMenuItem key={kind} onSelect={() => onAddNode(kind)}>
                {DIAGRAM_NODE_KIND_META[kind].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="secondary" size="sm" onClick={onFit}>
          <Maximize2 />
          Fit
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="iconSm" aria-label="Diagram actions">
              <Plus className="rotate-45" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                const id = actions.duplicateDiagram(diagram.id);
                router.push(`/diagrams/${id}`);
              }}
            >
              <Copy />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onSelect={() => {
                actions.deleteDiagram(diagram.id);
                onDeleted();
              }}
            >
              <Trash2 />
              Delete diagram
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Inspectors                                                                 */
/* -------------------------------------------------------------------------- */

function NodeInspector({
  diagramId,
  node,
  onClose,
}: {
  diagramId: string;
  node: Diagram["nodes"][number];
  onClose: () => void;
}) {
  const actions = useActions();
  const snapshot = useSnapshot();

  return (
    <div>
      <header className="flex items-center justify-between gap-2 border-b border-line-soft px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">Node</h2>
        <Button variant="ghost" size="iconXs" onClick={onClose} aria-label="Close">
          <X />
        </Button>
      </header>

      <div className="space-y-3 px-4 py-3">
        <div className="space-y-1.5">
          <Label htmlFor="node-label">Label</Label>
          <Input
            id="node-label"
            value={node.label}
            onChange={(e) =>
              actions.updateDiagramNode(diagramId, node.id, { label: e.target.value })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="node-description">Notes</Label>
          <Textarea
            id="node-description"
            rows={3}
            value={node.description}
            placeholder="What happens at this step."
            onChange={(e) =>
              actions.updateDiagramNode(diagramId, node.id, {
                description: e.target.value,
              })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label>Type</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="w-full justify-between">
                {DIAGRAM_NODE_KIND_META[node.kind].label}
                <Plus className="rotate-45" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {DIAGRAM_NODE_KIND_ORDER.map((kind) => (
                <DropdownMenuItem
                  key={kind}
                  onSelect={() =>
                    actions.updateDiagramNode(diagramId, node.id, { kind })
                  }
                >
                  {DIAGRAM_NODE_KIND_META[kind].label}
                  {kind === node.kind && (
                    <Check className="ml-auto size-3.5 text-teal-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Linking a node to a real system is what turns a drawing into part
            of the graph — the node then reflects live health. */}
        <div className="space-y-1.5">
          <Label>Linked system</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="w-full justify-between">
                <span className="truncate">
                  {node.systemId
                    ? (snapshot.systems.find((s) => s.id === node.systemId)?.name ??
                      "Unknown")
                    : "Not linked"}
                </span>
                <Plus className="rotate-45" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-72 w-56 overflow-y-auto"
            >
              <DropdownMenuItem
                onSelect={() =>
                  actions.updateDiagramNode(diagramId, node.id, { systemId: null })
                }
              >
                Not linked
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {snapshot.systems.map((system) => (
                <DropdownMenuItem
                  key={system.id}
                  onSelect={() =>
                    actions.updateDiagramNode(diagramId, node.id, {
                      systemId: system.id,
                      label: node.label || system.shortName,
                    })
                  }
                >
                  {system.name}
                  {system.id === node.systemId && (
                    <Check className="ml-auto size-3.5 text-teal-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {node.systemId && (
            <Link
              href={`/systems/${snapshot.systems.find((s) => s.id === node.systemId)?.slug}`}
              className="block text-[10px] font-medium text-teal-700 hover:underline"
            >
              Open system detail
            </Link>
          )}
        </div>

        <Separator />

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-critical hover:bg-critical-bg"
          onClick={() => {
            actions.deleteDiagramNode(diagramId, node.id);
            onClose();
          }}
        >
          <Trash2 />
          Delete node
        </Button>
      </div>
    </div>
  );
}

function EdgeInspector({
  diagramId,
  edge,
  onClose,
}: {
  diagramId: string;
  edge: Diagram["edges"][number];
  onClose: () => void;
}) {
  const actions = useActions();

  return (
    <div>
      <header className="flex items-center justify-between gap-2 border-b border-line-soft px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">Connection</h2>
        <Button variant="ghost" size="iconXs" onClick={onClose} aria-label="Close">
          <X />
        </Button>
      </header>

      <div className="space-y-3 px-4 py-3">
        <div className="space-y-1.5">
          <Label htmlFor="edge-label">Label</Label>
          <Input
            id="edge-label"
            value={edge.label}
            placeholder="e.g. webhook, yes, nightly"
            onChange={(e) =>
              actions.updateDiagramEdge(diagramId, edge.id, { label: e.target.value })
            }
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={edge.dashed}
            onChange={(e) =>
              actions.updateDiagramEdge(diagramId, edge.id, { dashed: e.target.checked })
            }
            className="size-3.5 accent-navy-600"
          />
          <span className="text-xs text-fg-body">Dashed</span>
          <span className="text-[10px] text-fg-subtle">(not a live technical link)</span>
        </label>

        <Separator />

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-critical hover:bg-critical-bg"
          onClick={() => {
            actions.deleteDiagramEdge(diagramId, edge.id);
            onClose();
          }}
        >
          <Trash2 />
          Delete connection
        </Button>
      </div>
    </div>
  );
}

export { cn };
