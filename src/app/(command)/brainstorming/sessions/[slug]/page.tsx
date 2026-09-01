import { notFound } from "next/navigation";
import { getWorkspaceSnapshot } from "@/lib/data";
import { getSession } from "@/lib/sessions";
import { SessionDetail } from "@/components/brainstorming/session-detail";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [session, snapshot] = await Promise.all([getSession(slug), getWorkspaceSnapshot()]);

  if (!session) notFound();

  return (
    <SessionDetail
      session={session}
      users={snapshot.users}
      systems={snapshot.systems}
      projects={snapshot.projects}
    />
  );
}
