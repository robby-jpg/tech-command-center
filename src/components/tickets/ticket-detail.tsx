"use client";

import Link from "next/link";
import * as React from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  CircleDot,
  Eye,
  FolderKanban,
  Link2,
  Lock,
  MessageSquare,
  Paperclip,
  Server,
  Ticket as TicketIcon,
  Workflow,
} from "lucide-react";
import {
  BUSINESS_IMPACT_META,
  DEPARTMENTS,
  TICKET_CATEGORY_META,
  TICKET_PRIORITY_META,
  TICKET_PRIORITY_ORDER,
  TICKET_SOURCE_META,
  TICKET_STATUS_META,
  TICKET_STATUS_ORDER,
  URGENCY_META,
  type Ticket,
  type TicketActivity,
  type TicketPriority,

} from "@/domain";
import {
  projectById,
  sla,
  systemById,
  ticketTimeline,
  userById,
} from "@/lib/selectors";
import { useActions, useSnapshot } from "@/lib/store/workspace-store";
import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatHours,
  formatRelative,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
  Textarea,
  Switch,
  Label,
} from "@/components/ui/primitives";
import { DetailRow } from "@/components/shared/page";
import { EmptyState } from "@/components/shared/states";
import {
  PriorityBadge,
  SLAIndicator,
  SystemBadge,
  UserAvatar,
  UserChip,
} from "@/components/shared/indicators";

export function TicketDetail({ ticketId }: { ticketId: string }) {
  const snapshot = useSnapshot();
  const ticket = snapshot.tickets.find((t) => t.id === ticketId);

  if (!ticket) {
    return (
      <div className="px-6 py-16">
        <EmptyState
          icon={TicketIcon}
          title="That ticket does not exist."
          description="It may have been removed, or the link may be wrong."
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href="/tickets">Back to tickets</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] px-6 py-5">
      <TicketHeader ticket={ticket} />

      <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <Description ticket={ticket} />
          <Conversation ticket={ticket} />
        </div>

        <div className="space-y-4">
          <Properties ticket={ticket} />
          <RelatedWork ticket={ticket} />
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Header                                                                     */
/* ========================================================================== */

function TicketHeader({ ticket }: { ticket: Ticket }) {
  const actions = useActions();
  const evaluation = useSnapshotSLA(ticket);

  return (
    <div>
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1 text-2xs font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3" />
        All tickets
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="tabular text-xs font-medium text-fg-muted">
              {ticket.ticketNumber}
            </span>
            <Separator orientation="vertical" className="h-3" />
            <span className="text-2xs text-fg-subtle">
              via {TICKET_SOURCE_META[ticket.source].label}
            </span>
            {ticket.reopenCount > 0 && (
              <Badge tone="warning">
                Reopened {ticket.reopenCount}×
              </Badge>
            )}
          </div>
          <h1 className="mt-1 text-xl leading-tight font-semibold text-fg">
            {ticket.title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <StatusMenu ticket={ticket} />
          <PriorityMenu ticket={ticket} />
          {ticket.status !== "resolved" ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => actions.setTicketStatus(ticket.id, "resolved")}
            >
              <Check />
              Mark resolved
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => actions.setTicketStatus(ticket.id, "in_progress")}
            >
              Reopen
            </Button>
          )}
        </div>
      </div>

      {(evaluation.state === "breached" || evaluation.state === "risk") && (
        <div
          className={cn(
            "mt-3 flex items-center gap-2 rounded-md border px-3 py-2",
            evaluation.state === "breached"
              ? "border-critical-border bg-critical-bg"
              : "border-warning-border bg-warning-bg",
          )}
        >
          <Dot
            tone={evaluation.state === "breached" ? "critical" : "warning"}
            className="size-1.5"
          />
          <p className="text-xs text-fg-body">
            {evaluation.awaitingFirstResponse
              ? "First response"
              : "Target resolution"}{" "}
            {evaluation.state === "breached" ? "has passed" : "is close"} —{" "}
            {evaluation.awaitingFirstResponse
              ? evaluation.target.firstResponseLabel
              : evaluation.target.resolutionLabel}{" "}
            for {TICKET_PRIORITY_META[ticket.priority].label.toLowerCase()} priority.
          </p>
        </div>
      )}
    </div>
  );
}

function useSnapshotSLA(ticket: Ticket) {
  const snapshot = useSnapshot();
  return React.useMemo(() => sla(snapshot, ticket), [snapshot, ticket]);
}

function StatusMenu({ ticket }: { ticket: Ticket }) {
  const actions = useActions();
  const meta = TICKET_STATUS_META[ticket.status];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <Dot tone={meta.tone} className="size-1.5" />
          {meta.label}
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Change status</DropdownMenuLabel>
        {TICKET_STATUS_ORDER.map((status) => (
          <DropdownMenuItem
            key={status}
            onSelect={() => actions.setTicketStatus(ticket.id, status)}
            className="flex-col items-start gap-0.5 py-1.5"
          >
            <span className="flex w-full items-center gap-2">
              <Dot tone={TICKET_STATUS_META[status].tone} className="size-1.5" />
              <span className="font-medium">{TICKET_STATUS_META[status].label}</span>
              {status === ticket.status && (
                <Check className="ml-auto size-3.5 text-teal-600" />
              )}
            </span>
            <span className="pl-3.5 text-[10px] leading-4 text-fg-subtle">
              {TICKET_STATUS_META[status].description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PriorityMenu({ ticket }: { ticket: Ticket }) {
  const actions = useActions();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <PriorityBadge priority={ticket.priority} />
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Change priority</DropdownMenuLabel>
        {TICKET_PRIORITY_ORDER.map((priority) => (
          <DropdownMenuItem
            key={priority}
            onSelect={() => actions.setTicketPriority(ticket.id, priority as TicketPriority)}
            className="flex-col items-start gap-0.5 py-1.5"
          >
            <span className="flex w-full items-center gap-2">
              <PriorityBadge priority={priority} />
              {priority === ticket.priority && (
                <Check className="ml-auto size-3.5 text-teal-600" />
              )}
            </span>
            <span className="text-[10px] leading-4 text-fg-subtle">
              {TICKET_PRIORITY_META[priority].description}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-[10px] leading-4 text-fg-subtle">
          Changing priority moves the SLA target with it.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ========================================================================== */
/* Description                                                                */
/* ========================================================================== */

function Description({ ticket }: { ticket: Ticket }) {
  const snapshot = useSnapshot();
  const requester = userById(snapshot, ticket.requesterId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserAvatar user={requester} size="sm" />
          <div>
            <p className="text-xs font-medium text-fg">{requester?.name}</p>
            <p className="text-2xs text-fg-subtle">
              raised this {formatRelative(ticket.createdAt, snapshot.now)}
            </p>
          </div>
        </div>
      </CardHeader>
      <div className="px-4 py-3.5">
        {ticket.description ? (
          <p className="text-sm leading-6 whitespace-pre-wrap text-fg-body">
            {ticket.description}
          </p>
        ) : (
          <p className="text-xs text-fg-subtle italic">
            No detail was given when this was raised.
          </p>
        )}

        {ticket.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {ticket.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-sm bg-subtle px-1.5 py-0.5 text-[10px] text-fg-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {ticket.attachments.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-line-soft pt-3">
            {ticket.attachments.map((file) => (
              <li key={file.id} className="flex items-center gap-2 text-2xs text-fg-muted">
                <Paperclip className="size-3 shrink-0" />
                <span className="truncate">{file.name}</span>
                <span className="text-fg-subtle">{formatBytes(file.size)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

/* ========================================================================== */
/* Conversation                                                               */
/* ========================================================================== */

function Conversation({ ticket }: { ticket: Ticket }) {
  const snapshot = useSnapshot();
  const actions = useActions();
  const [body, setBody] = React.useState("");
  const [internal, setInternal] = React.useState(false);

  const timeline = React.useMemo(
    () => ticketTimeline(snapshot, ticket.id),
    [snapshot, ticket.id],
  );

  const commentCount = timeline.filter((e) => e.type === "comment").length;

  const submit = () => {
    if (!body.trim()) return;
    actions.addComment(ticket.id, body, internal);
    setBody("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Conversation
          <span className="ml-2 font-normal text-fg-subtle">
            {commentCount} {commentCount === 1 ? "comment" : "comments"}
          </span>
        </CardTitle>
      </CardHeader>

      <ol className="divide-y divide-line-soft">
        {timeline.map((entry) =>
          entry.type === "comment" ? (
            <li key={entry.comment.id} className="px-4 py-3.5">
              <CommentEntry
                authorId={entry.comment.authorId}
                body={entry.comment.body}
                createdAt={entry.comment.createdAt}
                internal={entry.comment.internal}
              />
            </li>
          ) : (
            <li key={entry.activity.id} className="px-4 py-2">
              <ActivityEntry activity={entry.activity} />
            </li>
          ),
        )}
      </ol>

      {/* Composer */}
      <div className="border-t border-line bg-subtle/50 p-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
          rows={3}
          placeholder={
            internal
              ? "Internal note — the requester will not see this."
              : "Reply to the requester…"
          }
          className={cn(
            "bg-surface",
            internal && "border-warning-border bg-warning-bg/40",
          )}
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="internal-note"
              checked={internal}
              onCheckedChange={setInternal}
            />
            <Label htmlFor="internal-note" className="cursor-pointer normal-case">
              <span className="inline-flex items-center gap-1 text-2xs text-fg-muted">
                <Lock className="size-3" />
                Internal note
              </span>
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-fg-subtle">⌘↵ to send</span>
            <Button
              variant="primary"
              size="sm"
              onClick={submit}
              disabled={!body.trim()}
            >
              <MessageSquare />
              Comment
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CommentEntry({
  authorId,
  body,
  createdAt,
  internal,
}: {
  authorId: string;
  body: string;
  createdAt: string;
  internal: boolean;
}) {
  const snapshot = useSnapshot();
  const author = userById(snapshot, authorId);

  return (
    <div className="flex gap-3">
      <UserAvatar user={author} size="md" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-fg">{author?.name}</span>
          <span className="text-2xs text-fg-subtle">
            {formatRelative(createdAt, snapshot.now)}
          </span>
          {internal && (
            <Badge tone="warning">
              <Lock className="size-2.5" />
              Internal
            </Badge>
          )}
        </div>
        <div
          className={cn(
            "mt-1.5 rounded-md px-3 py-2 text-sm leading-6 whitespace-pre-wrap",
            internal
              ? "border border-warning-border bg-warning-bg/50 text-fg-body"
              : "bg-subtle text-fg-body",
          )}
        >
          {body}
        </div>
      </div>
    </div>
  );
}

/**
 * System activity is deliberately quieter than a comment: one line, no bubble,
 * muted type. Somebody scanning the thread should be able to tell what a person
 * said apart from what the system recorded without reading either.
 */
function ActivityEntry({ activity }: { activity: TicketActivity }) {
  const snapshot = useSnapshot();
  const actor = userById(snapshot, activity.actorId);

  const sentence = describeActivity(activity, actor?.name ?? "Someone");

  return (
    <div className="flex items-center gap-2.5 pl-1">
      <CircleDot className="size-3 shrink-0 text-fg-subtle" />
      <p className="min-w-0 flex-1 truncate text-2xs text-fg-muted">
        {sentence}
        {activity.detail && (
          <span className="text-fg-subtle"> — {activity.detail}</span>
        )}
      </p>
      <span className="shrink-0 text-[10px] whitespace-nowrap text-fg-subtle">
        {formatRelative(activity.createdAt, snapshot.now)}
      </span>
    </div>
  );
}

function describeActivity(activity: TicketActivity, actorName: string): string {
  switch (activity.kind) {
    case "created":
      return `${actorName} created this ticket`;
    case "status_changed":
      return `${actorName} changed status from ${activity.from} to ${activity.to}`;
    case "priority_changed":
      return `${actorName} changed priority from ${activity.from} to ${activity.to}`;
    case "assigned":
      return `${actorName} assigned this to ${activity.to ?? "someone"}`;
    case "unassigned":
      return `${actorName} removed the assignee`;
    case "resolved":
      return `${actorName} resolved this ticket`;
    case "reopened":
      return `${actorName} reopened this ticket`;
    case "linked_project":
      return `${actorName} linked the project ${activity.to}`;
    case "linked_system":
      return `${actorName} linked ${activity.to}`;
    case "linked_ticket":
      return `${actorName} linked ${activity.to}`;
    case "attachment_added":
      return `${actorName} attached ${activity.to}`;
    case "sla_first_response":
      return "First response recorded";
    case "sla_breached":
      return `SLA breached — ${activity.to}`;
    case "watcher_added":
      return `${actorName} started watching`;
    default:
      return `${actorName} updated this ticket`;
  }
}

/* ========================================================================== */
/* Properties sidebar                                                         */
/* ========================================================================== */

function Properties({ ticket }: { ticket: Ticket }) {
  const snapshot = useSnapshot();
  const actions = useActions();
  const evaluation = useSnapshotSLA(ticket);

  const assignee = userById(snapshot, ticket.assigneeId);
  const requester = userById(snapshot, ticket.requesterId);
  const project = projectById(snapshot, ticket.relatedProjectId);
  const systems = ticket.relatedSystemIds
    .map((id) => systemById(snapshot, id))
    .filter((s): s is NonNullable<typeof s> => s !== null);
  const watchers = ticket.watcherIds
    .map((id) => userById(snapshot, id))
    .filter((u): u is NonNullable<typeof u> => u !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Properties</CardTitle>
      </CardHeader>

      <div className="divide-y divide-line-soft px-4">
        <div className="py-1">
          <DetailRow label="Assignee">
            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer rounded-sm px-1 py-0.5 transition-colors hover:bg-subtle">
                <UserChip user={assignee} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                {snapshot.users
                  .filter((u) => u.isTechTeam)
                  .map((u) => (
                    <DropdownMenuItem
                      key={u.id}
                      onSelect={() => actions.assignTicket(ticket.id, u.id)}
                    >
                      <UserAvatar user={u} size="xs" />
                      {u.name}
                      {u.id === ticket.assigneeId && (
                        <Check className="ml-auto size-3.5 text-teal-600" />
                      )}
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => actions.assignTicket(ticket.id, null)}>
                  Unassign
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </DetailRow>

          <DetailRow label="Requester">
            <UserChip user={requester} muted />
          </DetailRow>

          <DetailRow label="Department">
            {DEPARTMENTS[ticket.requesterDepartment].name}
          </DetailRow>

          <DetailRow label="Category">
            {TICKET_CATEGORY_META[ticket.category].label}
          </DetailRow>
        </div>

        <div className="py-1">
          <DetailRow label="Impact">
            <Badge tone={BUSINESS_IMPACT_META[ticket.businessImpact].tone}>
              {BUSINESS_IMPACT_META[ticket.businessImpact].label}
            </Badge>
          </DetailRow>
          <DetailRow label="Urgency">
            {URGENCY_META[ticket.urgency].label}
          </DetailRow>
        </div>

        <div className="py-2">
          <p className="mb-1.5 text-2xs text-fg-muted">SLA</p>
          <SLAIndicator evaluation={evaluation} variant="full" />
        </div>

        <div className="py-1">
          <DetailRow label="Created">{formatDateTime(ticket.createdAt)}</DetailRow>
          <DetailRow label="Updated">
            {formatRelative(ticket.updatedAt, snapshot.now)}
          </DetailRow>
          {ticket.firstResponseAt && (
            <DetailRow label="First response">
              {formatRelative(ticket.firstResponseAt, ticket.createdAt).replace(
                " ago",
                "",
              )}
            </DetailRow>
          )}
          <DetailRow label="Due">
            {ticket.dueDate ? formatDate(ticket.dueDate) : "—"}
          </DetailRow>
          {ticket.resolvedAt && (
            <DetailRow label="Resolved">{formatDateTime(ticket.resolvedAt)}</DetailRow>
          )}
        </div>

        <div className="py-1">
          <DetailRow label="Estimated">
            {ticket.estimatedEffortHours != null
              ? formatHours(ticket.estimatedEffortHours)
              : "—"}
          </DetailRow>
          <DetailRow label="Time spent">
            {ticket.actualTimeSpentHours != null
              ? formatHours(ticket.actualTimeSpentHours)
              : "—"}
          </DetailRow>
        </div>

        {/* Systems — a ticket links to the systems it actually touches */}
        <div className="py-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-2xs text-fg-muted">Systems</p>
            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer text-[10px] font-medium text-teal-700 hover:underline">
                Edit
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
                <DropdownMenuLabel>Linked systems</DropdownMenuLabel>
                {snapshot.systems.map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s.id}
                    checked={ticket.relatedSystemIds.includes(s.id)}
                    onCheckedChange={() => actions.toggleTicketSystem(ticket.id, s.id)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {s.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {systems.length === 0 ? (
            <p className="text-2xs text-fg-subtle">None linked.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {systems.map((s) => (
                <SystemBadge key={s.id} system={s} href={`/systems/${s.slug}`} showHealth />
              ))}
            </div>
          )}
        </div>

        {/* Project */}
        <div className="py-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-2xs text-fg-muted">Project</p>
            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer text-[10px] font-medium text-teal-700 hover:underline">
                {project ? "Change" : "Link"}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
                <DropdownMenuLabel>Link to project</DropdownMenuLabel>
                {snapshot.projects
                  .filter((p) => p.status !== "complete")
                  .map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      onSelect={() => actions.linkTicketToProject(ticket.id, p.id)}
                    >
                      {p.name}
                      {p.id === ticket.relatedProjectId && (
                        <Check className="ml-auto size-3.5 text-teal-600" />
                      )}
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => actions.linkTicketToProject(ticket.id, null)}
                >
                  Unlink
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {project ? (
            <Link
              href={`/projects/${project.id}`}
              className="flex items-center gap-1.5 text-xs text-teal-700 hover:underline"
            >
              <FolderKanban className="size-3" />
              {project.name}
            </Link>
          ) : (
            <p className="text-2xs text-fg-subtle">Not part of a project.</p>
          )}
        </div>

        {/* Watchers */}
        <div className="py-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-2xs text-fg-muted">Watchers</p>
            <button
              type="button"
              onClick={() => actions.toggleWatcher(ticket.id, snapshot.currentUserId)}
              className="inline-flex cursor-pointer items-center gap-1 text-[10px] font-medium text-teal-700 hover:underline"
            >
              <Eye className="size-3" />
              {ticket.watcherIds.includes(snapshot.currentUserId) ? "Unwatch" : "Watch"}
            </button>
          </div>
          {watchers.length === 0 ? (
            <p className="text-2xs text-fg-subtle">Nobody is watching.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {watchers.map((w) => (
                <span
                  key={w.id}
                  className="inline-flex items-center gap-1 rounded-sm bg-subtle px-1.5 py-0.5 text-[10px] text-fg-muted"
                >
                  <UserAvatar user={w} size="xs" />
                  {w.name.split(" ")[0]}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ========================================================================== */
/* Related work                                                               */
/* ========================================================================== */

function RelatedWork({ ticket }: { ticket: Ticket }) {
  const snapshot = useSnapshot();

  const relatedTickets = ticket.relatedTicketIds
    .map((id) => snapshot.tickets.find((t) => t.id === id))
    .filter((t): t is Ticket => t !== undefined);

  const articles = snapshot.articles.filter(
    (a) =>
      ticket.relatedArticleIds.includes(a.id) ||
      a.relatedTicketIds.includes(ticket.id),
  );

  const diagrams = snapshot.diagrams.filter(
    (d) =>
      d.relatedTicketIds.includes(ticket.id) ||
      d.relatedSystemIds.some((id) => ticket.relatedSystemIds.includes(id)),
  );

  const hasAnything =
    relatedTickets.length > 0 || articles.length > 0 || diagrams.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Related Work</CardTitle>
      </CardHeader>

      {!hasAnything ? (
        <EmptyState
          compact
          icon={Link2}
          title="Nothing linked yet."
          description="Link a system or a project and related documentation appears here."
        />
      ) : (
        <div className="space-y-3 px-4 py-3">
          {relatedTickets.length > 0 && (
            <RelatedGroup icon={TicketIcon} label="Tickets">
              {relatedTickets.map((t) => (
                <RelatedLink
                  key={t.id}
                  href={`/tickets/${t.id}`}
                  title={t.title}
                  meta={`${t.ticketNumber} · ${TICKET_STATUS_META[t.status].label}`}
                />
              ))}
            </RelatedGroup>
          )}

          {articles.length > 0 && (
            <RelatedGroup icon={BookOpen} label="Documentation">
              {articles.map((a) => (
                <RelatedLink
                  key={a.id}
                  href={`/knowledge/${a.slug}`}
                  title={a.title}
                  meta={a.summary}
                />
              ))}
            </RelatedGroup>
          )}

          {diagrams.length > 0 && (
            <RelatedGroup icon={Workflow} label="Diagrams">
              {diagrams.slice(0, 4).map((d) => (
                <RelatedLink
                  key={d.id}
                  href={`/diagrams/${d.id}`}
                  title={d.name}
                  meta={d.description}
                />
              ))}
            </RelatedGroup>
          )}
        </div>
      )}
    </Card>
  );
}

function RelatedGroup({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-fg-subtle uppercase">
        <Icon className="size-3" />
        {label}
      </p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function RelatedLink({
  href,
  title,
  meta,
}: {
  href: string;
  title: string;
  meta: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-md px-2 py-1.5 transition-colors hover:bg-subtle"
      >
        <span className="block truncate text-xs font-medium text-fg">{title}</span>
        <span className="block truncate text-[10px] text-fg-subtle">{meta}</span>
      </Link>
    </li>
  );
}

export { Server };
