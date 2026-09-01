import type { Metadata } from "next";
import { RoadmapPage } from "@/components/roadmap/roadmap-page";

export const metadata: Metadata = {
  title: "Roadmap",
};

export default function Page() {
  return <RoadmapPage />;
}
