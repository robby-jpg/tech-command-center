import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

/**
 * Who is allowed in.
 *
 * The Command Center shows real ticket text, the staff directory and the
 * systems inventory, so the gate is a company-domain check rather than a
 * general "any Google account" sign-in.
 *
 * Overridable so a future domain change is a configuration edit rather than a
 * deploy of new code.
 */
export const ALLOWED_DOMAIN = (
  process.env.AUTH_ALLOWED_DOMAIN?.trim() || "kindhomesolutions.com"
).toLowerCase();

/**
 * The domain check, done properly.
 *
 * Three claims are checked, and all three matter:
 *
 *   `hd`              Google sets the hosted-domain claim only for Workspace
 *                     accounts belonging to that domain. This is the real
 *                     control. A personal account cannot obtain it.
 *   `email_verified`  Guards against an unverified address being asserted.
 *   `email` suffix    Belt and braces; catches a Workspace alias domain that
 *                     shares `hd` but not the mail domain.
 *
 * The `hd` parameter passed to Google in the authorization request below is
 * only a UI hint — Google is free to ignore it and will happily return a
 * personal account. It is *not* a security control. This function is.
 */
export function isAllowedProfile(profile: unknown): boolean {
  if (!profile || typeof profile !== "object") return false;
  const claims = profile as Record<string, unknown>;

  const hostedDomain =
    typeof claims.hd === "string" ? claims.hd.trim().toLowerCase() : null;
  const email =
    typeof claims.email === "string" ? claims.email.trim().toLowerCase() : null;

  if (claims.email_verified !== true) return false;
  if (hostedDomain !== ALLOWED_DOMAIN) return false;
  if (!email || !email.endsWith(`@${ALLOWED_DOMAIN}`)) return false;

  return true;
}

/**
 * Configuration shared by the proxy and the route handlers.
 *
 * Kept free of anything Node-specific so it stays cheap to evaluate on every
 * request in `proxy.ts`.
 */
export const authConfig = {
  providers: [
    Google({
      authorization: {
        params: {
          // A hint to Google's account chooser, not a guarantee — see above.
          hd: ALLOWED_DOMAIN,
          prompt: "select_account",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    /** The gate. Returning false aborts the sign-in and returns to /login. */
    signIn({ profile }) {
      return isAllowedProfile(profile);
    },
    /**
     * Carry identity on the token. There is no user table to look anything up
     * in — the session *is* the record, and the directory in the dataset is
     * matched against it by email at read time.
     */
    jwt({ token, profile }) {
      if (profile) {
        const claims = profile as Record<string, unknown>;
        if (typeof claims.email === "string") {
          token.email = claims.email.trim().toLowerCase();
        }
        if (typeof claims.name === "string") token.name = claims.name;
        if (typeof claims.picture === "string") token.picture = claims.picture;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (typeof token.email === "string") session.user.email = token.email;
        if (typeof token.name === "string") session.user.name = token.name;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
