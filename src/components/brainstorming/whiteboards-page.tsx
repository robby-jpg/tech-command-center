"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Archive, Check, Plus, RotateCcw, StickyNote, Trash2 } from "lucide-react";
import type { Diagram } from "@/domain";
import { useActions, useSnapshot } from "@/lib/store/workspace-store";
import { formatDateTime, formatRelative } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageBody, SectionHeader } from "@/components/shared/page";
import { EmptyState } from "@/components/shared/states";
import {
  forgetWhiteboardAction,
  keepWhiteboardAction,
} from "@/app/(command)/brainstorming/whiteboards/actions";

type Kept = { diagram: Diagram; keptAt: string; file: string };

/**
 * Whiteboards: the informal half of Brainstorming.
 *
 * They are diagrams — same editor, same store, same persistence — filtered to
 * the `whiteboard` type and given their own page so that Infrastructure's
 * diagrams stay a catalogue of how things actually work rather than a pile of
 * half-finished thinking.
 *
 * The Keep / Restore pair is the interesting part, and it exists because of a
 * real property of this application rather than as a feature: the client store
 * is dropped whenever the dataset clock moves, which is most mornings.
 */
export function WhiteboardsPage({ kept }: { kept: Kept[] }) {
  const snapshot = useSnapshot();
  const actions = useActions();
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [justKept, setJustKept] = React.useState<string | null>(null);

  const live = snapshot.diagrams.filter((d) => d.type === "whiteboard");
  const keptByDiagramId = new Map(kept.map((k) => [k.diagram.id, k]));

  // A kept board whose live copy has been wiped. This is the recovery list, and
  // it is the entire justification for keeping in the first place.
  const orphaned = kept.filter((k) => !live.some((d) => d.id === k.diagram.id));

  async function keep(diagram: Diagram) {
    setBusy(diagram.id);
    await keepWhiteboardAction(diagram);
    setJustKept(diagram.id);
    setTimeout(() => setJustKept(null), 1800);
    setBusy(null);
    router.refresh();
  }

  function create() {
    const id = actions.createDiagram("Untitled whiteboard", "whiteboard");
    router.push(`/diagrams/${id}`);
  }

  return (
    <PageBody>
      <div className="rounded-lg border border-line bg-surface">
        <SectionHeader
          title="Whiteboards"
          description="Thinking out loud. Nothing here has to be correct, or finished, or reviewed."
          className="border-b border-line-soft px-4 py-3"
          action={
            <Button variant="primary" size="sm" onClick={create}>
              <Plus />
              New whiteboard
            </Button>
          }
        />

        <div className="border-b border-warning-border/60 bg-warning-bg/30 px-4 py-2.5">
          <p className="text-2xs leading-4 text-fg-body">
            <span className="font-semibold">Whiteboards are working surfaces.</span> Like every
            diagram in this application they live in your browser, and the overnight data refresh
            clears them. Press <span className="font-medium">Keep</span> on anything worth
            surviving that — it writes a copy to the repository that a refresh cannot touch.
          </p>
        </div>

        {live.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title="No whiteboards open"
            description="Start one before the next session, or when something needs drawing before it can be argued about."
            action={
              <Button variant="primary" size="sm" onClick={create}>
                <Plus />
                New whiteboard
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((board) => {
              const savedCopy = keptByDiagramId.get(board.id);
              const stale =
                savedCopy !== undefined && savedCopy.diagram.updatedAt !== board.updatedAt;

              return (
                <div
                  key={board.id}
                  className="flex flex-col rounded-lg border border-line bg-canvas"
                >
                  <Link
                    href={`/diagrams/${board.id}`}
                    className="flex-1 rounded-t-lg px-3.5 py-3 transition-colors hover:bg-subtle"
                  >
                    <p className="truncate text-sm font-medium text-fg">{board.name}</p>
                    {board.description && (
                      <p className="mt-1 line-clamp-2 text-2xs leading-4 text-fg-muted">
                        {board.description}
                      </p>
                    )}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-fg-subtle">
                      <span>{board.nodes.length} notes</span>
                      <span>Edited {formatRelative(board.updatedAt, snapshot.now)}</span>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 border-t border-line-soft px-3.5 py-2">
                    {savedCopy ? (
                      stale ? (
                        <Badge tone="warning">Kept copy is older</Badge>
                      ) : (
                        <Badge tone="success">Kept</Badge>
                      )
                    ) : (
                      <Badge tone="neutral">Not kept</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="xs"
                      className="ml-auto"
                      disabled={busy === board.id}
                      onClick={() => keep(board)}
                    >
                      {justKept === board.id ? <Check /> : <Archive />}
                      {justKept === board.id ? "Kept" : savedCopy ? "Keep again" : "Keep"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {kept.length > 0 && (
        <div className="rounded-lg border border-line bg-surface">
          <SectionHeader
            title="Kept in the repository"
            description="Durable copies. These survive a refresh, and show up in git alongside the session log."
            className="border-b border-line-soft px-4 py-3"
          />
          <div className="divide-y divide-line-soft">
            {kept.map((k) => {
              const isOrphan = orphaned.some((o) => o.file === k.file);
              return (
                <div key={k.file} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-fg">{k.diagram.name}</p>
                    <p className="mt-0.5 text-2xs text-fg-subtle">
                      Kept {formatDateTime(k.keptAt)} · {k.diagram.nodes.length} notes ·{" "}
                      <span className="font-mono">data/whiteboards/{k.file}</span>
                    </p>
                  </div>

                  {isOrphan ? (
                    <>
                      <Badge tone="critical">Wiped from the working set</Badge>
                      <Button
                        variant="secondary"
                        size="xs"
                        disabled={busy === k.file}
                        onClick={() => {
                          setBusy(k.file);
                          actions.restoreDiagram(k.diagram);
                          setBusy(null);
                          router.push(`/diagrams/${k.diagram.id}`);
                        }}
                      >
                        <RotateCcw />
                        Restore
                      </Button>
                    </>
                  ) : (
                    <Link
                      href={`/diagrams/${k.diagram.id}`}
                      className="text-2xs text-teal-700 hover:underline"
                    >
                      Open
                    </Link>
                  )}

                  <Button
                    variant="ghost"
                    size="iconXs"
                    aria-label={`Forget ${k.diagram.name}`}
                    disabled={busy === k.file}
                    onClick={async () => {
                      setBusy(k.file);
                      await forgetWhiteboardAction(k.file);
                      setBusy(null);
                      router.refresh();
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageBody>
  );
}
