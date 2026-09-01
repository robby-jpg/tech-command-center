import type { Metadata } from "next";
import { PortalRequestDetail } from "@/components/portal/portal-request-detail";

export const metadata: Metadata = { title: "Request" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PortalRequestDetail ticketId={id} />;
}
