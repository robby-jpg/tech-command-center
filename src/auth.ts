import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

/**
 * The Auth.js instance.
 *
 * `AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are read from the
 * environment by convention — the names were already reserved in
 * `.env.example` before this was written.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
