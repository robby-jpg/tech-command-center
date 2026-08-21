import type { User } from "@/domain";

/**
 * People. The Tech Department members can be assigned work; everyone else
 * appears as a requester.
 */
export const MOCK_USERS: User[] = [
  {
    id: "u-robby",
    name: "Robby Sutton",
    initials: "RS",
    email: "robby@kindhomesolutions.com",
    title: "Technology Manager",
    department: "tech",
    isTechTeam: true,
    accent: "navy",
  },
  {
    id: "u-michael",
    name: "Michael Sutton",
    initials: "MS",
    email: "michael@kindhomesolutions.com",
    title: "Director of Technology",
    department: "tech",
    isTechTeam: true,
    accent: "teal",
  },
  {
    id: "u-jonathan",
    name: "Jonathan Reyes",
    initials: "JR",
    email: "jonathan@kindhomesolutions.com",
    title: "Data & Analytics Engineer",
    department: "tech",
    isTechTeam: true,
    accent: "accent",
  },
  {
    id: "u-alexis",
    name: "Alexis Moreno",
    initials: "AM",
    email: "alexis@kindhomesolutions.com",
    title: "Systems Administrator",
    department: "tech",
    isTechTeam: true,
    accent: "info",
  },

  /* -- Requesters ---------------------------------------------------------- */
  {
    id: "u-crystal",
    name: "Crystal Vance",
    initials: "CV",
    email: "crystal@kindhomesolutions.com",
    title: "Project Consultant",
    department: "sales",
    isTechTeam: false,
    accent: "warning",
  },
  {
    id: "u-danielle",
    name: "Danielle Ochoa",
    initials: "DO",
    email: "danielle@kindhomesolutions.com",
    title: "Sales Manager",
    department: "sales",
    isTechTeam: false,
    accent: "success",
  },
  {
    id: "u-marcus",
    name: "Marcus Webb",
    initials: "MW",
    email: "marcus@kindhomesolutions.com",
    title: "Production Manager",
    department: "production",
    isTechTeam: false,
    accent: "navy",
  },
  {
    id: "u-priya",
    name: "Priya Raman",
    initials: "PR",
    email: "priya@kindhomesolutions.com",
    title: "Operations Coordinator",
    department: "operations",
    isTechTeam: false,
    accent: "teal",
  },
  {
    id: "u-tyler",
    name: "Tyler Brennan",
    initials: "TB",
    email: "tyler@kindhomesolutions.com",
    title: "Marketing Manager",
    department: "marketing",
    isTechTeam: false,
    accent: "accent",
  },
  {
    id: "u-sofia",
    name: "Sofia Delgado",
    initials: "SD",
    email: "sofia@kindhomesolutions.com",
    title: "Controller",
    department: "finance",
    isTechTeam: false,
    accent: "info",
  },
  {
    id: "u-nathan",
    name: "Nathan Cole",
    initials: "NC",
    email: "nathan@kindhomesolutions.com",
    title: "Customer Experience Lead",
    department: "customer_experience",
    isTechTeam: false,
    accent: "warning",
  },
  {
    id: "u-erin",
    name: "Erin Wallace",
    initials: "EW",
    email: "erin@kindhomesolutions.com",
    title: "Holiday Lights Manager",
    department: "holiday_lights",
    isTechTeam: false,
    accent: "success",
  },
  {
    id: "u-dana",
    name: "Dana Whitfield",
    initials: "DW",
    email: "dana@kindhomesolutions.com",
    title: "President",
    department: "leadership",
    isTechTeam: false,
    accent: "navy",
  },
];

/**
 * The signed-in user.
 *
 * V1 has no authentication. This is the single place the application decides
 * who it is talking to, so wiring real identity later means replacing this
 * function — not hunting for assumptions scattered through components.
 */
export const CURRENT_USER_ID = "u-robby";

export const TECH_TEAM = MOCK_USERS.filter((u) => u.isTechTeam);
