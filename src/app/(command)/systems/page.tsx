import type { Metadata } from "next";
import { SystemsPage } from "@/components/systems/systems-page";

export const metadata: Metadata = {
  title: "Systems",
};

export default function Page() {
  return <SystemsPage />;
}
