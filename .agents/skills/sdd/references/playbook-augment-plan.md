---
metadata:
    sdd-content-hash: a193696f888fedb6eb8e10ff3908a016846b9ef393e8c92e25126ee7179a8087
    sdd-version: 0.17.0
---
# Augment Plan Playbook

Plans accumulate refinements during implementation. The augmentation pattern (per `d-prc-9ti`) makes these refinements lightweight — capture a directive that refs the plan rather than superseding it or letting the refinement drift silently into code.

## Three options on a spectrum of ceremony

When a plan needs adjustment, three paths sit on a spectrum:

**Mechanical fix** — typo, missing ref, formatting correction. No new entry. Edit the file in place; if the change touches the body, regenerate the summary via `sdd summarize <id>`. Per `d-cpt-e1i`, only no-meaning-change corrections qualify; semantic changes never do.

**Augment plan (downstream directive)** — the refinement sharpens a specific AC, extends scope on a narrow point, or codifies an implementation choice that the plan was silent on. The plan's overall direction holds. Discovered during pre-implementation walk-through, early implementation, or after empirical findings. Capture as a directive that refs the plan; the plan stays active; the directive joins the plan's implicit AC chain.

**Supersede plan** — the refinement changes direction, restructures multiple ACs, or invalidates the plan's framing. Heavy but warranted when the plan's spine no longer holds. Capture as a new plan with `--supersedes <old-plan-id>`.

When in doubt between augment and supersede, augment first. If augmentations stack high enough that the plan's shape no longer reads cleanly from the original entry, that's the signal to supersede.

## How to capture an augmenting directive

1. **Description**: state the refinement, its rationale, and which AC(s) of the plan it sharpens or extends. Be specific about what changes for the implementing agent.
2. **Refs**: the plan being refined (primary). Refs to `d-prc-9ti` are not required for routine augmentations — the pattern is established at the framework level — but include it when explicitly demonstrating or testing the pattern.
3. **Layer**: tactical for spec sharpening; process for skill/workflow refinements; operational for narrow execution-shape clarifications.
4. **Kind**: directive (default). Don't use `kind: plan` for an augmentation — you're committing to a refined behavior, not introducing decomposable scope.
5. **Confidence**: typically matches or sits one notch below the original plan's confidence — the augmentation is grounded in the plan's reasoning but adds a specific refinement.

## How the closing done signal handles augmentations

When closing an augmented plan:

1. Read the plan's original `## Acceptance criteria` AND every downstream directive that refs the plan. The union is the contract.
2. The done signal addresses both with the same dialogue rigor — each AC and each augmenting directive's commitment gets a confirmation with evidence or a deviation explanation.
3. Pass all entries to `--closes`: `sdd new s <layer> --kind done --closes <plan-id>,<dir1-id>,<dir2-id> ...`. The done signal closes the plan and every augmenting directive in one move.

## Trade-off — accept it explicitly

The augmentation pattern distributes a plan's acceptance contract across the original entry plus its downstream refinements. Closing requires reading the full chain rather than a single document. This cost is accepted as the price of fluid, dialogue-shaped work, aligning with `d-stg-3k0`'s commitment to no parallel artifacts and no ceremony — the alternative (force every refinement through supersession) creates more friction than the distributed read does.
