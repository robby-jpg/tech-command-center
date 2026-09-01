"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  DEPARTMENTS,
  REQUESTER_STAGE_META,
  TICKET_CATEGORY_META,
  type PortalTicket,
} from "@/domain";
import { formatDate, formatRelative } from "@/lib/format";
import { userById } from "@/lib/selectors";
import { useSnapshot } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/indicators";
import { Badge, Dot } from "@/components/ui/badge";
import { usePortalHref } from "./portal-context";

/**
 * One request, as a row.
 *
 * Says four things and stops: what it was, where it is, who has it, when it
 * last moved. No priority, no SLA, no category taxonomy in the primary line —
 * those are how the department sorts its own queue, and putting them here
 * invites an argument about whether something is really "High" instead of a
 * reply about the thing that is broken.
 */
export function PortalRequestCard({
  ticket,
  showRequester = false,
}: {
  ticket: PortalTicket;
  showRequester?: boolean;
}) {
  const snapshot = useSnapshot();
  const href = usePortalHref();
  const stage = REQUESTER_STAGE_META[ticket.stage];
  const assignee = userById(snapshot, ticket.assigneeId);
  const requester = userById(snapshot, ticket.requesterId);

  const lastMoved = ticket.resolvedAt ?? ticket.updatedAt;

  return (
    <Link
      href={href(`/portal/requests/${ticket.id}`)}
      className={cn(
        "group flex items-start gap-3 rounded-lg border bg-surface px-3.5 py-3 shadow-xs transition-colors sm:px-4",
        "hover:border-line-strong hover:bg-subtle/60",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500",
        ticket.stage === "needs_you"
          ? "border-warning-border bg-warning-bg/40"
          : "border-line",
      )}
    >
      <Dot tone={stage.tone} className="mt-1.5 size-2 shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge tone={stage.tone}>{stage.label}</Badge>
          <span className="tabular text-2xs text-fg-subtle">{ticket.ticketNumber}</span>
          <span className="text-2xs text-fg-subtle">
            {TICKET_CATEGORY_META[ticket.category].label}
          </span>
        </div>

        <p className="mt-1.5 text-sm leading-5 font-medium text-fg group-hover:text-navy-700">
          {ticket.title}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-fg-muted">
          {showRequester && (
            <span className="inline-flex items-center gap-1.5">
              {requester ? (
                <>
                  <UserAvatar user={requester} size="xs" />
                  {requester.name}
                </>
              ) : (
                // The ClickUp import lost the requester on most historical
                // tickets. Saying so is the honest version, and it is the
                // clearest argument for people submitting through here.
                <span className="text-fg-subtle italic">
                  Raised by {DEPARTMENTS[ticket.requesterDepartment].shortName} — no name
                  recorded
                </span>
              )}
            </span>
          )}

          {ticket.stage === "done" ? (
            <span>Finished {formatRelative(lastMoved, snapshot.now)}</span>
          ) : assignee ? (
            <span className="inline-flex items-center gap-1.5">
              <UserAvatar user={assignee} size="xs" />
              {assignee.name.split(" ")[0]} has it
            </span>
          ) : (
            <span>Not picked up yet</span>
          )}

          {ticket.stage !== "done" && (
            <span>Raised {formatRelative(ticket.createdAt, snapshot.now)}</span>
          )}

          {ticket.dueDate && ticket.stage !== "done" && (
            <span className="text-fg-body">Due {formatDate(ticket.dueDate)}</span>
          )}
        </div>
      </div>

      <ChevronRight className="mt-0.5 size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
