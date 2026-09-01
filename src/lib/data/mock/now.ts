/**
 * The dataset is anchored to one fixed instant.
 *
 * Two reasons, both load-bearing:
 *
 *  1. Determinism. Relative timestamps ("18 minutes ago", "2 days overdue")
 *     are rendered on the server and again on the client. If either side read
 *     the wall clock they would disagree and React would report a hydration
 *     mismatch. Anchoring removes the class of bug entirely.
 *
 *  2. Legibility. A demonstration dataset should describe one coherent moment.
 *     A ticket that is "43 minutes from breaching SLA" should still say that
 *     tomorrow, otherwise the sample data decays into nonsense.
 *
 * Every module reads the current time through `getNow()` in the data layer,
 * never through `new Date()` directly. A live implementation returns the real
 * clock from that same function and nothing else changes.
 */
/**
 * Must sit after the newest captured record. The most recent capture is the
 * "Rick Price 3.3 Bart crew price" ticket at 07:56 Pacific on 1 September;
 * anchoring before it made tickets claim to have been raised in the future.
 */
export const DATASET_NOW = new Date("2026-09-01T22:00:00.000Z");

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function shift(ms: number): string {
  return new Date(DATASET_NOW.getTime() + ms).toISOString();
}

export const minutesAgo = (n: number) => shift(-n * MINUTE);
export const hoursAgo = (n: number) => shift(-n * HOUR);
export const daysAgo = (n: number) => shift(-n * DAY);
export const minutesAhead = (n: number) => shift(n * MINUTE);
export const hoursAhead = (n: number) => shift(n * HOUR);
export const daysAhead = (n: number) => shift(n * DAY);

/** An absolute date at 09:00 Denver, for milestone and project dates. */
export function onDay(offsetDays: number, hour = 9): string {
  const d = new Date(DATASET_NOW.getTime() + offsetDays * DAY);
  d.setUTCHours(hour + 6, 0, 0, 0); // Denver is UTC-6 in summer
  return d.toISOString();
}

/**
 * Deterministic PRNG (mulberry32). Used only to spread the historical ticket
 * tail across 90 days for the analytics charts. Seeded so every render, on
 * every machine, produces the same dataset.
 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
