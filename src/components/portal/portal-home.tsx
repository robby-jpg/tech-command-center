"use client";

import * as React from "react";
import { CheckCircle2, Inbox, Plus } from "lucide-react";
import { REQUESTER_STAGE_META } from "@/domain";
import { PORTAL_SCOPE_META, portalView, type PortalScope } from "@/lib/portal";
import { useSnapshot } from "@/lib/store/workspace-store";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/primitives";
import { usePortalViewer } from "./portal-context";
import { PortalHeading } from "./portal-shell";
import { PortalProjects } from "./portal-projects";
import { PortalRequestCard } from "./portal-request-card";
import { PortalSubmit } from "./portal-submit";

/**
 * The portal's one page.
 *
 * Ordered by whose move it is rather than by date: anything waiting on the
 * person reading it comes first, then work in flight, then what has landed.
 * A requester opening this should be able to close it again in ten seconds
 * having learned either "nothing needed from me" or "reply to that one".
 */
export function PortalHome() {
  const snapshot = useSnapshot();
  const { viewer } = usePortalViewer();
  // Tagged with who it was chosen for, so switching who you are previewing
  // does not carry the last person's tab across to somebody it does not suit.
  const [chosen, setChosen] = React.useState<{
    userId: string;
    scope: PortalScope;
  } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Somebody whose requests were all raised before the portal existed would land
  // on an empty page that is accurate and useless — the ClickUp import lost the
  // requester on most of them, so their history sits under their department
  // instead. Derived rather than corrected after the fact.
  const hasOwnRequests = React.useMemo(
    () => snapshot.tickets.some((t) => t.requesterId === viewer.id),
    [snapshot.tickets, viewer.id],
  );

  const scope: PortalScope =
    (chosen?.userId === viewer.id ? chosen.scope : null) ??
    (hasOwnRequests ? "mine" : "department");

  const setScope = (next: PortalScope) => setChosen({ userId: viewer.id, scope: next });

  const view = React.useMemo(
    () => portalView(snapshot, viewer, scope),
    [snapshot, viewer, scope],
  );

  const firstName = viewer.name.split(" ")[0];

  return (
    <div className="space-y-5">
      <PortalHeading
        title={`Your technology requests, ${firstName}`}
        description={
          view.counts.needsYou > 0
            ? `${view.counts.needsYou} ${view.counts.needsYou === 1 ? "request needs" : "requests need"} something from you.`
            : view.counts.open > 0
              ? `${view.counts.open} open with the Tech team. Nothing needs you right now.`
              : "Nothing open with the Tech team right now."
        }
        action={
          <Button variant="primary" size="sm" onClick={() => setSubmitting(true)}>
            <Plus />
            New request
          </Button>
        }
      />

      {/* Two genuinely different things — your queue, and what is being built —
          so tabs here, where the scope control below is a filter over one list
          and stays a segmented control. */}
      <Tabs defaultValue="requests" className="space-y-5">
        <TabsList>
          <TabsTrigger value="requests">
            Your requests
            {view.counts.open > 0 && (
              <span className="tabular ml-1.5 text-2xs text-fg-subtle">
                {view.counts.open}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="roadmap">What we are building</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-5">
      {/* A filter over one list, so a segmented control rather than tabs —
          a tablist with no panel announces a tab that controls nothing. */}
      <ToggleGroup
        type="single"
        value={scope}
        onValueChange={(v) => v && setScope(v as PortalScope)}
        aria-label="Whose requests to show"
      >
        {(Object.keys(PORTAL_SCOPE_META) as PortalScope[]).map((key) => (
          <ToggleGroupItem key={key} value={key}>
            {PORTAL_SCOPE_META[key].label}
            {key === "department" && ` · ${view.departmentName}`}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {view.open.length === 0 && view.recentlyDone.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            icon={Inbox}
            title={
              scope === "mine"
                ? "You have not raised anything"
                : `No requests from ${view.departmentName}`
            }
            description={
              scope === "mine"
                ? "Requests you send to the Tech team will appear here, with where they have got to."
                : "Nothing from your team is with the Tech Department at the moment."
            }
            action={
              <Button variant="secondary" size="sm" onClick={() => setSubmitting(true)}>
                <Plus />
                Raise a request
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {view.groups.map((group) => {
            const meta = REQUESTER_STAGE_META[group.stage];
            return (
              <section key={group.stage} className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-sm font-semibold text-fg">
                    {group.stage === "needs_you"
                      ? "Waiting on you"
                      : group.stage === "in_progress"
                        ? "Being worked on"
                        : "With the Tech team"}
                  </h2>
                  <span className="tabular text-2xs text-fg-subtle">
                    {group.tickets.length}
                  </span>
                </div>
                <p className="text-2xs text-fg-muted">{meta.meaning}</p>
                <div className="space-y-2">
                  {group.tickets.map((ticket) => (
                    <PortalRequestCard
                      key={ticket.id}
                      ticket={ticket}
                      showRequester={scope === "department"}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {view.recentlyDone.length > 0 && (
            <RecentlyDone
              tickets={view.recentlyDone}
              total={view.counts.done}
              showRequester={scope === "department"}
            />
          )}
        </div>
      )}
        </TabsContent>

        <TabsContent value="roadmap">
          <PortalProjects />
        </TabsContent>
      </Tabs>

      <PortalSubmit open={submitting} onOpenChange={setSubmitting} />
    </div>
  );
}

/**
 * Finished work, collapsed.
 *
 * Shown because "did that ever get done?" is a question people ask, and folded
 * because a portal that opens onto forty resolved tickets buries the two that
 * still need something.
 */
function RecentlyDone({
  tickets,
  total,
  showRequester,
}: {
  tickets: ReturnType<typeof portalView>["recentlyDone"];
  total: number;
  showRequester: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const shown = expanded ? tickets : tickets.slice(0, 3);

  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg">
          <CheckCircle2 className="size-3.5 text-success" />
          Recently finished
        </h2>
        <span className="tabular text-2xs text-fg-subtle">{tickets.length}</span>
      </div>
      <p className="text-2xs text-fg-muted">
        {REQUESTER_STAGE_META.done.meaning}
        {total > tickets.length && ` ${total - tickets.length} older ones are not shown.`}
      </p>
      <div className="space-y-2">
        {shown.map((ticket) => (
          <PortalRequestCard
            key={ticket.id}
            ticket={ticket}
            showRequester={showRequester}
          />
        ))}
      </div>
      {tickets.length > 3 && (
        <Button variant="ghost" size="xs" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show fewer" : `Show all ${tickets.length}`}
        </Button>
      )}
    </section>
  );
}
