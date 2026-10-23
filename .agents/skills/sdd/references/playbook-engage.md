---
metadata:
    sdd-content-hash: 295b104ea53e2ab8aa66e8c4107244a53eda94f105e79a2b8eb7cadeebf6020d
    sdd-version: 0.17.0
---
# Engage Playbook

When the user anchors a session on a graph entry — by ID, by topic that resolves to one, or by an action ("let's build d-tac-123", "dig into 5") — you're in **Engage** mode. Every entry-anchored session, regardless of whether the user wants to explore, implement, evaluate, supersede, decompose, or check alignment, follows the same opening move. The mode only diverges *after* the user picks a post-engage action.

## Universal entry move

Four steps, in order. Don't skip any of them, and don't reorder.

1. **Anchor** — establish the entry the session is about.
   - Entry ID given: use it.
   - Topic phrase given (no anchor): widen (the **Widen** move) to surface candidates, then dialogue toward picking the centre. See [search](search.md) for mode selection.
   - Action verb only ("let's keep going", "let's evaluate"): if the recent dialogue or `sdd wip list` resolves to a clear entry, use it; otherwise ask which entry.

2. **Read chain (Inspect)** — load the anchor with its chain in one call (`sdd show <full-id> --up 3 --down 2`; see [cli-reference](cli-reference.md)). Engage widens past the `sdd show` defaults (`--up 2 --down 1`) to pull more of the entry's surroundings into view. This surfaces upstream rationale, augment-plan amendments, partial done signals against ACs, supersession, and downstream activity. Use full IDs always (per the outer skill's CLI rule). For closed commitments where evaluation is in scope, also load the closing done signal at full detail.

3. **Brief** — synthesize what the entry is about, current status, what's around it. **The brief shape varies by entry kind and user intent** (see "Brief shapes" below). Don't default to a single template — pick the shape that matches what the user is engaging on and what they're trying to do.

4. **Offer moves** — based on entry kind, current state, and dialogue intent, surface candidate next moves from the catalog below. The user picks. Don't act yet.

When the chain plus semantically-related entries would bloat the outer agent's context, invoke `/sdd-explore` from inside step 1 (heavy topic search) or step 4 (related-entry surfacing for "what else touches this?"). The sub-skill is a compression tool, not a mode-entry precondition — pass it both a target *and* a goal so it can compress with an axis.

## Post-engage moves: two flavors

Moves split by what the engagement produces:

| Flavor | Definition | When you choose it |
|---|---|---|
| **Acting on** the entry | The outcome is a graph change *against* the entry — implement, supersede, close, decompose, refine, short-loop, plan it, augment | The entry is the subject of the work |
| **Using** the entry as a lens | The outcome is signals/findings about *other* work, framed by the entry — evaluate (against a commitment), compliance check (against a contract), alignment check (against an aspiration), focus-progress check (against a focus) | The entry is the measuring stick; other code, decisions, or in-flight work is the subject |

The lens-flavor branch is undernourished today: only Evaluate has explicit support (in this playbook, as a temporary home). Compliance, alignment, and focus-progress checks are queued behind a follow-up `playbook-evaluate.md`. When a user asks for a lens move that has no dedicated playbook yet, run the engagement informally (anchor → read chain → run the lens against the named target → capture findings as signals refed back) and surface that the dedicated playbook is queued.

## Per-kind move catalog

The candidate moves to surface in step 4, keyed by the anchor's kind. **Bolded** moves are lens-flavor; the rest are acting-on.

| Kind | Type | Candidate post-engage moves |
|---|---|---|
| gap | signal | capture decision · plan it · short-loop done · close as not relevant · refine |
| fact | signal | reference in decision · retire (no longer true) · correct (supersede) |
| question | signal | answer (fact/insight + close) · refine · won't-pursue close |
| insight | signal | capture decision based on it · refine · close (acted on) |
| done | signal | **evaluate / capture follow-up signals** · retrospective · no-action |
| actor | signal | identity correction (supersede) · retire (directive that closes the head) |
| annotation | signal | replace · retire |
| directive | decision | implement · supersede · close via done · **evaluate (post-closure)** · retire |
| activity | decision | implement (mechanical) · close via done · **evaluate (post-closure)** |
| plan | decision | implement (AC checklist) · augment · decompose · restructure · supersede · **evaluate (post-closure)** |
| contract | decision | **compliance check** · supersede · retire |
| aspiration | decision | **alignment check** · evolve (supersede) · retire |
| role | decision | supersede · cascade-retire (via actor closure) |
| focus | decision | **progress check** · re-prioritize (supersede) · close (cycle done) |

Closed commitments stay evaluable — closure is not a terminal state for engagement, only for the open-status derivation. A closed plan can still be the lens for a retrospective or the subject of a follow-up signal.

Load [playbook-implementation.md](playbook-implementation.md) as soon as the dialogue turns toward how to implement, not when the first step starts. Slicing, sequencing, and WIP-marker setup live inside its frame — loading later means that guidance arrives after the choices it should inform. When the chosen move is **augment**, load [playbook-augment-plan.md](playbook-augment-plan.md). Other moves are handled by the outer skill's capture discipline directly.

## Brief shapes

The brief is a family. Pick the shape that fits the kind + intent combination. Three concrete examples follow; recognize the pattern and adapt for variants.

### Plan + implementation intent — AC-status table

When the anchor is a plan (or directive carrying a plan-shaped scope) and the intent is to implement, build an AC-status table:

```
| AC | Status | Notes |
|---|---|---|
| 1. <verifiable outcome> | ✓ Done | covered by partial done signal s-tac-xyz |
| 2. <verifiable outcome> | ◐ Partial | started in d-tac-abc augment, scaffolding landed but tests missing |
| 3. <verifiable outcome> | ☐ Remaining | not yet touched |
| (augmenting directive d-tac-abc commitment) | ◐ Partial | (folded into AC 2 above) |
```

Three columns: ✓ Done (covered by partial done signals or self-evident from chain), ◐ Partial (started but incomplete; includes any open augmenting directive's commitment), ☐ Remaining (not yet touched). Read the closing done signals in the chain plus every downstream augmenting directive — the union is the contract. The table surfaces the work checklist directly so picking a slice is mechanical.

**Mid-flight pickup** is a sub-pattern within this shape: when prior implementation paused at a slice boundary, the most recent partial done signal in the chain typically carries pickup notes. Surface those notes in the brief and shape the AC-status table around what's outstanding. Same flow — no mode switch.

### Signal + explore intent — narrative

When the anchor is a signal (gap, question, insight, fact) and the intent is to understand and orient, write a narrative brief:

> **What this is about** — one paragraph synthesizing the chain, including the originating context and any refining signals.
> **Status** — open / closed-by / superseded-by, plus a one-line read of where the signal sits in active threads.
> **What's happened since** — downstream entries (decisions addressing it, refining signals, related captures), if any.
> **What's around it** — semantically-related entries surfaced by widening (the **Widen** move) or via `/sdd-explore` if the spread is wide.
> **Orienting question** — close with: "what does this need?"

The narrative is short — three to five sentences total in most cases. Don't pad. The orienting question hands intent back to the user.

### Contract + compliance-check intent — divergence list

When the anchor is a contract and the intent is to check whether some target work area aligns with it, build a divergence list:

```
**Target work area**: <named scope — recent decisions in cluster X, in-flight implementation Y, code in package Z>
**Contract**: <one-line restatement>

**Alignments** (target satisfies the contract):
- <evidence point with entry ID or file path>
- <evidence point>

**Divergences** (target violates or strains the contract):
- <evidence point> — <one-line explanation>
- <evidence point> — <one-line explanation>

**Ambiguous** (target neither clearly aligns nor diverges):
- <evidence point> — <what would clarify>
```

Both alignments and divergences must be surfaced — a divergence-only list reads like a hunting expedition rather than a fair check. Ambiguous items are the dialogue prompt: they're where the contract may need sharpening or the target may need adjusting. Each finding becomes a candidate signal refed back at the contract.

### Other shapes (recognize, adapt)

- **Done signal + evaluate intent**: split brief — what landed (from the done body and what it closes) plus the inner and outer lenses (see [evaluation.md](evaluation.md)), reasoned about together so neither is dropped.
- **Aspiration + alignment-check intent**: alignment scoring — how a candidate decision pulls toward (or away from) the aspiration's direction.
- **Question + answer intent**: hypothesis brief — what's known (from refs + adjacent facts), what's still unknown, what would resolve the question.

When in doubt about the shape, name what the user is engaging on and what they want as outcome — that pair selects the brief shape.

## After the move lands

Whatever post-engage move the user picks, end with the same closing protocol:

1. Confirm what was produced — new entries (signals, decisions, closures), graph changes, code commits.
2. Surface what remains open — unfinished ACs, queued follow-ups, signals worth capturing.
3. Prompt for the next move if natural — implement, evaluate, capture, or stop.

The engagement isn't complete until the loop closes back into either a graph change or an explicit "nothing further on this anchor."
