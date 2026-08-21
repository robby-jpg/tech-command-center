import type { Metadata } from "next";
import { SystemMapPage } from "@/components/system-map/system-map";

export const metadata: Metadata = {
  title: "System Map",
};

export default function Page() {
  return <SystemMapPage />;
}
