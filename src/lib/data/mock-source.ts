import { TICKET_STATUS_META } from "@/domain";
import { searchSnapshot } from "../search";
import { buildMockSnapshot } from "./mock";
import type { DataSource, TicketQuery, WorkspaceSnapshot } from "./types";

/**
 * The in-memory provider used by V1.
 *
 * Every method is async even though nothing here awaits anything. That is
 * deliberate — callers are written against a contract that will one day cross
 * a network, so swapping in Postgres or a Salesforce adapter is a change of
 * implementation rather than a change of every call site.
 */
export class MockDataSource implements DataSource {
  readonly name = "mock";

  private snapshot(): WorkspaceSnapshot {
    return buildMockSnapshot();
  }

  async getSnapshot() {
    return this.snapshot();
  }

  async getTickets(query: TicketQuery = {}) {
    const snap = this.snapshot();
    const search = query.search?.trim().toLowerCase();

    return snap.tickets.filter((t) => {
      if (query.openOnly && !TICKET_STATUS_META[t.status].open) return false;
      if (query.status?.length && !query.status.includes(t.status)) return false;
      if (query.priority?.length && !query.priority.includes(t.priority)) return false;
      if (query.category?.length && !query.category.includes(t.category)) return false;
      if (query.assigneeId !== undefined && t.assigneeId !== query.assigneeId) return false;
      if (
        query.requesterDepartment?.length &&
        !query.requesterDepartment.includes(t.requesterDepartment)
      ) {
        return false;
      }
      if (query.systemId && !t.relatedSystemIds.includes(query.systemId)) return false;
      if (query.projectId && t.relatedProjectId !== query.projectId) return false;
      if (
        search &&
        !`${t.ticketNumber} ${t.title} ${t.description}`.toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });
  }

  async getTicket(id: string) {
    const snap = this.snapshot();
    return (
      snap.tickets.find((t) => t.id === id || t.ticketNumber === id) ?? null
    );
  }

  async getProjects() {
    return this.snapshot().projects;
  }

  async getProject(id: string) {
    const snap = this.snapshot();
    return snap.projects.find((p) => p.id === id || p.slug === id) ?? null;
  }

  async getSystems() {
    return this.snapshot().systems;
  }

  async getSystem(slugOrId: string) {
    const snap = this.snapshot();
    return snap.systems.find((s) => s.slug === slugOrId || s.id === slugOrId) ?? null;
  }

  async getSystemGraph() {
    const snap = this.snapshot();
    return {
      systems: snap.systems,
      connections: snap.connections,
      layout: snap.systemMapLayout,
    };
  }

  async getDiagrams() {
    return this.snapshot().diagrams;
  }

  async getDiagram(idOrSlug: string) {
    const snap = this.snapshot();
    return snap.diagrams.find((d) => d.id === idOrSlug || d.slug === idOrSlug) ?? null;
  }

  async getArticles() {
    return this.snapshot().articles;
  }

  async getArticle(idOrSlug: string) {
    const snap = this.snapshot();
    return snap.articles.find((a) => a.id === idOrSlug || a.slug === idOrSlug) ?? null;
  }

  async getActivity(limit = 100) {
    return this.snapshot().activity.slice(0, limit);
  }

  async searchEverything(query: string, limit = 24) {
    return searchSnapshot(this.snapshot(), query, limit);
  }
}
