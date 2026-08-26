import type { User } from "@/domain";

/**
 * People, resolved from the Slack intake channels.
 *
 * Every request raised through the ticket form carries the submitter as a real
 * Slack mention — `<@U04LVDK3A4Q|Jessie Greathouse>` — so names and ids here are
 * the genuine ones rather than handles guessed from a ClickUp paste. That is
 * the single biggest reason Slack is the source of truth: ClickUp's copy of the
 * same request throws the identity away.
 *
 * `slackId` is the join key. `clickUpId` is only set for the three people who
 * have ClickUp accounts.
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
    slackId: "U01T26X8N3Y",
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
    slackId: "UJLC2U6P8",
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
    slackId: null,
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
    slackId: null,
    clickUpId: 89317248,
    accent: "info",
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
    slackId: "UMFCCGKN0",
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
    slackId: null,
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
    slackId: "U04LVDK3A4Q",
    clickUpId: 89347961,
    accent: "teal",
  },
  {
    id: "u-morgan",
    name: "Morgan James",
    initials: "MJ",
    email: "morgan@kindhomesolutions.com",
    title: "Customer Account Manager",
    department: "cam",
    isTechTeam: false,
    slackId: "U03HBGFSCU8",
    clickUpId: null,
    accent: "warning",
  },

  /* -- Sales Development ---------------------------------------------------- */
  {
    id: "u-treven",
    name: "Treven Crist",
    initials: "TC",
    email: "treven@kindhomesolutions.com",
    title: "SDR Manager",
    department: "sdr",
    isTechTeam: false,
    slackId: "UMFS7V66R",
    clickUpId: null,
    accent: "navy",
  },
  {
    id: "u-chloe",
    name: "Chloe Hackathorn",
    initials: "CH",
    email: "chloe@kindhomesolutions.com",
    title: "SDR Team Lead",
    department: "sdr",
    isTechTeam: false,
    slackId: "U07E7U3LJ48",
    clickUpId: null,
    accent: "info",
  },

  /* -- Estimating (the #it-ticketing-sales channel uses the EST form) ------- */
  {
    id: "u-tom",
    name: "Tom",
    initials: "T",
    email: "tom@kindhomesolutions.com",
    title: "Project Consultant",
    department: "est",
    isTechTeam: false,
    slackId: "UM4D0D3T5",
    clickUpId: null,
    accent: "success",
  },
  {
    id: "u-seth",
    name: "Seth Erdman",
    initials: "SE",
    email: "seth@kindhomesolutions.com",
    title: "Project Consultant",
    department: "est",
    isTechTeam: false,
    slackId: "U055GDPHFJB",
    clickUpId: null,
    accent: "teal",
  },
  {
    id: "u-kyle",
    name: "Kyle Wetherill",
    initials: "KW",
    email: "kyle.wetherill@kindhomesolutions.com",
    title: "Project Consultant",
    department: "est",
    isTechTeam: false,
    slackId: "U05DKEGJXUH",
    clickUpId: null,
    accent: "info",
  },
  {
    id: "u-crystal",
    name: "Crystal Guess",
    initials: "CG",
    email: "crystal@kindhomesolutions.com",
    title: "Project Consultant",
    department: "est",
    isTechTeam: false,
    slackId: "U08L3HLE68N",
    clickUpId: null,
    accent: "warning",
  },
  {
    id: "u-dakota",
    name: "Dakota Hove",
    initials: "DH",
    email: "dakota@kindhomesolutions.com",
    title: "Project Consultant",
    department: "est",
    isTechTeam: false,
    slackId: "U05GGFA4JLX",
    clickUpId: null,
    accent: "accent",
  },
  {
    id: "u-joshua",
    name: "Joshua Van Hansen",
    initials: "JV",
    email: "joshua@kindhomesolutions.com",
    title: "Project Consultant",
    department: "est",
    isTechTeam: false,
    slackId: "U09535CLVCK",
    clickUpId: null,
    accent: "navy",
  },
  {
    id: "u-glen",
    name: "Glen Reinecke",
    initials: "GR",
    email: "glen@kindhomesolutions.com",
    title: "Project Consultant",
    department: "est",
    isTechTeam: false,
    slackId: "U05H9LJ1L9X",
    clickUpId: null,
    accent: "success",
  },
  {
    id: "u-ryota",
    name: "Ryota Nishimura",
    initials: "RN",
    email: "ryota@kindhomesolutions.com",
    title: "Project Consultant",
    department: "est",
    isTechTeam: false,
    slackId: "UMFCCH0KE",
    clickUpId: null,
    accent: "teal",
  },
  {
    id: "u-andy",
    name: "Andy",
    initials: "A",
    email: "andy@kindhomesolutions.com",
    title: "Project Consultant",
    department: "est",
    isTechTeam: false,
    slackId: "U08EXQ47A05",
    clickUpId: null,
    accent: "warning",
  },
  {
    id: "u-hunter",
    name: "Hunter Logan",
    initials: "HL",
    email: "hunter@kindhomesolutions.com",
    title: "Sales Leadership",
    department: "est",
    isTechTeam: false,
    slackId: null,
    clickUpId: null,
    accent: "info",
  },

  /* -- Production and Project Management ------------------------------------ */
  {
    id: "u-lindsay",
    name: "Lindsay Jo",
    initials: "LJ",
    email: "lindsay@kindhomesolutions.com",
    title: "Production Leadership",
    department: "production",
    isTechTeam: false,
    slackId: "U01VBCVP38X",
    clickUpId: null,
    accent: "warning",
  },
  {
    id: "u-lia",
    name: "Lia Schiavone",
    initials: "LS",
    email: "lia@kindhomesolutions.com",
    title: "Project Manager",
    department: "pm",
    isTechTeam: false,
    slackId: "U06MLLJ2CMD",
    clickUpId: null,
    accent: "accent",
  },
  {
    id: "u-becki",
    name: "Becki Stuckart",
    initials: "BS",
    email: "becki@kindhomesolutions.com",
    title: "Project Manager",
    department: "pm",
    isTechTeam: false,
    slackId: "U0B059NHQAE",
    clickUpId: null,
    accent: "teal",
  },
  {
    id: "u-jeremy",
    name: "Jeremy Patlen",
    initials: "JP",
    email: "jeremy@kindhomesolutions.com",
    title: "Project Manager",
    department: "pm",
    isTechTeam: false,
    slackId: "U08HUG1TBPH",
    clickUpId: null,
    accent: "navy",
  },
  {
    id: "u-steve",
    name: "Steve A.",
    initials: "SA",
    email: "steve@kindhomesolutions.com",
    title: "Production",
    department: "production",
    isTechTeam: false,
    slackId: "U05J41SEW8P",
    clickUpId: null,
    accent: "success",
  },
  {
    id: "u-kurt",
    name: "Kurt ODonnell",
    initials: "KO",
    email: "kurt@kindhomesolutions.com",
    title: "Production",
    department: "production",
    isTechTeam: false,
    slackId: "U05BM5YMR26",
    clickUpId: null,
    accent: "info",
  },
  {
    id: "u-todd",
    name: "Todd Stanton",
    initials: "TS",
    email: "todd@kindhomesolutions.com",
    title: "Production",
    department: "production",
    isTechTeam: false,
    slackId: "U0AQCC1RYRG",
    clickUpId: null,
    accent: "warning",
  },
  {
    id: "u-matt",
    name: "Matt Shyra",
    initials: "MS",
    email: "matt@kindhomesolutions.com",
    title: "Production",
    department: "production",
    isTechTeam: false,
    slackId: "UMFSAEM61",
    clickUpId: null,
    accent: "accent",
  },
  {
    id: "u-yasmine",
    name: "Yasmine Henson",
    initials: "YH",
    email: "yasmine@kindhomesolutions.com",
    title: "Project Manager",
    department: "pm",
    isTechTeam: false,
    slackId: "U03REQ3SA3H",
    clickUpId: null,
    accent: "teal",
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

/** Resolves a Slack member id from an intake message to a person. */
export function userBySlackId(slackId: string): User | null {
  return MOCK_USERS.find((u) => u.slackId === slackId) ?? null;
}

/** Resolves a ClickUp assignee id to a person. */
export function userByClickUpId(clickUpId: number): User | null {
  return MOCK_USERS.find((u) => u.clickUpId === clickUpId) ?? null;
}

/**
 * Last-resort match on a Slack handle, for the ClickUp copies.
 *
 * Those carry only "@lindsay" or "@chloe.hackathorn" rather than a real member
 * id, so the handle is matched against the email local part and against the
 * display name with spaces turned into dots — the two forms Slack generates.
 * Only needed for tickets with no Slack original to reconcile against.
 */
export function userBySlackHandle(handle: string): User | null {
  const normalised = handle.replace(/^@/, "").trim().toLowerCase();
  return (
    MOCK_USERS.find(
      (u) =>
        u.email.split("@")[0]?.toLowerCase() === normalised ||
        u.name.toLowerCase().replace(/s+/g, ".") === normalised,
    ) ?? null
  );
}
