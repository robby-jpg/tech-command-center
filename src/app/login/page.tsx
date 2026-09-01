import type { Metadata } from "next";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { ALLOWED_DOMAIN } from "@/auth.config";
import { BrandMark } from "@/components/app/brand-mark";

export const metadata: Metadata = {
  title: "Sign in",
};

/**
 * The only page reachable without a session.
 *
 * It deliberately renders nothing from the data layer — no counts, no names,
 * no ticket titles. Everything an anonymous visitor can see is on this page,
 * so this page is allowed to know nothing.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { from, error } = await searchParams;

  async function signInWithGoogle() {
    "use server";
    try {
      await signIn("google", { redirectTo: safeReturnTo(from) });
    } catch (err) {
      // Auth.js signals a successful redirect by throwing; only a real
      // AuthError should land the visitor back here with a message.
      if (err instanceof AuthError) {
        redirect(`/login?error=${encodeURIComponent(err.type)}`);
      }
      throw err;
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <BrandMark className="h-9 w-auto" />
          <h1 className="font-display mt-5 text-xl font-semibold text-fg">
            Tech Command Center
          </h1>
          <p className="mt-1.5 text-sm text-fg-muted">
            Kind Home Solutions, Technology Department
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-line bg-surface p-6">
          {error ? (
            <p
              role="alert"
              className="mb-4 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-xs text-danger"
            >
              {messageFor(error)}
            </p>
          ) : null}

          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-md border border-line bg-canvas px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-subtle focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:outline-none"
            >
              <GoogleMark />
              Continue with Google
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-fg-subtle">
            Restricted to <span className="text-fg-muted">@{ALLOWED_DOMAIN}</span>{" "}
            accounts.
          </p>
        </div>
      </div>
    </main>
  );
}

/**
 * Only ever return to a path on this site. Without this, `?from=` is an open
 * redirect: a crafted link could bounce a colleague to an attacker's page
 * immediately after a genuine sign-in.
 */
function safeReturnTo(from: string | undefined): string {
  if (!from) return "/";
  if (!from.startsWith("/") || from.startsWith("//")) return "/";
  return from;
}

function messageFor(error: string): string {
  switch (error) {
    case "AccessDenied":
      return `That account is not a @${ALLOWED_DOMAIN} address. Sign in with your Kind Home account.`;
    case "Configuration":
      return "Sign-in is not configured correctly. Contact the Technology Department.";
    default:
      return "Sign-in did not complete. Please try again.";
  }
}

function GoogleMark() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
