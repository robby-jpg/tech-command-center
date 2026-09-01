import type { Metadata } from "next";
import { PortalHome } from "@/components/portal/portal-home";

export const metadata: Metadata = { title: "Your requests" };

export default function Page() {
  return <PortalHome />;
}
