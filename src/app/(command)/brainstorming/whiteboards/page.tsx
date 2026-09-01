import { listKeptWhiteboards } from "@/lib/whiteboards";
import { WhiteboardsPage } from "@/components/brainstorming/whiteboards-page";

export default async function Page() {
  const kept = await listKeptWhiteboards();
  return <WhiteboardsPage kept={kept} />;
}
