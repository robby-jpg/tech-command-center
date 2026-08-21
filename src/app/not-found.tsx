import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/states";

export default function NotFound() {
  return (
    <div className="px-6 py-20">
      <EmptyState
        icon={Compass}
        title="There is nothing at this address."
        description="The link may be out of date, or the record may have been removed."
        action={
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" asChild>
              <Link href="/">Command Center</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/tickets">Tickets</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
