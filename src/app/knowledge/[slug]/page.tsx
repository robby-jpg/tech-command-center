import type { Metadata } from "next";
import { ArticleDetail } from "@/components/knowledge/article-detail";
import { getArticle, getArticles } from "@/lib/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  return {
    title: article?.title ?? "Article",
    description: article?.summary,
  };
}

export async function generateStaticParams() {
  const articles = await getArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ArticleDetail slug={slug} />;
}
