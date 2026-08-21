"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowLeft, BookOpen, Server, Ticket as TicketIcon, Workflow } from "lucide-react";
import {
  KNOWLEDGE_CATEGORY_META,
  TICKET_STATUS_META,
  readingMinutes,
} from "@/domain";
import { systemsByIds, userById } from "@/lib/selectors";
import { useSnapshot } from "@/lib/store/workspace-store";
import { formatDate } from "@/lib/format";
import { Markdown, extractHeadings } from "@/lib/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/states";
import { SystemBadge, UserChip } from "@/components/shared/indicators";
import { CategoryIcon } from "./knowledge-page";

export function ArticleDetail({ slug }: { slug: string }) {
  const snapshot = useSnapshot();
  const article = snapshot.articles.find((a) => a.slug === slug || a.id === slug);

  const headings = React.useMemo(
    () => (article ? extractHeadings(article.content) : []),
    [article],
  );

  if (!article) {
    return (
      <div className="px-6 py-16">
        <EmptyState
          icon={BookOpen}
          title="That article does not exist."
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href="/knowledge">Back to the knowledge base</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const author = userById(snapshot, article.authorId);
  const systems = systemsByIds(snapshot, article.relatedSystemIds);
  const projects = snapshot.projects.filter((p) =>
    article.relatedProjectIds.includes(p.id),
  );
  const diagrams = snapshot.diagrams.filter(
    (d) => article.relatedDiagramIds.includes(d.id) || d.relatedArticleIds.includes(article.id),
  );
  const tickets = snapshot.tickets.filter((t) =>
    article.relatedTicketIds.includes(t.id),
  );

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-5">
      <Link
        href="/knowledge"
        className="inline-flex items-center gap-1 text-2xs font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3" />
        Knowledge base
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <article className="min-w-0">
          <header className="border-b border-line pb-4">
            <div className="flex items-center gap-2">
              <CategoryIcon
                name={KNOWLEDGE_CATEGORY_META[article.category].icon}
                className="size-3.5 text-teal-600"
              />
              <span className="text-2xs font-medium text-fg-muted">
                {KNOWLEDGE_CATEGORY_META[article.category].label}
              </span>
            </div>

            <h1 className="mt-1.5 text-2xl leading-tight font-semibold text-fg">
              {article.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-fg-muted">
              {article.summary}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <UserChip user={author} />
              <span className="text-2xs text-fg-subtle">
                Updated {formatDate(article.updatedAt)}
              </span>
              <span className="text-2xs text-fg-subtle">
                {readingMinutes(article.content)} min read
              </span>
              <span className="text-2xs text-fg-subtle">{article.views} opens</span>
            </div>

            {article.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-sm bg-subtle px-1.5 py-0.5 text-[10px] text-fg-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          <div className="mt-6 max-w-2xl">
            <Markdown content={article.content} />
          </div>
        </article>

        <aside className="space-y-4">
          {headings.length > 2 && (
            <Card>
              <CardHeader>
                <CardTitle>On this page</CardTitle>
              </CardHeader>
              <ul className="space-y-1 px-4 py-3">
                {headings.map((heading, index) => (
                  <li
                    key={index}
                    className={heading.level === 3 ? "pl-3" : undefined}
                  >
                    <span className="block truncate text-xs text-fg-muted">
                      {heading.text}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {systems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <Server className="mr-1.5 inline size-3.5 text-fg-subtle" />
                  Systems
                </CardTitle>
              </CardHeader>
              <div className="flex flex-wrap gap-1.5 px-4 py-3">
                {systems.map((system) => (
                  <SystemBadge
                    key={system.id}
                    system={system}
                    href={`/systems/${system.slug}`}
                    showHealth
                  />
                ))}
              </div>
            </Card>
          )}

          {diagrams.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>
                  <Workflow className="mr-1.5 inline size-3.5 text-fg-subtle" />
                  Diagrams
                </CardTitle>
              </CardHeader>
              <ul className="divide-y divide-line-soft">
                {diagrams.map((diagram) => (
                  <li key={diagram.id}>
                    <Link
                      href={`/diagrams/${diagram.id}`}
                      className="block px-4 py-2 transition-colors hover:bg-subtle"
                    >
                      <span className="block truncate text-xs font-medium text-fg">
                        {diagram.name}
                      </span>
                      <span className="block truncate text-[10px] text-fg-subtle">
                        {diagram.nodes.length} nodes
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {projects.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Projects</CardTitle>
              </CardHeader>
              <ul className="divide-y divide-line-soft">
                {projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      className="block truncate px-4 py-2 text-xs text-fg transition-colors hover:bg-subtle"
                    >
                      {project.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {tickets.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>
                  <TicketIcon className="mr-1.5 inline size-3.5 text-fg-subtle" />
                  Tickets that led here
                </CardTitle>
              </CardHeader>
              <ul className="divide-y divide-line-soft">
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="flex items-start gap-2 px-4 py-2 transition-colors hover:bg-subtle"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-fg">
                          {ticket.title}
                        </span>
                        <span className="text-[10px] text-fg-subtle">
                          {ticket.ticketNumber}
                        </span>
                      </span>
                      <Badge tone={TICKET_STATUS_META[ticket.status].tone}>
                        {TICKET_STATUS_META[ticket.status].label}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
