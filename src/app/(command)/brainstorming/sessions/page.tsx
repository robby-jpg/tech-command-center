import { getWorkspaceSnapshot } from "@/lib/data";
import { listSessions } from "@/lib/sessions";
import { SessionsPage } from "@/components/brainstorming/sessions-page";

/**
 * Sessions are read here rather than through the workspace snapshot on purpose
 * — they are files, not part of the mock dataset. See `lib/sessions.ts`.
 */
export default async function Page() {
  const [sessions, snapshot] = await Promise.all([listSessions(), getWorkspaceSnapshot()]);

  return (
    <SessionsPage
      sessions={sessions}
      users={snapshot.users}
      currentUserId={snapshot.currentUserId}
    />
  );
}
