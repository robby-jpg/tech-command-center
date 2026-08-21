import {
  DIAGRAM_TYPE_META,
  KNOWLEDGE_CATEGORY_META,
  TICKET_CATEGORY_META,
  TICKET_STATUS_META,
  PROJECT_STATUS_META,
  SYSTEM_HEALTH_META,
} from "@/domain";
import type { SearchResult } from "./data/types";
import type { WorkspaceSnapshot } from "./data/types";

/**
 * Search across everything the department knows.
 *
 * A pure function over a snapshot rather than a service call, so the command
 * palette can run it on every keystroke without a round trip. When the working
 * set outgrows the client, this becomes the reference implementation that a
 * server-side index has to match.
 */

type Field = { text: string; weight: number };

function scoreFields(fields: Field[], terms: string[]): number {
  let total = 0;
  for (const term of terms) {
    let best = 0;
    for (const field of fields) {
      const haystack = field.text.toLowerCase();
      const at = haystack.indexOf(term);
      if (at === -1) continue;
      // A match at a word boundary is worth more than one buried mid-word.
      const boundary = at === 0 || /[\s\-/(.,]/.test(haystack[at - 1] ?? "");
      const hit = field.weight * (boundary ? 1 : 0.55) * (at === 0 ? 1.35 : 1);
      if (hit > best) best = hit;
    }
    // Every term must appear somewhere, or the record is not a match at all.
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

export function searchSnapshot(
  snapshot: WorkspaceSnapshot,
  rawQuery: string,
  limit = 24,
): SearchResult[] {
  const terms = rawQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];
  const userName = (id: string | null) =>
    snapshot.users.find((u) => u.id === id)?.name ?? "Unassigned";

  for (const t of snapshot.tickets) {
    const score = scoreFields(
      [
        { text: t.ticketNumber, weight: 12 },
        { text: t.title, weight: 10 },
        { text: t.description, weight: 3 },
        { text: t.tags.join(" "), weight: 4 },
        { text: TICKET_CATEGORY_META[t.category].label, weight: 3 },
      ],
      terms,
    );
    if (score > 0) {
      results.push({
        id: t.id,
        type: "ticket",
        title: t.title,
        subtitle: `${t.ticketNumber} · ${TICKET_STATUS_META[t.status].label} · ${userName(t.assigneeId)}`,
        href: `/tickets/${t.id}`,
        badge: TICKET_CATEGORY_META[t.category].label,
        // Open work is almost always what someone is looking for.
        score: score + (TICKET_STATUS_META[t.status].open ? 6 : 0),
      });
    }
  }

  for (const p of snapshot.projects) {
    const score = scoreFields(
      [
        { text: p.name, weight: 11 },
        { text: p.description, weight: 3 },
        { text: p.businessGoal, weight: 2 },
        { text: p.tags.join(" "), weight: 4 },
        { text: p.initiative, weight: 3 },
      ],
      terms,
    );
    if (score > 0) {
      results.push({
        id: p.id,
        type: "project",
        title: p.name,
        subtitle: `${PROJECT_STATUS_META[p.status].label} · ${userName(p.ownerId)}`,
        href: `/projects/${p.id}`,
        badge: p.initiative,
        score: score + (PROJECT_STATUS_META[p.status].active ? 4 : 0),
      });
    }
  }

  for (const s of snapshot.systems) {
    const score = scoreFields(
      [
        { text: s.name, weight: 12 },
        { text: s.shortName, weight: 8 },
        { text: s.description, weight: 3 },
        { text: s.purpose, weight: 2 },
        { text: s.tags.join(" "), weight: 4 },
        { text: s.vendor ?? "", weight: 2 },
      ],
      terms,
    );
    if (score > 0) {
      results.push({
        id: s.id,
        type: "system",
        title: s.name,
        subtitle: `${SYSTEM_HEALTH_META[s.health].label} · ${s.ownerTeam}`,
        href: `/systems/${s.slug}`,
        badge: s.criticality === "critical" ? "Critical" : undefined,
        score,
      });
    }
  }

  for (const a of snapshot.articles) {
    const score = scoreFields(
      [
        { text: a.title, weight: 11 },
        { text: a.summary, weight: 5 },
        { text: a.content, weight: 2 },
        { text: a.tags.join(" "), weight: 5 },
      ],
      terms,
    );
    if (score > 0) {
      results.push({
        id: a.id,
        type: "article",
        title: a.title,
        subtitle: `${KNOWLEDGE_CATEGORY_META[a.category].label} · ${userName(a.authorId)}`,
        href: `/knowledge/${a.slug}`,
        badge: "Documentation",
        score,
      });
    }
  }

  for (const d of snapshot.diagrams) {
    const score = scoreFields(
      [
        { text: d.name, weight: 11 },
        { text: d.description, weight: 4 },
        { text: d.nodes.map((n) => n.label).join(" "), weight: 3 },
      ],
      terms,
    );
    if (score > 0) {
      results.push({
        id: d.id,
        type: "diagram",
        title: d.name,
        subtitle: `${DIAGRAM_TYPE_META[d.type].label} · ${d.nodes.length} nodes`,
        href: `/diagrams/${d.id}`,
        badge: DIAGRAM_TYPE_META[d.type].label,
        score,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
