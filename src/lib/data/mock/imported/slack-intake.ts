import type { SlackIntakeMessage } from "@/lib/data/import/slack";

/**
 * A capture of the Slack ticket intake channels.
 *
 *   #it-ticketing-cams        C08RTNC5PUL   form: SUBMIT A TICKET CAM
 *   #it-ticketing-production  C08RA0T5W6T   form: SUBMIT A TICKET PM
 *   #it-ticketing-sales       C08RA0R32S3   form: SUBMIT A TICKET EST
 *   #it-ticketing-sdr         C08RJ277LJJ   form: SUBMIT A TICKET SDR
 *
 *   Captured 28 August 2026 · 57 requests
 *
 * This is the canonical side. Every request carries the submitter as a real
 * Slack mention, the request type, the impact and the stated priority — all of
 * which the Zapier copy into ClickUp discards.
 *
 * Times are stored as the wall clock Slack displayed them in, with the offset
 * that applied. Converting them back gives the message timestamp, which is the
 * key ClickUp writes into its `due_date` field — and therefore the join between
 * the two systems.
 */

type Captured = {
  /** Channel key; maps to a channel id and a department in the importer. */
  ch: "cams" | "production" | "sales" | "sdr";
  /** Wall clock as Slack rendered it, Pacific. */
  at: string;
  /** Slack member id of the submitter. */
  by: string;
  /** Request Type from the form. */
  t: string;
  /** Impact from the form. */
  im: string;
  /** Priority from the form. */
  p: "High" | "Medium" | "Low";
  /** The request body. */
  r: string;
  /** Thread replies on the Slack message, where any. */
  replies?: number;
};

const PACIFIC_OFFSET = "-07:00";

const CAPTURED: Captured[] = [
  /* -- #it-ticketing-cams --------------------------------------------------- */
  { ch: "cams", at: "2026-08-25 09:41:30", by: "U04LVDK3A4Q", t: "Outage", im: "Cannot work at all, Major slowdown", p: "High", replies: 1, r: "ive had two ifc issues in the last day. one ifc for christina Zaidi didnt come through at all from spotio. chloe did note aaron did it right and she was with him, so it wasnt that. then rennee bishop didnt convert through. not the same issues as with the other ones, so unclear why it didnt" },
  { ch: "cams", at: "2026-08-24 14:22:17", by: "U04LVDK3A4Q", t: "Support", im: "Cannot work at all", p: "Medium", replies: 1, r: "mikel said to do this now" },
  { ch: "cams", at: "2026-08-24 10:44:40", by: "U04LVDK3A4Q", t: "Outage", im: "Major slowdown", p: "High", replies: 1, r: "RR for the CSC team is pulling from the wrong month. it is pulling from the month they move it to, not the month they moved it from." },
  { ch: "cams", at: "2026-08-21 08:42:10", by: "U04LVDK3A4Q", t: "Outage", im: "Major slowdown", p: "High", replies: 2, r: "leads are not populating into SF at all" },
  { ch: "cams", at: "2026-08-21 07:00:39", by: "U04LVDK3A4Q", t: "Outage", im: "Major slowdown", p: "High", replies: 2, r: "robby. the apptoto for daniela garcia didnt come into sf" },
  { ch: "cams", at: "2026-08-20 08:37:44", by: "U03HBGFSCU8", t: "Request", im: "Major slowdown, Nice-to-have", p: "High", r: "Can we please update the notes template in the \"CAM Color Notes for CC\" to this:\n\n-Color Due Date:\n-# of colors:\n-Colors they are leaning towards:\n-Any personality notes:\n-HOA:\n-Any scheme changes:\n-Scope:\n-Type of Paint:" },
  { ch: "cams", at: "2026-08-20 08:31:56", by: "U03HBGFSCU8", t: "Request", im: "Major slowdown, Nice-to-have", p: "High", r: "Can you please add the time window in the \"Your (PW/WW/GUTT) Is Scheduled for Tomorrow!\" email that we also have in the first automated email that goes out." },
  { ch: "cams", at: "2026-08-14 06:55:54", by: "U04LVDK3A4Q", t: "Outage", im: "Cannot work at all, Major slowdown", p: "High", r: "hey robby. got any fun weekend plans? anyways, the pd signed email is coming through when the pd hasnt been signed. can you look at kim cohn please, ill forward the email to you" },
  { ch: "cams", at: "2026-08-10 13:22:50", by: "U04LVDK3A4Q", t: "Request", im: "Nice-to-have", p: "Medium", r: "hey robby, i dont know if this is a function that SF can even support, but kendall is always like \"jess, use the IT requests\" and im like \"okay\" so can we add a filter to dashboards in SF for FR" },
  { ch: "cams", at: "2026-08-04 12:56:47", by: "U04LVDK3A4Q", t: "Outage", im: "Cannot work at all", p: "High", r: "hi robby. please enjoy the same freedom that birds do without your bones being hollow (flying). ifcs for 80123 are coming through w/ the city as columbine valley and not littleton and the system isnt recognizing it so its half converting things and failing. please help." },
  { ch: "cams", at: "2026-07-24 07:23:46", by: "U04LVDK3A4Q", t: "Outage", im: "Minor inconvenience", p: "High", r: "hey robby, i know that ive submitted a lot of requests today and just know that the reason i stopped was for a moment i just thought \"spotio will always fail\" and then i rallied and im back. this lead didnt come through with a last name. chloe says it had one in spotio and we're not sure why it did that. can you help?" },
  { ch: "cams", at: "2026-07-24 07:00:11", by: "U04LVDK3A4Q", t: "Outage", im: "Major slowdown", p: "High", r: "ifcs still coming through twice. allen sosniak and bill rhyne are examples" },
  { ch: "cams", at: "2026-07-24 06:51:32", by: "U04LVDK3A4Q", t: "Outage", im: "Cannot work at all", p: "High", r: "J-17492\nthe cal events wont push, prolly bc matt is the assigned tech on it, see chatters" },
  { ch: "cams", at: "2026-07-22 12:41:24", by: "U04LVDK3A4Q", t: "Outage, Support", im: "Cannot work at all, Major slowdown", p: "High", r: "estimators cant push charlottes jobs to closed won" },
  { ch: "cams", at: "2026-07-21 11:14:44", by: "U03HBGFSCU8", t: "Request", im: "Major slowdown, Nice-to-have", p: "High", r: "Can we please swap places for the \"Final Gutter Price\" and the \"Final WW Price w/discount\"? We sell my WW, then gutters, so it's just easier when PCs are filling out the job info" },
  { ch: "cams", at: "2026-07-21 11:11:32", by: "U03HBGFSCU8", t: "Request", im: "Major slowdown, Nice-to-have", p: "High", r: "ROBBY! Hello! Can we please update the maintenance job files in the CAM Notes for PM to this:\nDEADLINE:\nSCOPE:\nPAINT:\nPICS IN CC:\nPAID WARR:" },
  { ch: "cams", at: "2026-07-20 15:07:54", by: "U04LVDK3A4Q", t: "Request", im: "Minor inconvenience, Nice-to-have", p: "High", r: "hey robby, can we have an automated email from teh cab team after their PM has been assigned that says \"meet your PM\" like with estimators" },
  { ch: "cams", at: "2026-07-20 11:24:33", by: "U04LVDK3A4Q", t: "Request", im: "Major slowdown", p: "High", r: "hey robby, when we auto convert ifcs, can it recognize dupes so that it doesnt create a separate account/contact? if it still needs to create it but it recognizes the dupe, can it label it as like \"Bob Smith 2\"? Also i know we talked about this but is there a way to fix the way those addresses come in?" },

  /* -- #it-ticketing-production --------------------------------------------- */
  { ch: "production", at: "2026-08-27 13:35:20", by: "U05BM5YMR26", t: "Outage", im: "Major slowdown", p: "High", replies: 7, r: "Bart for Tory Woods" },
  { ch: "production", at: "2026-08-27 13:30:42", by: "U05BM5YMR26", t: "Outage", im: "Major slowdown", p: "High", replies: 7, r: "need copy of BART for Bonnie Lund look for the one that says use" },
  { ch: "production", at: "2026-08-26 07:10:19", by: "U0B059NHQAE", t: "Request", im: "Cannot work at all", p: "High", replies: 3, r: "3.3 Bart Mike Beckett" },
  { ch: "production", at: "2026-08-25 06:13:50", by: "U08HUG1TBPH", t: "Support", im: "Major slowdown", p: "Medium", replies: 1, r: "New jobs need 3.3 barts:\n\nDrew Ashby\nSusanna Wellens\nPaula Ortlieb\nCharlie Taffet\nAnne Bailey" },
  { ch: "production", at: "2026-08-24 11:26:35", by: "U05J41SEW8P", t: "Support", im: "Minor inconvenience", p: "Medium", replies: 3, r: "Sarah Hess 3.3 Bart has no measures or numbers on crew sheet" },
  { ch: "production", at: "2026-08-22 08:01:28", by: "U01VBCVP38X", t: "Request", im: "Major slowdown", p: "High", replies: 2, r: "Add zaps to JZ landscaping and painting crew slack channel" },
  { ch: "production", at: "2026-08-20 09:51:33", by: "U01VBCVP38X", t: "Support", im: "Nice-to-have", p: "Low", replies: 1, r: "Jimmie Allen pw jot form link missing from cal event. I tagged you in Salesforce." },
  { ch: "production", at: "2026-08-20 08:57:18", by: "U06MLLJ2CMD", t: "Request", im: "Major slowdown", p: "High", r: "Something funky is goin on with Priya Longin 3.3. Looks like F50 is dropped down and messing with some things." },
  { ch: "production", at: "2026-08-20 08:38:07", by: "U05J41SEW8P", t: "Request", im: "Minor inconvenience", p: "Medium", r: "Glenn Runkewich INT BART - Missing measurements" },
  { ch: "production", at: "2026-08-20 08:02:03", by: "U05J41SEW8P", t: "Request", im: "Major slowdown", p: "Medium", r: "Sarah Hess. Bart is missingg measurements" },
  { ch: "production", at: "2026-08-19 06:36:33", by: "U05BM5YMR26", t: "Outage", im: "Major slowdown", p: "High", r: "BART for interior for Kurt Reinecke" },
  { ch: "production", at: "2026-08-18 17:37:53", by: "U0AQCC1RYRG", t: "Support", im: "Nice-to-have", p: "High", r: "William Briggs new 3.3 is buggy" },
  { ch: "production", at: "2026-08-18 13:23:10", by: "U0AQCC1RYRG", t: "Support", im: "Nice-to-have", p: "High", r: "William Briggs 3.3" },
  { ch: "production", at: "2026-08-18 12:46:27", by: "U06MLLJ2CMD", t: "Request", im: "Major slowdown", p: "High", r: "Kathryn Weathers Bart 3.3 is producing some errors for crew pay and I don't know how to fix it. It does have 18in soffits, which may be an issue I'm hearing, but the problem seems to be coming from the Prep pay out." },
  { ch: "production", at: "2026-08-18 04:44:34", by: "U08HUG1TBPH", t: "Support", im: "Major slowdown", p: "Medium", r: "Bart 3.3 Dave Meisinger's" },
  { ch: "production", at: "2026-08-13 19:16:55", by: "U0B059NHQAE", t: "Request", im: "Major slowdown", p: "High", r: "3.3 Bart for Emmy Hise, interior one looks funkyyy" },
  { ch: "production", at: "2026-08-12 16:14:26", by: "U06MLLJ2CMD", t: "Request", im: "Minor inconvenience", p: "Medium", r: "3.3 Fixed WW panes when changed on the copy of bart, don't change the crew labor. You can only change it on the original ext measure for it to change the crew sheet" },
  { ch: "production", at: "2026-08-12 16:12:38", by: "U01VBCVP38X", t: "Request", im: "Minor inconvenience, Nice-to-have", p: "Medium", r: "can we change ww size drop down \"3.5_in\" to be labeled as \"3.5_in_BEAD_BOARD_Soffit\" in the master ww page in bart?" },
  { ch: "production", at: "2026-08-12 15:07:27", by: "U0B059NHQAE", t: "Request", im: "Major slowdown", p: "High", r: "INT bart for Brian day looks a little funky? Think I need 3.3" },
  { ch: "production", at: "2026-08-12 13:02:45", by: "UMFSAEM61", t: "Request", im: "Major slowdown", p: "High", r: "PFAD Opps do not have a field for prelim services. IF it is an EXT opp and it gets shaved down to a PFAD price it does. But for like PFAD opps for a fence or deck, those should always be washed and we are not able to get that info into SF" },

  /* -- #it-ticketing-sales (EST form) --------------------------------------- */
  { ch: "sales", at: "2026-08-21 09:27:50", by: "UM4D0D3T5", t: "Outage", im: "Major slowdown", p: "High", replies: 2, r: "Autmoation for Company cam creation is down" },
  { ch: "sales", at: "2026-08-21 08:02:36", by: "UM4D0D3T5", t: "Outage", im: "Cannot work at all", p: "High", replies: 2, r: "BARTS Are not being created. Manual Create button is not working" },
  { ch: "sales", at: "2026-08-17 20:34:33", by: "U055GDPHFJB", t: "Request", im: "Minor inconvenience", p: "Low", r: "I'm all of the sudden getting calendar reminders and voice recording notifications from Salesforce. Can they be turned off?" },
  { ch: "sales", at: "2026-08-12 14:51:18", by: "U05DKEGJXUH", t: "Outage", im: "Major slowdown", p: "High", r: "Interior Bart \"Desciption\" Box does not allow Copy/Paste into PandaDoc" },
  { ch: "sales", at: "2026-08-11 09:25:29", by: "UM4D0D3T5", t: "Request", im: "Nice-to-have", p: "Medium", r: "Can we get a pricing section for built-in shelving (And dial in realistic pricing) on the cabinet bart tab?" },
  { ch: "sales", at: "2026-08-04 16:30:07", by: "U08EXQ47A05", t: "Support", im: "Minor inconvenience", p: "Low", r: "I am trying to add/update contact info via the calendar but after a few hours all my edits disappear." },
  { ch: "sales", at: "2026-07-29 13:13:35", by: "U09535CLVCK", t: "Support", im: "Major slowdown", p: "High", r: "Selecting no on Bart right elevation blocks everything in front elevation as well" },
  { ch: "sales", at: "2026-07-20 13:52:13", by: "U055GDPHFJB", t: "Outage", im: "Minor inconvenience", p: "Medium", r: "Looker studio has been down all day" },
  { ch: "sales", at: "2026-07-16 13:45:11", by: "U05H9LJ1L9X", t: "Outage", im: "Cannot work at all", p: "High", r: "Missing interior measure tab on my BART for Andres Bautista" },
  { ch: "sales", at: "2026-06-24 16:34:45", by: "UMFCCH0KE", t: "Outage, Support", im: "Cannot work at all", p: "High", r: "INT BART for Will metcalf will not come up with any costs!" },
  { ch: "sales", at: "2026-06-22 09:04:07", by: "U08L3HLE68N", t: "Support", im: "Minor inconvenience", p: "Low", replies: 1, r: "Editing the PD (when it comes to changing the size of the font) on the scope of work section stopped working. I can set it to Poppins, but when trying to set it to size 12, it doesn't do itttttt" },
  { ch: "sales", at: "2026-06-05 15:52:48", by: "U09535CLVCK", t: "Support", im: "Minor inconvenience", p: "Medium", r: "Pergola light vs heavy prep pricing is the same" },
  { ch: "sales", at: "2026-06-04 13:18:49", by: "U05GGFA4JLX", t: "Support", im: "Minor inconvenience", p: "Low", r: "Drop down on Bart for \"client left at minute\" has wrong selections for \"summer, fall, spring, etc\"" },

  /* -- #it-ticketing-sdr ---------------------------------------------------- */
  { ch: "sdr", at: "2026-08-17 11:39:11", by: "UMFS7V66R", t: "Support", im: "Minor inconvenience", p: "Low", r: "SDR manager doors not showing in scorecard" },
  { ch: "sdr", at: "2026-07-22 15:12:09", by: "UMFS7V66R", t: "Request", im: "Nice-to-have", p: "Medium", r: "SDR hourly chart to slack every morning" },
  { ch: "sdr", at: "2026-07-08 08:25:04", by: "U07E7U3LJ48", t: "Request", im: "Minor inconvenience", p: "High", r: "Charlotte Bevers taken off summer refresh competition for my team" },
  { ch: "sdr", at: "2026-05-06 13:35:11", by: "UMFS7V66R", t: "Support", im: "Minor inconvenience", p: "Medium", r: "Multiple pins on same home coming from sales force. We should only have the last stage reporting like client instead of 3 like estimate, closed won, client." },
  { ch: "sdr", at: "2026-05-06 13:32:51", by: "UMFS7V66R", t: "Support", im: "Major slowdown", p: "High", r: "The leads notes are not showing up which makes communication challenging. Spotio said you are aware of the problem and have been working to fix it." },
  { ch: "sdr", at: "2026-04-24 14:43:08", by: "UMFS7V66R", t: "Request", im: "Minor inconvenience", p: "Low", r: "IFC's different on new scorecard and old one" },
];

export const CHANNELS = {
  cams: { id: "C08RTNC5PUL", name: "it-ticketing-cams", form: "CAM", department: "cam" },
  production: {
    id: "C08RA0T5W6T",
    name: "it-ticketing-production",
    form: "PM",
    department: "production",
  },
  sales: { id: "C08RA0R32S3", name: "it-ticketing-sales", form: "EST", department: "est" },
  sdr: { id: "C08RJ277LJJ", name: "it-ticketing-sdr", form: "SDR", department: "sdr" },
} as const;

export const SLACK_INTAKE: SlackIntakeMessage[] = CAPTURED.map((row) => {
  const channel = CHANNELS[row.ch];
  const ts = Date.parse(`${row.at.replace(" ", "T")}${PACIFIC_OFFSET}`);

  return {
    ts: String(ts / 1000),
    channelId: channel.id,
    channelName: channel.name,
    formName: channel.form,
    department: channel.department,
    submitterSlackId: row.by,
    requestType: row.t,
    request: row.r,
    impact: row.im,
    statedPriority: row.p,
    replyCount: row.replies ?? 0,
    permalink: `https://kindhomesolutions.slack.com/archives/${channel.id}/p${String(ts).replace(/(\d{10})(\d{3})/, "$1$2")}`,
  };
});

export const SLACK_CAPTURE_META = {
  workspace: "kindhomesolutions.slack.com",
  channels: Object.values(CHANNELS).map((c) => c.name),
  capturedAt: "2026-08-28T00:00:00.000Z",
  messageCount: CAPTURED.length,
} as const;
