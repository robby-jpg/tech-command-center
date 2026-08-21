"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  TICKET_CATEGORY_META,
  TICKET_STATUS_META,
  TICKET_STATUS_ORDER,
  type Ticket,
  type TicketStatus,
} from "@/domain";
import { sla, userById } from "@/lib/selectors";
import { useActions, useSnapshot } from "@/lib/store/workspace-store";
import { formatAge } from "@/lib/format";
import { cn, countLabel } from "@/lib/utils";
import { Dot } from "@/components/ui/badge";
import {
  PriorityBadge,
  SLAIndicator,
  UserAvatar,
} from "@/components/shared/indicators";

export function TicketKanban({ tickets }: { tickets: Ticket[] }) {
  const actions = useActions();
  const [dragging, setDragging] = React.useState<Ticket | null>(null);

  // A small activation distance keeps a click from being read as a drag, so
  // cards stay clickable.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const columns = React.useMemo(() => {
    const map = new Map<TicketStatus, Ticket[]>(
      TICKET_STATUS_ORDER.map((s) => [s, []]),
    );
    for (const ticket of tickets) map.get(ticket.status)?.push(ticket);
    return TICKET_STATUS_ORDER.map((status) => ({
      status,
      // Open columns lead with the most urgent; the closed column leads with
      // the most recently finished, which is the only part of it worth seeing.
      tickets: (map.get(status) ?? []).sort((a, b) => {
        if (!TICKET_STATUS_META[status].open) {
          return (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? "");
        }
        const order = { critical: 0, high: 1, normal: 2, low: 3 };
        return (
          order[a.priority] - order[b.priority] ||
          a.createdAt.localeCompare(b.createdAt)
        );
      }),
    }));
  }, [tickets]);

  function onDragStart(event: DragStartEvent) {
    setDragging(tickets.find((t) => t.id === event.active.id) ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(null);
    const { active, over } = event;
    if (!over) return;

    const status = over.id as TicketStatus;
    if (!TICKET_STATUS_ORDER.includes(status)) return;

    const ticket = tickets.find((t) => t.id === active.id);
    if (!ticket || ticket.status === status) return;

    actions.setTicketStatus(ticket.id, status);
  }

  return (
    <DndContext
      // A stable id keeps dnd-kit from generating different aria-describedby
      // values on the server and the client, which React reports as a
      // hydration mismatch.
      id="ticket-kanban"
      sensors={sensors}
      modifiers={[restrictToWindowEdges]}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="scrollbar-slim flex gap-3 overflow-x-auto pb-2">
        {columns.map((column) => (
          <KanbanColumn
            key={column.status}
            status={column.status}
            tickets={column.tickets}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 160, easing: "cubic-bezier(0.16,1,0.3,1)" }}>
        {dragging ? (
          <div className="w-72 rotate-1 opacity-95">
            <TicketCard ticket={dragging} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * Closed work is capped.
 *
 * The Resolved column otherwise holds every ticket the department has ever
 * finished — hundreds of cards nobody scrolls, costing a DOM node each. A board
 * is for work in motion; the full history is what the table and Analytics are
 * for.
 */
const RESOLVED_COLUMN_LIMIT = 15;

function KanbanColumn({
  status,
  tickets,
}: {
  status: TicketStatus;
  tickets: Ticket[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = TICKET_STATUS_META[status];

  const capped = meta.open ? tickets : tickets.slice(0, RESOLVED_COLUMN_LIMIT);
  const hidden = tickets.length - capped.length;

  return (
    <section
      ref={setNodeRef}
      aria-label={`${meta.label} — ${countLabel(tickets.length, "ticket")}`}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border transition-colors",
        isOver
          ? "border-teal-300 bg-teal-50/60"
          : "border-line bg-sunken/60",
      )}
    >
      <header className="flex items-center gap-2 px-3 py-2.5">
        <Dot tone={meta.tone} className="size-1.5" />
        <h3 className="flex-1 truncate text-xs font-semibold text-fg">{meta.label}</h3>
        <span className="tabular rounded-full bg-surface px-1.5 py-px text-[10px] font-semibold text-fg-muted">
          {tickets.length}
        </span>
      </header>

      <div className="scrollbar-slim flex max-h-[calc(100dvh-19rem)] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {tickets.length === 0 ? (
          <p className="rounded-md border border-dashed border-line px-3 py-6 text-center text-2xs text-fg-subtle">
            {meta.open ? "Nothing here" : "Nothing resolved yet"}
          </p>
        ) : (
          <>
            {capped.map((ticket) => (
              <DraggableCard key={ticket.id} ticket={ticket} />
            ))}
            {hidden > 0 && (
              <p className="rounded-md border border-dashed border-line px-3 py-3 text-center text-2xs text-fg-subtle">
                {hidden} more resolved — see the table or Analytics
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function DraggableCard({ ticket }: { ticket: Ticket }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn("touch-none", isDragging && "opacity-40")}
    >
      <TicketCard ticket={ticket} />
    </div>
  );
}

export function TicketCard({
  ticket,
  overlay = false,
}: {
  ticket: Ticket;
  overlay?: boolean;
}) {
  const router = useRouter();
  const snapshot = useSnapshot();
  const assignee = userById(snapshot, ticket.assigneeId);
  const evaluation = sla(snapshot, ticket);

  return (
    <article
      onClick={() => !overlay && router.push(`/tickets/${ticket.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !overlay) router.push(`/tickets/${ticket.id}`);
      }}
      tabIndex={overlay ? -1 : 0}
      role={overlay ? undefined : "link"}
      aria-label={`Open ${ticket.ticketNumber}: ${ticket.title}`}
      className={cn(
        "rounded-md border border-line bg-surface p-2.5 shadow-xs transition-shadow",
        !overlay &&
          "cursor-grab hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 active:cursor-grabbing",
        overlay && "shadow-pop",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="tabular text-[10px] font-medium text-fg-subtle">
          {ticket.ticketNumber}
        </span>
        <PriorityBadge priority={ticket.priority} />
      </div>

      <p className="mt-1 line-clamp-2 text-xs leading-5 font-medium text-fg">
        {ticket.title}
      </p>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="truncate rounded-sm bg-subtle px-1.5 py-0.5 text-[10px] text-fg-muted">
          {TICKET_CATEGORY_META[ticket.category].label}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="tabular text-[10px] text-fg-subtle">
            {formatAge(ticket.createdAt, snapshot.now)}
          </span>
          <UserAvatar user={assignee} size="xs" />
        </span>
      </div>

      {(evaluation.state === "risk" || evaluation.state === "breached") && (
        <div className="mt-2 border-t border-line-soft pt-1.5">
          <SLAIndicator evaluation={evaluation} />
        </div>
      )}
    </article>
  );
}
