---
metadata:
    sdd-content-hash: 97ea47063a003dcabeca66298a82cd8de9b5f178b2f58a734b20a859a22e0f22
    sdd-version: 0.17.0
---
# Evaluation

How to judge completed work. This is the single definition — reference it wherever evaluation happens; don't restate the lenses elsewhere.

## Two lenses — generic postures

- **Inner — verification**: is the work sound, judged against the project's own guidelines?
- **Outer — validation**: is it the right thing — working in use, serving the people it's for?

What each lens concretely checks depends on the work type — code, docs, design, stories — and the project defines that in its own guidance (`AGENTS.md`/`CLAUDE.md`); the framework fixes only the postures. Inner is not "sound on its own terms" in a vacuum — the yardstick is the project's standards, not the work's self-consistency.

## Evaluation is real work

Done between reading the chain and recording, part automated and part human: inspect and run (host work — builds, smoke tests, end-to-end checks), and gather human feedback where the judgment needs it — a human attestation counts as evidence. A judgment without evidence is an impression.

## Per-lens and partial

One evaluation may cover one lens or both; different participants or runs cover the rest. Two-lens completeness — "a pass on one is not a pass" — is a coverage property computed across the graph, not a gate inside a single run. Say plainly which lens a run covered and what stays unjudged. When recording, the evaluation itself is work: a done signal carrying `evaluation/<lens>` work-shape topics, with findings surfaced by it.

## Three points — not once

A single check at the end is not enough in practice. Evaluate at each point that applies:

1. **During implementation** — sanity-check each slice as you go (verification as you build; a smoke check once it runs), so problems surface early instead of all at the gate.
2. **At the landing gate** — before a branch or worktree merges (or an in-place change closes), present the briefing the user merges on: which acceptance criteria are met and any deviation from the plan, the implicit decisions you made during the run, and both lenses' read. Give your read — merge-ready, or hold and why — and the user has the final say. This is the accountability that balances an autonomous run.
3. **After landing** — the learning loop: did it meet the target, what gaps or surprises remain. Record the evaluation and its findings against what you evaluated.
