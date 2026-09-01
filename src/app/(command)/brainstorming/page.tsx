import { redirect } from "next/navigation";

/** Brainstorming is a group, not a page. Sessions are the thing you want. */
export default function Page() {
  redirect("/brainstorming/sessions");
}
