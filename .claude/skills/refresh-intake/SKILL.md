---
name: refresh-intake
description: Re-pull the Slack intake channels and the ClickUp IT Tickets folder, then update the captured fixtures and the dataset clock so the command center shows current data. Use when the mock dataset is stale, when asked to refresh tickets, or on the scheduled morning run.
---

# Refresh the intake capture

The command center runs on the `mock` provider. Its ticket data is two captured
fixtures reconciled against each other. Neither is fetched at runtime — nothing
in the app can reach Slack or ClickUp. This procedure is what makes them current.

Work **incrementally**. Do not re-capture all 55+201 rows; read only what is
newer than the existing watermark and append.

## Files

| File | Holds |
| --- | --- |
| `src/lib/data/mock/imported/slack-intake.ts` | `CAPTURED[]` — Slack originals, grouped by channel, newest first within each group |
| `src/lib/data/mock/imported/clickup-it-tickets.ts` | `CAPTURED[]` — ClickUp tasks, newest first by task id |
| `src/lib/data/mock/now.ts` | `DATASET_NOW` — the instant the whole dataset is anchored to |

## The join — do not break this

ClickUp's `due_date` on these tickets is not a due date. The Zapier intake
automation writes the Slack message timestamp into it:

    clickUpTask.due_date === slackMessage.ts * 1000

`reconcile.ts` matches on that exact key. Never fuzzy-match on text. If a new
Slack row and its ClickUp copy do not produce the same key, the ticket will
appear twice.

## Steps

1. **Find the watermark.** Read `SLACK_CAPTURE_META.capturedAt` and the newest
   `at` in each channel group. Read `DATASET_NOW`.

2. **Read Slack.** For each channel, newest first, stopping once you reach a
   message already in the fixture:

   | key | channel | id |
   | --- | --- | --- |
   | `cams` | `#it-ticketing-cams` | `C08RTNC5PUL` |
   | `production` | `#it-ticketing-production` | `C08RA0T5W6T` |
   | `sales` | `#it-ticketing-sales` | `C08RA0R32S3` |
   | `sdr` | `#it-ticketing-sdr` | `C08RJ277LJJ` |

   Use `response_format: "detailed"` — the concise form omits the message `ts`
   and the thread reply count, and both are needed.

3. **Read ClickUp.** Workspace `9017052896`. Lists: `901704769198` Leadership,
   `901704769200` CAM, `901704769202` Production, `901704769204` Sales,
   `901704769206` SDR. Two queries, both with `include_closed: true`:
   - `due_date_from` = watermark date → new intake
   - `date_closed_from` = watermark date → tickets closed since last run

4. **Append and update.**
   - New Slack rows go at the top of their channel group. Trim trailing
     whitespace from the request body.
   - New ClickUp rows go at the top of `CAPTURED`.
   - For a task closed since the last run, update its `s` and `c` in place.
     Do not add a second row.
   - Check an existing row's `d` has not changed. If it has, the join key moved
     and the ticket will split — flag it rather than silently patching.

5. **Re-anchor the clock.** Set `DATASET_NOW` to the next round hour after the
   newest captured record, keeping the 15:00 Pacific convention where possible
   (`YYYY-MM-DDT22:00:00.000Z`). It **must** sit after the newest record or
   tickets claim to have been raised in the future.

6. **Update the headers.** Both fixtures carry a `Captured <date> · <n> …` line,
   and `slack-intake.ts` carries `SLACK_CAPTURE_META.capturedAt`.

7. **Verify.** `npx tsc --noEmit` must exit clean. Then confirm the ticket count
   in the sidebar moved by the expected amount.

8. **Report** the delta: new tickets, closed tickets, and anything flagged.

## Things that are correct and should not be "fixed"

- **`"recieved"`** is ClickUp's own spelling of that status. Leave it.
- **ClickUp-only rows.** The Leadership list has no Slack channel in the
  capture, and some tasks are raised directly in ClickUp. `reconcile.ts`
  counts these as `clickUpOnly` by design. Do not hunt for missing originals.
- **Task `86e2rnb3a`** ("built-in shelving") has a ClickUp `due_date` of
  26 Aug while its Slack original is 11 Aug. This is a real upstream
  discrepancy, faithfully captured. It reconciles as ClickUp-only.

## Known hazard — read before November 2026

`PACIFIC_OFFSET` in `slack-intake.ts` is hardcoded to `-07:00`, which is
daylight time. Every captured row is currently PDT so this is correct today.
Once Pacific returns to standard time (`-08:00`), each new row's computed `ts`
will be an hour off, the ClickUp join will miss, and every new ticket will
appear twice. Fix the offset to be per-row before then.
