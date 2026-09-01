import type { Metadata } from "next";
import { TicketDetail } from "@/components/tickets/ticket-detail";
import { getTicket } from "@/lib/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ticket = await getTicket(id);
  return {
    title: ticket ? `${ticket.ticketNumber} — ${ticket.title}` : "Ticket",
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TicketDetail ticketId={id} />;
}
