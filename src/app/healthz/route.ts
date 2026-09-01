import { NextResponse } from "next/server";
import { ALLOWED_DOMAIN, OAUTH_CALLBACK_URL } from "@/auth.config";

export const dynamic = "force-dynamic";

/**
 * Open health endpoint, matching the shape the other Kind Home tools report.
 *
 * The SDR Portal's runbook uses this to answer "is the deployed thing actually
 * gated?" without signing in, because a default-open deploy looks exactly like
 * a working one. Excluded from the proxy matcher so the platform can probe it.
 *
 * `gated` is unconditionally true here: this application has no password mode
 * and no public mode. `mode` reports whether Google is actually configured, so
 * a deploy missing its credentials is visible rather than only showing up as a
 * failed sign-in.
 */
export function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID;
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET;
  const configured = Boolean(clientId && clientSecret);

  return NextResponse.json({
    ok: true,
    mode: configured ? "GOOGLE" : "UNCONFIGURED",
    gated: true,
    domain: ALLOWED_DOMAIN,
    callbackConfigured: Boolean(OAUTH_CALLBACK_URL),
  });
}
