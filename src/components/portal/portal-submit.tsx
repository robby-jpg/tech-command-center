"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BUSINESS_IMPACT_META,
  BUSINESS_IMPACT_ORDER,
  PORTAL_SOURCE_BY_DEPARTMENT,
  TICKET_CATEGORY_META,
  TICKET_CATEGORY_ORDER,
  URGENCY_META,
  URGENCY_ORDER,
  type BusinessImpact,
  type TicketCategory,
  type TicketPriority,
  type Urgency,
} from "@/domain";
import { useActions } from "@/lib/store/workspace-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui/primitives";
import { usePortalViewer } from "./portal-context";

/**
 * Raising a request.
 *
 * The form asks what happened, how much of the business it stops and how soon
 * it matters. It does not ask for a priority, and that is the point: priority
 * is a triage decision the department makes from impact and urgency, and a
 * field marked Critical by the person who is annoyed is not the same thing.
 * `derivePriority` below is the whole of that translation, kept visible rather
 * than hidden in a rule engine so the department can argue with it.
 */

/**
 * Impact and urgency to a starting priority.
 *
 * A starting point only — the Tech Department retriages in the Command Center,
 * and the portal never shows the result. Something that has stopped work for a
 * whole department is critical whoever raised it; one person who can wait is
 * low however strongly they feel about it.
 */
function derivePriority(
  impact: BusinessImpact,
  urgency: Urgency,
): TicketPriority {
  if (
    urgency === "immediate" &&
    (impact === "company" || impact === "department")
  ) {
    return "critical";
  }
  if (impact === "company") return "critical";
  if (urgency === "immediate" || impact === "department") return "high";
  if (urgency === "urgent" && impact === "team") return "high";
  if (urgency === "can_wait") return "low";
  return "normal";
}

export function PortalSubmit({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { viewer } = usePortalViewer();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The shared dialog is sized for a desk. This form is six fields tall
          and the people raising requests are largely on phones, so it gets a
          gutter and scrolls rather than running off the bottom of the screen.
          Constrained here rather than in the primitive, which the Command
          Center's own dialogs depend on as it is. */}
      <DialogContent className="max-h-[85dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto">
        {/* Mounted fresh each time it opens, and again if the previewed person
            changes underneath it, so nobody is ever handed somebody else's
            half-written draft. */}
        {open && (
          <SubmitForm key={viewer.id} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SubmitForm({ onDone }: { onDone: () => void }) {
  const actions = useActions();
  const router = useRouter();
  const { viewer } = usePortalViewer();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<TicketCategory>("other");
  const [impact, setImpact] = React.useState<BusinessImpact>("individual");
  const [urgency, setUrgency] = React.useState<Urgency>("soon");
  const [error, setError] = React.useState<string | null>(null);

  function submit() {
    if (title.trim().length < 4) {
      setError(
        "Give it a title the Tech team would understand out of context.",
      );
      return;
    }

    const id = actions.createTicket({
      title: title.trim(),
      description: description.trim(),
      priority: derivePriority(impact, urgency),
      category,
      requesterId: viewer.id,
      requesterDepartment: viewer.department,
      businessImpact: impact,
      urgency,
      // Where this would have come from once the portal lives in that
      // department's own application. The queue is the same either way.
      source: PORTAL_SOURCE_BY_DEPARTMENT[viewer.department],
    });

    onDone();
    router.push(`/portal/requests/${id}?as=${encodeURIComponent(viewer.id)}`);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ask the Tech team for something</DialogTitle>
        <DialogDescription>
          Raised as {viewer.name}. You will be able to follow it here.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 px-1">
        <div className="space-y-1.5">
          <Label htmlFor="portal-title">What do you need?</Label>
          <Input
            id="portal-title"
            value={title}
            autoFocus
            placeholder="Salesforce will not let me change the close date"
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
          />
          {error && <p className="text-2xs text-critical">{error}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="portal-description">What is happening?</Label>
          <Textarea
            id="portal-description"
            rows={4}
            value={description}
            placeholder="What you were doing, what you expected, and what happened instead. A job number or a screenshot saves a round trip."
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>What is it about?</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as TicketCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_CATEGORY_ORDER.map((key) => (
                  <SelectItem key={key} value={key}>
                    {TICKET_CATEGORY_META[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Who is affected?</Label>
            <Select
              value={impact}
              onValueChange={(v) => setImpact(v as BusinessImpact)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_IMPACT_ORDER.map((key) => (
                  <SelectItem key={key} value={key}>
                    {BUSINESS_IMPACT_META[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>How soon does this matter?</Label>
          <Select
            value={urgency}
            onValueChange={(v) => setUrgency(v as Urgency)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {URGENCY_ORDER.map((key) => (
                <SelectItem key={key} value={key}>
                  {URGENCY_META[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-2xs text-fg-muted">
            The Tech team sets the priority from these two answers, so they are
            worth answering honestly rather than high.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={submit}>
          Send to Tech
        </Button>
      </DialogFooter>
    </>
  );
}
