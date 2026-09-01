"use server";

import { signOut } from "@/auth";

/**
 * Sign out and return to the login page.
 *
 * A Server Action rather than the client `signOut()` helper so the session
 * cookie is cleared by the server that issued it, and so the sidebar stays a
 * plain client component with no auth library in its bundle.
 */
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
