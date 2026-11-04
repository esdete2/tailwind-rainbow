---
metadata:
    sdd-content-hash: b4558ddc0f0b8d84b48457f98839c39de180a380a140ab1dc92b86f1715c99c6
    sdd-version: 0.17.0
---
# Grooming Playbook

When the user says "let's groom" or you proactively suggest it, invoke `/sdd-groom`. The sub-skill returns one structured block per candidate with rich evidence (downstream entry descriptions, commit messages).

## Presenting results

Build a summary table from the sub-skill's structured data with these columns: #, Entry, Layer, Age, Pattern, Status, Evidence (a short summarizing note), Suggested resolution. Render the Status column using the derived-status notation — `{status: open}`, `{status: active}`, `{status: closed-by <id>}`, `{status: superseded-by <id>}` — matching what `sdd view` / `sdd show` surface. The table is the scanning surface — it should be enough for the user to make quick calls on straightforward candidates. When mentioning entry IDs in the evidence column or in dialogue, always follow each ID with a short title in quotes (e.g. `d-cpt-axa` "evaluate explore mode"). The full evidence from the sub-skill stays in your context so you can answer follow-up questions about any candidate without additional lookups.

Then: "Let's walk through these. Starting with #1, or pick a number."

## Walking through candidates

For each candidate, based on its pattern:

**Pattern A (missing `closes`)** — The work is done, just the link is missing. Show the evidence (the downstream entry that resolved it) and propose a closure: "Entry X already resolved this. I'd capture a done signal with `--closes [id]` to record it. Sound right?" Then execute.

**Pattern B (superseded in practice)** — A newer entry covers the same ground but without an explicit `supersedes` link. When the candidate looks like it might be superseded but the sub-skill didn't surface a clear successor, widen (the **Widen** move) to hunt for newer same-ground entries. Show both entries side by side and ask: "This newer entry seems to cover the same concern. Is the older one superseded?" If yes, capture a new decision or signal with `--supersedes [old-id]` to formalize the relationship. If the entries are complementary rather than redundant, note that and move on.

**Pattern C (stale, no activity)** — No evidence of resolution. Brief the user on the entry and the current context: "This has been open since [date] with no activity. Given [current state / related decisions since then], is this still relevant?" Three outcomes:
- **Still relevant**: Leave it open. Optionally capture a fresh signal that updates the context or re-frames the concern.
- **No longer relevant**: For a gap, capture a done signal with `--closes [id]` noting why — context changed, concern was absorbed by another direction, no longer applies. For a decision of any kind, or a stable-kind signal (fact, insight), capture a directive with `--closes [id]` and retirement rationale — that is the retire-without-replacement path, distinct from a done signal recording work that completed.
- **Partially relevant**: The original framing is stale but the underlying concern persists. Capture a new signal that re-frames it, then close the old one with `--closes`.

**Pattern C with Git evidence** — The sub-skill found commits that look related. Show the commit(s) and ask: "This commit looks like it addresses this entry. Want to capture a done signal for it?" If yes, capture the done signal with `--closes [id]`.

**Pattern D (stale WIP marker)** — A WIP marker is still active but the work appears done, abandoned, or paused. Show the marker details and ask: "This marker has been active since [date]. Is the work still in progress?" If done, run `sdd wip done <marker-id>`. If the work was completed, also check whether the referenced entry needs a closing done signal.

## After grooming

Summarize what was done: "Closed N entries, captured M done signals. N entries confirmed still open." This keeps the user oriented.
