"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Columns3,
  Inbox,
  UserPlus,
} from "lucide-react";
import {
  TICKET_CATEGORY_META,
  TICKET_STATUS_META,
  TICKET_STATUS_ORDER,
  type Ticket,
} from "@/domain";
import { sla, userById } from "@/lib/selectors";
import { useActions, useSnapshot } from "@/lib/store/workspace-store";
import { formatAge, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Checkbox,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/primitives";
import {
  PriorityBadge,
  SLAIndicator,
  UserChip,
} from "@/components/shared/indicators";
import { EmptyState } from "@/components/shared/states";

export function TicketTable({
  tickets,
  emptyTitle = "No tickets match these filters.",
  emptyDescription = "Try clearing a filter, or widening the date range.",
}: {
  tickets: Ticket[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const router = useRouter();
  const snapshot = useSnapshot();
  const actions = useActions();

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "updated", desc: true },
  ]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const columns = React.useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        size: 36,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all rows on this page"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label={`Select ${row.original.ticketNumber}`}
          />
        ),
      },
      {
        id: "ticket",
        accessorFn: (t) => t.ticketNumber,
        header: "Ticket",
        size: 84,
        cell: ({ row }) => (
          <span className="tabular text-2xs font-medium text-fg-muted">
            {row.original.ticketNumber}
          </span>
        ),
      },
      {
        id: "title",
        accessorFn: (t) => t.title,
        header: "Title",
        cell: ({ row }) => (
          <span className="block max-w-md truncate text-sm text-fg group-hover:text-navy-700">
            {row.original.title}
          </span>
        ),
      },
      {
        id: "priority",
        accessorFn: (t) => t.priority,
        header: "Priority",
        size: 96,
        sortingFn: (a, b) => {
          const order = { critical: 0, high: 1, normal: 2, low: 3 };
          return order[a.original.priority] - order[b.original.priority];
        },
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      },
      {
        id: "status",
        accessorFn: (t) => t.status,
        header: "Status",
        size: 150,
        sortingFn: (a, b) =>
          TICKET_STATUS_ORDER.indexOf(a.original.status) -
          TICKET_STATUS_ORDER.indexOf(b.original.status),
        cell: ({ row }) => (
          <Badge tone={TICKET_STATUS_META[row.original.status].tone}>
            {TICKET_STATUS_META[row.original.status].label}
          </Badge>
        ),
      },
      {
        id: "category",
        accessorFn: (t) => TICKET_CATEGORY_META[t.category].label,
        header: "Category",
        size: 118,
        cell: ({ getValue }) => (
          <span className="truncate text-2xs text-fg-muted">{getValue<string>()}</span>
        ),
      },
      {
        id: "requester",
        accessorFn: (t) => userById(snapshot, t.requesterId)?.name ?? "",
        header: "Requester",
        size: 148,
        cell: ({ row }) => (
          <UserChip user={userById(snapshot, row.original.requesterId)} muted />
        ),
      },
      {
        id: "assignee",
        accessorFn: (t) => userById(snapshot, t.assigneeId)?.name ?? "",
        header: "Assignee",
        size: 148,
        cell: ({ row }) => <UserChip user={userById(snapshot, row.original.assigneeId)} />,
      },
      {
        id: "age",
        accessorFn: (t) => new Date(t.createdAt).getTime(),
        header: "Age",
        size: 62,
        sortDescFirst: false,
        cell: ({ row }) => (
          <span className="tabular text-2xs text-fg-subtle">
            {formatAge(row.original.createdAt, snapshot.now)}
          </span>
        ),
      },
      {
        id: "sla",
        accessorFn: (t) => sla(snapshot, t).minutesRemaining ?? Number.MAX_SAFE_INTEGER,
        header: "SLA",
        size: 118,
        sortDescFirst: false,
        cell: ({ row }) => <SLAIndicator evaluation={sla(snapshot, row.original)} />,
      },
      {
        id: "updated",
        accessorFn: (t) => new Date(t.updatedAt).getTime(),
        header: "Updated",
        size: 106,
        cell: ({ row }) => (
          <span className="text-2xs whitespace-nowrap text-fg-subtle">
            {formatRelative(row.original.updatedAt, snapshot.now)}
          </span>
        ),
      },
    ],
    [snapshot],
  );

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const selectedIds = Object.keys(rowSelection).filter(
    (id) => rowSelection[id as keyof typeof rowSelection],
  );

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-xs">
      {/* Toolbar: bulk actions take over when rows are selected */}
      <div className="flex h-11 items-center justify-between gap-3 border-b border-line-soft px-3">
        {selectedIds.length > 0 ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-fg">
                {selectedIds.length} selected
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="xs">
                    <UserPlus />
                    Assign
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                  {snapshot.users
                    .filter((u) => u.isTechTeam)
                    .map((u) => (
                      <DropdownMenuItem
                        key={u.id}
                        onSelect={() => {
                          actions.bulkAssign(selectedIds, u.id);
                          setRowSelection({});
                        }}
                      >
                        {u.name}
                      </DropdownMenuItem>
                    ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      actions.bulkAssign(selectedIds, null);
                      setRowSelection({});
                    }}
                  >
                    Unassign
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="xs">
                    Set status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {TICKET_STATUS_ORDER.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onSelect={() => {
                        actions.bulkStatus(selectedIds, s);
                        setRowSelection({});
                      }}
                    >
                      {TICKET_STATUS_META[s].label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button variant="ghost" size="xs" onClick={() => setRowSelection({})}>
              Clear selection
            </Button>
          </>
        ) : (
          <>
            <span className="text-2xs text-fg-muted">
              {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="xs">
                  <Columns3 />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllLeafColumns()
                  .filter((c) => c.id !== "select" && c.id !== "title")
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(v) => column.toggleVisibility(!!v)}
                      onSelect={(e) => e.preventDefault()}
                      className="capitalize"
                    >
                      {column.id === "sla" ? "SLA" : column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {tickets.length === 0 ? (
        <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <div className="scrollbar-slim overflow-x-auto">
            <table className="w-full min-w-[1080px]">
              <thead className="sticky top-0 z-10 bg-subtle">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-line">
                    {headerGroup.headers.map((header) => {
                      const sortable = header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          style={{ width: header.getSize() }}
                          className="px-2 py-2 text-left first:pl-3 last:pr-3"
                        >
                          {header.isPlaceholder ? null : sortable ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className="group/sort inline-flex cursor-pointer items-center gap-1 text-2xs font-semibold tracking-wide text-fg-muted uppercase transition-colors hover:text-fg"
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                              {sorted === "asc" ? (
                                <ArrowUp className="size-3 text-teal-600" />
                              ) : sorted === "desc" ? (
                                <ArrowDown className="size-3 text-teal-600" />
                              ) : (
                                <ChevronsUpDown className="size-3 opacity-0 transition-opacity group-hover/sort:opacity-50" />
                              )}
                            </button>
                          ) : (
                            <span className="text-2xs font-semibold tracking-wide text-fg-muted uppercase">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>

              <tbody className="divide-y divide-line-soft">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    // The whole row is the target. Nobody should have to hunt
                    // for a small link to open a ticket.
                    onClick={() => router.push(`/tickets/${row.original.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/tickets/${row.original.id}`);
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open ${row.original.ticketNumber}: ${row.original.title}`}
                    className={cn(
                      "group cursor-pointer transition-colors",
                      "hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-500",
                      row.getIsSelected() && "bg-navy-50/60",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-2 py-2 first:pl-3 last:pr-3"
                        // Checkbox clicks must not also open the ticket.
                        onClick={
                          cell.column.id === "select"
                            ? (e) => e.stopPropagation()
                            : undefined
                        }
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-between border-t border-line-soft px-3 py-2">
              <span className="text-2xs text-fg-muted">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft />
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
