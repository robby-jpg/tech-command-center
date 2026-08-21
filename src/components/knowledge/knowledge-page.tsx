"use client";

import Link from "next/link";
import * as React from "react";
import * as Icons from "lucide-react";
import { BookOpen, Plus, Search } from "lucide-react";
import {
  KNOWLEDGE_CATEGORY_META,
  KNOWLEDGE_CATEGORY_ORDER,
  readingMinutes,
  type KnowledgeArticle,
  type KnowledgeCategory,
} from "@/domain";
import { systemsByIds, userById } from "@/lib/selectors";
import { useSnapshot } from "@/lib/store/workspace-store";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/filter-bar";
import { PageBody } from "@/components/shared/page";
import { EmptyState } from "@/components/shared/states";
import { SystemBadge, UserChip } from "@/components/shared/indicators";
import { useChrome } from "@/components/app/app-chrome";

function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Resolved =
    (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ??
    BookOpen;
  return <Resolved className={className} />;
}

export function KnowledgePage() {
  const snapshot = useSnapshot();
  const { openQuickCreate } = useChrome();
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<KnowledgeCategory | "all">("all");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return snapshot.articles.filter((article) => {
      if (category !== "all" && article.category !== category) return false;
      if (
        q &&
        !`${article.title} ${article.summary} ${article.content} ${article.tags.join(" ")}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [snapshot.articles, search, category]);

  const mostRead = React.useMemo(
    () => [...snapshot.articles].sort((a, b) => b.views - a.views).slice(0, 4),
    [snapshot.articles],
  );

  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const article of snapshot.articles) {
      counts[article.category] = (counts[article.category] ?? 0) + 1;
    }
    return counts;
  }, [snapshot.articles]);

  return (
    <PageBody>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl leading-tight text-fg">
            How technology at Kind Home works.
          </h2>
          <p className="mt-1 text-xs text-fg-muted">
            {snapshot.articles.length} articles across {KNOWLEDGE_CATEGORY_ORDER.length}{" "}
            categories.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search documentation…"
            className="w-72"
          />
          <Button variant="primary" size="sm" onClick={() => openQuickCreate("article")}>
            <Plus />
            New article
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
        {/* Categories */}
        <nav aria-label="Categories" className="space-y-0.5">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={cn(
              "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
              category === "all"
                ? "bg-teal-50 font-medium text-fg"
                : "text-fg-muted hover:bg-subtle hover:text-fg",
            )}
          >
            <BookOpen className="size-3.5 shrink-0 text-fg-subtle" />
            <span className="flex-1">All articles</span>
            <span className="tabular text-[10px] text-fg-subtle">
              {snapshot.articles.length}
            </span>
          </button>

          {KNOWLEDGE_CATEGORY_ORDER.filter((c) => (categoryCounts[c] ?? 0) > 0).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                category === c
                  ? "bg-teal-50 font-medium text-fg"
                  : "text-fg-muted hover:bg-subtle hover:text-fg",
              )}
            >
              <CategoryIcon
                name={KNOWLEDGE_CATEGORY_META[c].icon}
                className="size-3.5 shrink-0 text-fg-subtle"
              />
              <span className="flex-1 truncate">{KNOWLEDGE_CATEGORY_META[c].label}</span>
              <span className="tabular text-[10px] text-fg-subtle">
                {categoryCounts[c]}
              </span>
            </button>
          ))}
        </nav>

        <div className="space-y-5">
          {search.trim() === "" && category === "all" && mostRead.length > 0 && (
            <section>
              <h3 className="mb-2 text-2xs font-semibold tracking-wide text-fg-subtle uppercase">
                Most opened
              </h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {mostRead.map((article) => (
                  <Link
                    key={article.id}
                    href={`/knowledge/${article.slug}`}
                    className="card-interactive flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5 shadow-xs"
                  >
                    <CategoryIcon
                      name={KNOWLEDGE_CATEGORY_META[article.category].icon}
                      className="size-4 shrink-0 text-teal-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-fg">
                        {article.title}
                      </span>
                      <span className="block truncate text-[10px] text-fg-subtle">
                        {article.views} opens · {readingMinutes(article.content)} min read
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={Search}
                title={`Nothing matched “${search.trim()}”.`}
                description="Try a system name, an error message, or the name of the thing that broke."
              />
            </Card>
          ) : (
            <section className="space-y-2">
              <h3 className="text-2xs font-semibold tracking-wide text-fg-subtle uppercase">
                {category === "all"
                  ? "All articles"
                  : KNOWLEDGE_CATEGORY_META[category].label}
                <span className="ml-2 font-normal">{filtered.length}</span>
              </h3>
              <div className="space-y-2">
                {filtered.map((article) => (
                  <ArticleRow key={article.id} article={article} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </PageBody>
  );
}

function ArticleRow({ article }: { article: KnowledgeArticle }) {
  const snapshot = useSnapshot();
  const author = userById(snapshot, article.authorId);
  const systems = systemsByIds(snapshot, article.relatedSystemIds);

  return (
    <Link
      href={`/knowledge/${article.slug}`}
      className="card-interactive block rounded-lg border border-line bg-surface p-4 shadow-xs"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-fg">{article.title}</h4>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-fg-muted">
            {article.summary}
          </p>
        </div>
        <span className="shrink-0 rounded-sm bg-subtle px-1.5 py-0.5 text-[10px] text-fg-muted">
          {KNOWLEDGE_CATEGORY_META[article.category].label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-2.5">
        <div className="flex items-center gap-3">
          <UserChip user={author} muted />
          <span className="text-[10px] text-fg-subtle">
            Updated {formatDate(article.updatedAt)} · {readingMinutes(article.content)} min
            read
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {systems.slice(0, 3).map((s) => (
            <SystemBadge key={s.id} system={s} />
          ))}
        </div>
      </div>
    </Link>
  );
}

export { CategoryIcon };
