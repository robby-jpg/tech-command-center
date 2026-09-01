import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

/**
 * The Auth.js instance.
 *
 * Configuration comes from `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
 * `OAUTH_CALLBACK_URL` and `ALLOWED_EMAIL_DOMAIN` — the same variable contract
 * the Estimator Portal and the SDR Portal use, so the Sevalla screens read the
 * same across all three. `AUTH_SECRET` signs the session cookie.
 *
 * The implementation differs from those two on purpose: they are bespoke Node
 * servers with a hand-rolled OAuth exchange, and this is a Next.js App Router
 * application. What transfers is the configuration surface and the domain
 * rule, not the code.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
