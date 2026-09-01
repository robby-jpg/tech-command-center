"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/states";

/**
 * The route-level error boundary.
 *
 * Deliberately says what to do next rather than only that something failed.
 * The digest is shown because it is the only handle on the underlying error
 * once the message has been stripped in production.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Stands in for the error reporter this will eventually send to.
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="px-6 py-20">
      <ErrorState
        title="This page could not be loaded."
        description={
          error.digest
            ? `Something failed while rendering. Reference ${error.digest}.`
            : "Something failed while rendering this page."
        }
        action={
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={reset}>
              <RotateCcw />
              Try again
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/">Back to the Command Center</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
