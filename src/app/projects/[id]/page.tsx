import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectDetail } from "@/components/projects/project-detail";
import { PageSkeleton } from "@/components/shared/states";
import { getProject } from "@/lib/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);
  return { title: project?.name ?? "Project" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The workspace reads its opening tab from the URL.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProjectDetail projectId={id} />
    </Suspense>
  );
}
