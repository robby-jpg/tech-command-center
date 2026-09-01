import "server-only";

import { auth } from "@/auth";
import type { User } from "@/domain";

/** The signed-in person, as Google described them. */
export type Viewer = {
  email: string;
  name: string | null;
};

/**
 * Read the session. Returns null when nobody is signed in.
 *
 * Everything above this treats null as "show nothing" rather than "show the
 * default user" — the previous behaviour of falling back to a hardcoded
 * identity is exactly what this change removes.
 */
export async function getViewer(): Promise<Viewer | null> {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return null;
  return { email, name: session?.user?.name?.trim() || null };
}

function initialsFor(name: string, email: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/**
 * Match the signed-in person to the staff directory.
 *
 * The directory is 29 real people resolved from the Slack intake channels, so
 * most colleagues who sign in are already in it and keep their department,
 * title and avatar colour. Anyone else at the company is a real person with a
 * verified company address who simply has not raised a ticket — they get a
 * placeholder record rather than being shown the application as somebody else,
 * which would misattribute anything they did.
 *
 * The placeholder is deliberately *not* added to `snapshot.users`: it would
 * then appear in assignment pickers and team lists as though it were a
 * directory entry.
 */
export function resolveViewerUser(users: User[], viewer: Viewer): User {
  const match = users.find(
    (u) => u.email.trim().toLowerCase() === viewer.email,
  );
  if (match) return match;

  const name = viewer.name ?? viewer.email.split("@")[0];
  return {
    id: `u-guest-${viewer.email.split("@")[0].replace(/[^a-z0-9]+/gi, "-")}`,
    name,
    initials: initialsFor(name, viewer.email),
    email: viewer.email,
    title: "Kind Home Solutions",
    department: "leadership",
    isTechTeam: false,
    slackId: null,
    clickUpId: null,
    accent: "info",
  };
}
