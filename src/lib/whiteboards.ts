import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { diagramSchema, type Diagram } from "@/domain";

/**
 * Kept whiteboards.
 *
 * A whiteboard is an ordinary diagram and lives, like every other diagram, in
 * the client store — which means it lives in localStorage, which means the next
 * `refresh-intake` run deletes it along with the rest of the overlay.
 *
 * That is fine for a surface you scribble on during a meeting and abandon. It
 * is not fine for the one you scribbled on that turned out to matter. "Keep"
 * writes the whiteboard to a file, the same way a session is a file: git sees
 * it, a refresh cannot touch it, and it can be restored into the working set
 * afterwards.
 *
 * Keeping is a snapshot, not a link. Editing a whiteboard after keeping it does
 * not update the kept copy — keep it again. That is a deliberately boring model
 * and it is the one people already expect from a save button.
 */

const WHITEBOARDS_DIR = path.join(process.cwd(), "data", "whiteboards");

export type KeptWhiteboard = {
  diagram: Diagram;
  /** When this copy was written, which is not the diagram's own updatedAt. */
  keptAt: string;
  file: string;
};

async function readDir(): Promise<string[]> {
  try {
    return (await fs.readdir(WHITEBOARDS_DIR)).filter((f) => f.endsWith(".json"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

// `keptAt` rides alongside the diagram rather than inside it, so a kept file is
// still a valid Diagram to anything that does not know about keeping.
const keptSchema = diagramSchema.extend({ keptAt: z.string().min(1) });

export async function listKeptWhiteboards(): Promise<KeptWhiteboard[]> {
  const files = await readDir();

  const parsed = await Promise.all(
    files.map(async (file) => {
      const raw = await fs.readFile(path.join(WHITEBOARDS_DIR, file), "utf8");
      const json = JSON.parse(raw) as Record<string, unknown>;
      const result = keptSchema.safeParse(json);
      if (!result.success) {
        console.warn(`[whiteboards] ${file} is not a valid kept whiteboard and was skipped.`);
        return null;
      }
      const { keptAt, ...diagram } = result.data;
      return { diagram: diagram as Diagram, keptAt, file };
    }),
  );

  return parsed
    .filter((k): k is KeptWhiteboard => k !== null)
    .sort((a, b) => b.keptAt.localeCompare(a.keptAt));
}

/** Writes a durable copy. Keeping the same board again overwrites its file. */
export async function keepWhiteboard(diagram: Diagram): Promise<KeptWhiteboard> {
  await fs.mkdir(WHITEBOARDS_DIR, { recursive: true });

  const validated = diagramSchema.parse(diagram);
  const keptAt = new Date().toISOString();
  const file = `${validated.slug || validated.id}.json`;

  await fs.writeFile(
    path.join(WHITEBOARDS_DIR, file),
    `${JSON.stringify({ ...validated, keptAt }, null, 2)}\n`,
    "utf8",
  );

  return { diagram: validated, keptAt, file };
}

export async function forgetWhiteboard(file: string): Promise<void> {
  // Guard against a caller passing anything other than a bare file name.
  const safe = path.basename(file);
  await fs.rm(path.join(WHITEBOARDS_DIR, safe), { force: true });
}
