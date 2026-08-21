import {
  Activity,
  BookOpen,
  ChartNoAxesColumn,
  FolderKanban,
  LayoutDashboard,
  Map,
  Network,
  Route,
  Server,
  Settings,
  Ticket,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Which counter, if any, appears on the right of the row. */
  badge?: "openTickets" | "attention" | "activeProjects";
  /** Shown in the header beneath the page title. */
  description: string;
  /** The question the page exists to answer. */
  purpose?: string;
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Command Center",
    items: [
      {
        href: "/",
        label: "Overview",
        icon: LayoutDashboard,
        badge: "attention",
        description: "What needs attention right now",
        purpose: "How is Tech doing?",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/tickets",
        label: "Tickets",
        icon: Ticket,
        badge: "openTickets",
        description: "Support work coming into the department",
      },
      {
        href: "/projects",
        label: "Projects",
        icon: FolderKanban,
        badge: "activeProjects",
        description: "Planned technology work the department is building",
      },
      {
        href: "/roadmap",
        label: "Roadmap",
        icon: Route,
        description: "Where technology at Kind Home is going",
      },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      {
        href: "/systems",
        label: "Systems",
        icon: Server,
        description: "Every platform the company runs on",
      },
      {
        href: "/system-map",
        label: "System Map",
        icon: Network,
        description: "How the estate connects, and what breaks if something fails",
      },
      {
        href: "/diagrams",
        label: "Diagrams",
        icon: Workflow,
        description: "Architecture, workflow and troubleshooting diagrams",
      },
    ],
  },
  {
    label: "Knowledge",
    items: [
      {
        href: "/knowledge",
        label: "Knowledge Base",
        icon: BookOpen,
        description: "How technology at Kind Home actually works",
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        href: "/analytics",
        label: "Analytics",
        icon: ChartNoAxesColumn,
        description: "Department performance and business impact",
      },
      {
        href: "/activity",
        label: "Activity",
        icon: Activity,
        description: "Everything that has changed",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        description: "Ticket configuration, SLA rules, team and integrations",
      },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

/** Icons for entities that are not top-level routes. */
export const ENTITY_ICONS = { Map } as const;

/**
 * Resolves the header title and subtitle for a path, including detail routes
 * which are not themselves in the navigation.
 */
export function resolvePageMeta(pathname: string): { label: string; description: string } {
  const exact = ALL_NAV_ITEMS.find((i) => i.href === pathname);
  if (exact) return { label: exact.label, description: exact.description };

  const section = ALL_NAV_ITEMS.filter((i) => i.href !== "/").find((i) =>
    pathname.startsWith(i.href),
  );
  if (section) return { label: section.label, description: section.description };

  return { label: "Tech Command Center", description: "Kind Home Solutions" };
}
