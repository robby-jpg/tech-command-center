import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import type { ReactNode } from "react";
import { AppChrome } from "@/components/app/app-chrome";
import { getWorkspaceSnapshot } from "@/lib/data";
import "./globals.css";

/**
 * DM Sans carries the interface; Fraunces is reserved for the product identity.
 * Fraunces's axes are pinned in globals.css — loading the face without them
 * renders a different font entirely.
 */
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tech Command Center · Kind Home Solutions",
    template: "%s · Tech Command Center",
  },
  description:
    "The operating system for the Kind Home Solutions Tech Department: tickets, projects, systems, documentation and how they all connect.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b217a",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The whole working set is read once, on the server, through the data layer.
  // No component below this point imports a mock array.
  const snapshot = await getWorkspaceSnapshot();

  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-navy-600 focus:px-3 focus:py-2 focus:text-xs focus:text-white"
        >
          Skip to content
        </a>
        <AppChrome snapshot={snapshot}>{children}</AppChrome>
      </body>
    </html>
  );
}
