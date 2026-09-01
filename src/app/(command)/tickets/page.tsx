import type { Metadata } from "next";
import { Suspense } from "react";
import { TicketsPage } from "@/components/tickets/tickets-page";
import { PageSkeleton } from "@/components/shared/states";

export const metadata: Metadata = {
  title: "Tickets",
};

export default function Page() {
  // The view reads the initial filter state from the URL, which requires a
  // Suspense boundary above useSearchParams.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TicketsPage />
    </Suspense>
  );
}
