import type { Metadata } from "next";
import { CommandCenter } from "@/components/overview/command-center";

export const metadata: Metadata = {
  title: "Command Center",
};

export default function OverviewPage() {
  return <CommandCenter />;
}
