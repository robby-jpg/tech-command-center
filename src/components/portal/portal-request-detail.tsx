"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, RotateCcw, Send } from "lucide-react";
import {
  DEPARTMENTS,
  REQUESTER_STAGE_META,
  TICKET_CATEGORY_META,
} from "@/domain";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { portalRequest, type PortalTimelineEntry } from "@/lib/portal";
import { userById } from "@/lib/selectors";
import { useActions, useSnapshot } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/indicators";
import { EmptyState } from "@/components/shared/states";
import { Badge, Dot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/primitives";
import { usePortalHref, usePortalViewer } from "./portal-context";
import { PortalHeading } from "./portal-shell";

/**
 * One request, in full.
 *
 * The conversation is the point of this page. Everything else — stage, who has
 * it, when it was raised — is a header above it. Internal notes and the
 * department's own activity are filtered upstream in `portalRequest`; nothing
 * here decides what is safe to render.
 */
export function PortalRequestDetail({ ticketId }: { ticketId: string }) {
  const snapshot = useSnapshot();
  const { viewer } = usePortalViewer();
  const href = usePortalHref();

  const request = React.useMemo(
    () => portalRequest(snapshot, ticketId, viewer),
    [snapshot, ticketId, viewer],
  );

  if (!request) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          title="That request is not yours to see"
          description="It either does not exist, or it belongs to another department. Nothing has been shared."
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href={href("/portal")}>
                <ArrowLeft />
                Back to your requests
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { ticket, timeline, awaitingReply } = request;
  const stage = REQUESTER_STAGE_META[ticket.stage];
  const assignee = userById(snapshot, ticket.assigneeId);
  const requester = userById(snapshot, ticket.requesterId);
  const raisedByOther = ticket.requesterId !== viewer.id;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="xs" className="-ml-2">
        <Link href={href("/portal")}>
          <ArrowLeft />
          Your requests
        </Link>
      </Button>

      <PortalHeading
        title={ticket.title}
        description={`${ticket.ticketNumber} · ${TICKET_CATEGORY_META[ticket.category].label} · raised ${formatDate(ticket.createdAt)}`}
      />

      <div
        className={cn(
          "rounded-lg border px-4 py-3",
          ticket.stage === "needs_you"
            ? "border-warning-border bg-warning-bg"
            : "border-line bg-surface",
        )}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5">
            <Dot tone={stage.tone} className="size-2" />
            <Badge tone={stage.tone}>{stage.label}</Badge>
          </span>
          <p className="min-w-0 flex-1 text-xs text-fg-body">{stage.meaning}</p>
        </div>

        <dl className="mt-3 grid gap-x-6 gap-y-2 border-t border-line-soft pt-3 text-2xs sm:grid-cols-3">
          <Fact label={ticket.stage === "done" ? "Finished by" : "With"}>
            {assignee ? (
              <span className="inline-flex items-center gap-1.5">
                <UserAvatar user={assignee} size="xs" />
                {assignee.name}
              </span>
            ) : (
              <span className="text-fg-subtle">Not picked up yet</span>
            )}
          </Fact>

          <Fact label="Raised by">
            {requester ? (
              <span className="inline-flex items-center gap-1.5">
                <UserAvatar user={requester} size="xs" />
                {requester.name}
              </span>
            ) : (
              <span className="text-fg-subtle italic">
                {DEPARTMENTS[ticket.requesterDepartment].name} — no name recorded
              </span>
            )}
          </Fact>

          <Fact label={ticket.stage === "done" ? "Finished" : "Last update"}>
            {formatRelative(ticket.resolvedAt ?? ticket.updatedAt, snapshot.now)}
            {ticket.dueDate && ticket.stage !== "done" && (
              <span className="block text-fg-muted">
                Due {formatDate(ticket.dueDate)}
              </span>
            )}
          </Fact>
        </dl>
      </div>

      {ticket.description && (
        <Card>
          <CardHeader>
            <CardTitle>What was asked</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs leading-6 whitespace-pre-wrap text-fg-body">
              {ticket.description}
            </p>
          </CardContent>
        </Card>
      )}

      <Conversation
        ticketId={ticket.id}
        timeline={timeline}
        awaitingReply={awaitingReply}
        raisedByOther={raisedByOther}
        stage={ticket.stage}
      />
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 text-fg-body">{children}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Conversation                                                               */
/* -------------------------------------------------------------------------- */

function Conversation({
  ticketId,
  timeline,
  awaitingReply,
  raisedByOther,
  stage,
}: {
  ticketId: string;
  timeline: PortalTimelineEntry[];
  awaitingReply: boolean;
  raisedByOther: boolean;
  stage: keyof typeof REQUESTER_STAGE_META;
}) {
  const actions = useActions();
  const { viewer } = usePortalViewer();
  const [body, setBody] = React.useState("");

  const send = () => {
    if (!body.trim()) return;
    // Never internal, and always attributed to the person in the portal rather
    // than to whoever the Command Center thinks is signed in.
    actions.addComment(ticketId, body, false, viewer.id);
    // A reply is the answer the department was blocked on, so the ticket stops
    // waiting on the requester the moment one arrives.
    if (awaitingReply) actions.setTicketStatus(ticketId, "in_progress", viewer.id);
    setBody("");
  };

  const reopen = () => {
    actions.setTicketStatus(ticketId, "new", viewer.id);
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Updates</CardTitle>
          <p className="mt-0.5 text-xs text-fg-muted">
            Everything the Tech team has said about this, and anything you have added.
          </p>
        </div>
      </CardHeader>

      {timeline.length === 0 ? (
        <EmptyState
          compact
          icon={MessageSquare}
          title="No updates yet"
          description="The Tech team has not posted anything on this one."
        />
      ) : (
        <ol className="divide-y divide-line-soft">
          {timeline.map((entry) =>
            entry.type === "comment" ? (
              <li key={entry.comment.id} className="px-4 py-3.5">
                <CommentEntry entry={entry} />
              </li>
            ) : (
              <li key={entry.activity.id} className="px-4 py-2">
                <ActivityEntry entry={entry} />
              </li>
            ),
          )}
        </ol>
      )}

      <div className="border-t border-line bg-subtle/50 p-3">
        {awaitingReply && (
          <p className="mb-2 text-2xs font-medium text-warning">
            The Tech team is waiting on you. Replying puts this back with them.
          </p>
        )}

        <Textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            raisedByOther
              ? "Add something the Tech team should know about this request."
              : "Reply to the Tech team."
          }
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-2xs text-fg-subtle">
            Goes straight to the Tech team. Everyone in{" "}
            {DEPARTMENTS[viewer.department].shortName} can see it.
          </p>
          <div className="flex items-center gap-2">
            {stage === "done" && (
              <Button variant="secondary" size="sm" onClick={reopen}>
                <RotateCcw />
                Not actually fixed
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={send}
              disabled={!body.trim()}
            >
              <Send />
              Send
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CommentEntry({
  entry,
}: {
  entry: Extract<PortalTimelineEntry, { type: "comment" }>;
}) {
  const snapshot = useSnapshot();
  const author = userById(snapshot, entry.comment.authorId);

  return (
    <div className="flex gap-3">
      <UserAvatar user={author} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-xs font-medium text-fg">{author?.name ?? "Unknown"}</span>
          {entry.fromTech && (
            <Badge tone="brand" variant="plain">
              Tech team
            </Badge>
          )}
          <span className="text-2xs text-fg-subtle">
            {formatDateTime(entry.comment.createdAt)}
          </span>
        </div>
        <p className="mt-1 text-xs leading-6 whitespace-pre-wrap text-fg-body">
          {entry.comment.body}
        </p>
      </div>
    </div>
  );
}

/**
 * A change, said plainly.
 *
 * The department's own from/to labels are deliberately not repeated — a
 * requester reading "Triaged → Testing" learns nothing they can act on. What
 * they get is the sentence version of the same event.
 */
function ActivityEntry({
  entry,
}: {
  entry: Extract<PortalTimelineEntry, { type: "activity" }>;
}) {
  const snapshot = useSnapshot();
  const actor = userById(snapshot, entry.activity.actorId);
  const actorName = actor?.isTechTeam ? actor.name : (actor?.name ?? "Someone");

  const sentence = (() => {
    switch (entry.activity.kind) {
      case "created":
        return "Request raised.";
      case "assigned":
        return `${actorName} picked this up.`;
      case "resolved":
        return `${actorName} marked this finished.`;
      case "reopened":
        return `${actorName} reopened this.`;
      case "status_changed":
        return `${actorName} moved this along.`;
      default:
        return null;
    }
  })();

  if (!sentence) return null;

  return (
    <p className="flex items-center gap-2 text-2xs text-fg-subtle">
      <span className="size-1 shrink-0 rounded-full bg-line-strong" />
      {sentence}
      <span className="text-fg-subtle/70">
        {formatRelative(entry.activity.createdAt, snapshot.now)}
      </span>
    </p>
  );
}
