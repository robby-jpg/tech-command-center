import type { Metadata } from "next";
import { DiagramsPage } from "@/components/diagrams/diagrams-page";

export const metadata: Metadata = {
  title: "Diagrams",
};

export default function Page() {
  return <DiagramsPage />;
}
