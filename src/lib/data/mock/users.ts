import type { User } from "@/domain";

/**
 * People, taken from the real ClickUp workspace membership and from the
 * handles that appear on tickets raised through the Slack intake form.
 *
 * Where only a handle is known, the display name is that handle capitalised
 * rather than an invented surname — a wrong surname on a real colleague is
 * worse than an incomplete one. Those records carry `clickUpId: null`, which
 * is also how the importer knows they still need reconciling against a
 * directory.
 */
export const MOCK_USERS: User[] = [
  /* -- Tech Department ------------------------------------------------------ */
  {
    id: "u-robby",
    name: "Robby Barton",
    initials: "RB",
    email: "robby@kindhomesolutions.com",
    title: "Technology Manager",
    department: "tech",
    isTechTeam: true,
    slackHandle: "robby",
    clickUpId: 50313351,
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
    slackHandle: "michael",
    clickUpId: 50313342,
    accent: "teal",
  },
  {
    id: "u-jonathan",
    name: "Jonathan Keller",
    initials: "JK",
    email: "jonathan.keller@kindhomesolutions.com",
    title: "Business Intelligence",
    department: "tech",
    isTechTeam: true,
    slackHandle: "jonathan.keller",
    clickUpId: 138033218,
    accent: "accent",
  },

  /* -- Leadership ----------------------------------------------------------- */
  {
    id: "u-kendall",
    name: "Kendall Bell",
    initials: "KB",
    email: "kendall.bell@kindhomesolutions.com",
    title: "Operations Leadership",
    department: "leadership",
    isTechTeam: false,
    slackHandle: "kendall.bell",
    clickUpId: 89317248,
    accent: "info",
  },
  {
    id: "u-lindsay",
    name: "Lindsay",
    initials: "L",
    email: "lindsay@kindhomesolutions.com",
    title: "Leadership",
    department: "leadership",
    isTechTeam: false,
    slackHandle: "lindsay",
    clickUpId: null,
    accent: "warning",
  },

  /* -- Marketing ------------------------------------------------------------ */
  {
    id: "u-corey",
    name: "Corey Morgan",
    initials: "CM",
    email: "corey@kindhomesolutions.com",
    title: "Marketing",
    department: "marketing",
    isTechTeam: false,
    slackHandle: "corey",
    clickUpId: 96270691,
    accent: "success",
  },
  {
    id: "u-zach",
    name: "Zach Worley",
    initials: "ZW",
    email: "khp@storystak.com",
    title: "Marketing Partner — Storystak",
    department: "marketing",
    isTechTeam: false,
    slackHandle: null,
    clickUpId: 101189716,
    accent: "accent",
  },

  /* -- Customer Account Management ------------------------------------------ */
  {
    id: "u-jessie",
    name: "Jessie Greathouse",
    initials: "JG",
    email: "jessie.greathouse@kindhomesolutions.com",
    title: "Customer Account Manager",
    department: "cam",
    isTechTeam: false,
    slackHandle: "jessie.greathouse",
    clickUpId: 89347961,
    accent: "teal",
  },
  {
    id: "u-jenae",
    name: "Jenae Sanchez",
    initials: "JS",
    email: "jenae.sanchez@kindhomesolutions.com",
    title: "Customer Account Manager",
    department: "cam",
    isTechTeam: false,
    slackHandle: "jenae.sanchez",
    clickUpId: null,
    accent: "info",
  },
  {
    id: "u-chloe",
    name: "Chloe",
    initials: "C",
    email: "chloe@kindhomesolutions.com",
    title: "Customer Account Management",
    department: "cam",
    isTechTeam: false,
    slackHandle: "chloe",
    clickUpId: null,
    accent: "warning",
  },

  /* -- Sales Development ---------------------------------------------------- */
  {
    id: "u-treven",
    name: "Treven",
    initials: "T",
    email: "treven@kindhomesolutions.com",
    title: "SDR Manager",
    department: "sdr",
    isTechTeam: false,
    slackHandle: "treven",
    clickUpId: null,
    accent: "navy",
  },

  /* -- Sales / Estimating --------------------------------------------------- */
  {
    id: "u-crystal",
    name: "Crystal Guess",
    initials: "CG",
    email: "crystal@kindhomesolutions.com",
    title: "Project Consultant",
    department: "est",
    isTechTeam: false,
    slackHandle: "crystal",
    clickUpId: null,
    accent: "success",
  },
  {
    id: "u-terah",
    name: "Terah",
    initials: "T",
    email: "terah@kindhomesolutions.com",
    title: "Project Consultant",
    department: "est",
    isTechTeam: false,
    slackHandle: "terah",
    clickUpId: null,
    accent: "teal",
  },

  /* -- Production ----------------------------------------------------------- */
  {
    id: "u-kyle",
    name: "Kyle Wetherill",
    initials: "KW",
    email: "kyle.wetherill@kindhomesolutions.com",
    title: "Production",
    department: "production",
    isTechTeam: false,
    slackHandle: "kyle.wetherill",
    clickUpId: null,
    accent: "info",
  },
  {
    id: "u-stephen",
    name: "Stephen Andzuzewski",
    initials: "SA",
    email: "stephen.andzuzewski@kindhomesolutions.com",
    title: "Production",
    department: "production",
    isTechTeam: false,
    slackHandle: "stephen.andzuzewski",
    clickUpId: null,
    accent: "navy",
  },
  {
    id: "u-yasmine",
    name: "Yasmine",
    initials: "Y",
    email: "yasmine@kindhomesolutions.com",
    title: "Project Manager",
    department: "pm",
    isTechTeam: false,
    slackHandle: "yasmine",
    clickUpId: null,
    accent: "accent",
  },
];

/**
 * The signed-in user.
 *
 * V1 has no authentication. This is the single place the application decides
 * who it is talking to, so wiring real identity later means replacing this
 * value — not hunting for assumptions scattered through components.
 */
export const CURRENT_USER_ID = "u-robby";

export const TECH_TEAM = MOCK_USERS.filter((u) => u.isTechTeam);

/** Resolves a Slack handle from the intake form to a person, if we know them. */
export function userBySlackHandle(handle: string): User | null {
  const normalised = handle.replace(/^@/, "").toLowerCase();
  return (
    MOCK_USERS.find((u) => u.slackHandle?.toLowerCase() === normalised) ?? null
  );
}

/** Resolves a ClickUp assignee id to a person. */
export function userByClickUpId(clickUpId: number): User | null {
  return MOCK_USERS.find((u) => u.clickUpId === clickUpId) ?? null;
}
