"use server";

import { revalidatePath } from "next/cache";
import type { Diagram } from "@/domain";
import { forgetWhiteboard, keepWhiteboard } from "@/lib/whiteboards";

/**
 * Keeping and forgetting.
 *
 * The whiteboard itself is edited entirely through the client store, like every
 * other diagram. These two actions are the only server round trips it makes,
 * and they exist for exactly one reason: so that a board worth keeping survives
 * the next dataset refresh. See `lib/whiteboards.ts`.
 */

export async function keepWhiteboardAction(diagram: Diagram) {
  const kept = await keepWhiteboard(diagram);
  revalidatePath("/brainstorming/whiteboards");
  return { keptAt: kept.keptAt, file: kept.file };
}

export async function forgetWhiteboardAction(file: string) {
  await forgetWhiteboard(file);
  revalidatePath("/brainstorming/whiteboards");
}
