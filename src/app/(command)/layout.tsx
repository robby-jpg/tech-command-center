import type { ReactNode } from "react";
import { AppChrome } from "@/components/app/app-chrome";

/**
 * The Command Center's shell.
 *
 * Everything the Tech Department uses lives under this group. The Employee
 * Portal sits in its own group with its own shell, so the two never share
 * navigation — which is what makes the portal liftable.
 */
export default function CommandLayout({ children }: { children: ReactNode }) {
  return <AppChrome>{children}</AppChrome>;
}
