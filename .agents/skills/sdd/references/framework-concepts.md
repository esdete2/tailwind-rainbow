---
metadata:
    sdd-content-hash: dff091a1781d5e514c7d7ec02305ad8999d867b16ebb3d45a1d169638c2327a6
    sdd-version: 0.17.0
---
# SDD Framework Concepts

## The Loop

One universal loop: **Signal → Dialogue → Decision → Done signal → Signal...**

- **Signal** (`s`): Something the graph should know about — an observation, gap, fact, open question, synthesis, or a record of completed work.
- **Dialogue**: Collaborative reasoning about what a signal means and what to do. Happens between humans, agents, or both. Not recorded directly — its outputs become signals and decisions.
- **Decision** (`d`): Something we commit to. Immutable once recorded. The durable asset of the framework.

Completed work is itself a signal — a `kind: done` signal — which closes the decision it fulfils and adds to the pool of observations future loops draw from.

## Entry Types

The graph has **two entry types** — signal and decision. Each carries an explicit **kind** that sharpens what the entry is for. Pre-flight enforces that kind matches the narrative shape.

### Signal kinds (7)

| Kind | Question it answers | Default? |
|---|---|---|
| `gap` | What needs attention? | yes |
| `fact` | What do we know? | no |
| `question` | What do we not know? | no |
| `insight` | What have we synthesized? | no |
| `done` | What was accomplished? | no |
| `actor` | Who is participating? | no |
| `annotation` | Structural metadata layered onto referenced entries | no |

A `done` signal records a commitment fulfilled — it must carry at least one `closes` or `refs` pointing at the commitment it completes.

An `actor` signal records a participant identity at the process layer. See the "Actors and Roles" section below for the full semantics, including the write-once canonical invariant.

An `annotation` signal carries structural metadata — today, topic membership — for the entries it refs. See "Topics and annotations" below.

### Decision kinds (8)

| Kind | Question it answers | Default? |
|---|---|---|
| `directive` | Which way do we go? | yes |
| `activity` | What's next to do? | no |
| `plan` | What must be true when done? | no |
| `contract` | What must always hold? | no |
| `aspiration` | What are we pulling toward? | no |
| `role` | How does an actor participate? | no |
| `focus` | What are we attending to in this period, and who is engaged? | no |
| `procedure` | How does a playbook move run? | no |

Plan decisions require a `## Acceptance criteria` section with at least one checklist item. Each AC is a verifiable outcome — the contract between plan author, implementing agent, and the pre-flight validator that checks the closing done signal.

A `role` decision records one actor's participation pattern — per-actor scope, orthogonal to contracts (which are universal). See "Actors and Roles" below.

A `focus` decision declares involvement triples for the current period. Layer-flexible (like directive/plan/activity). See "Focus and involvement" below.

A `procedure` decision defines a playbook move as an executable graph entry — frontmatter carries a required write-once `canonical` (the move's stable identity, e.g. `capture`) plus the move's state machine; the body carries per-step instruction units. Process layer, like actor and role. Base procedures ship embedded in the sdd binary; a project customizes by superseding a chain head, and when a shipped successor and a project override compete, the project head wins for execution while lint flags the fork for deliberate grooming. Procedures are engine-authored surface — everyday captures don't create them; see the workflow-engine line.

### Directive intent

A `directive` carries a required stored `intent` attribute — `pending`, `guiding`, or `settled` — supplied explicitly at capture (no default; a default would fabricate the non-derivable posture the attribute exists to capture). Intent is meaningful only on directives; every other kind omits it, and a directive captured before the attribute existed reads as unspecified (rendered exactly as today).

- `pending` — demands follow-up action; the action-on default.
- `guiding` — standing context that shapes later decisions without ever "completing". Surfaced at session start as standing context; held out of the catch-up action lanes.
- `settled` — born terminal: a deliberate "no action needed" / "keep as-is" / intake-dismissal that needs no closing edge. A settled directive derives `{status: settled}`, drops out of active listings like any terminal entry, and is retired only by supersession — closing one is rejected. Its body must justify *why* it is terminal (pre-flight emits a medium `settled-unjustified` finding otherwise).

## Distinguishing tests

When drafting a decision, the kind emerges from dialogue. Apply these tests in order:

1. Does the entry push against a constraint that should always hold? → **contract**
2. Does it pull toward a direction with no completion criterion? → **aspiration**
3. Does the narrative justify a choice against alternatives? → **directive**
4. Does it shape the WHAT (define verifiable outcomes)? → **plan** (requires `## Acceptance criteria`)
5. Does it dispatch THAT work happen (shape known from context)? → **activity**

### Strategic directive vs aspiration

Test: does the entry have a plausible completion criterion?

- Yes (closable by done or supersede) → **directive**
- No (perpetual pull, every decision aligned against it) → **aspiration**

Confidence often signals this — directives can go high-confidence once settled; aspirations sit at medium indefinitely.

### Activity vs plan (WHAT vs THAT)

- **Plan** shapes the WHAT — defines what must be true when complete. ACs are the mechanism.
- **Activity** dispatches THAT — specifies work whose shape is already known from context (parent plan, refs, or self-evident narrative).

Boundary test: is validation a single self-evident "did you do the thing?" → activity. Does the AC specify a testable outcome separable from the work itself? → plan.

## Layers

Every entry has a layer describing the depth of thinking:

| Layer | Abbrev | Thinking |
|-------|--------|----------|
| Strategic | `stg` | Why does this exist? What direction? |
| Conceptual | `cpt` | What approach? Key ideas and boundaries |
| Tactical | `tac` | How to realize it? Structures and trade-offs |
| Operational | `ops` | Making it happen. Individual implementation steps |
| Process | `prc` | How do we work? Contracts, review rules, release process |

## Immutability

**Documents are never modified after creation.** This is a hard constraint.

- A decision is superseded by a new decision with an explicit `supersedes` field (distinct from `refs` which means "builds on").
- Current state is reconstructed by traversing the graph, never maintained separately.
- Each fact lives in exactly one place — no redundancy across layers.

## Reference Fields

Three fields with distinct semantics:

- `refs`: "builds on / depends on" — context or foundation, **no status effect**. Each ref carries a `kind` from the closed set below; the kind names *why* the reference exists.
- `supersedes`: "replaces" — the referenced entry is no longer active/open. Bare-string ID list; no per-edge metadata.
- `closes`: "resolves / fulfills" — the referenced entry is no longer active/open. The closing entry says why the target no longer holds (see Retirement primitives). Bare-string ID list.

**Open signal** = not superseded, not closed. **Active decision** = not superseded, not closed.

Every ref on a new entry carries a kind from the closed vocabulary below. Pre-flight rejects missing or invalid kinds at high severity; an LLM advisory check flags mismatches between kind/desc and the entry body. The vocabulary is defined once in [ref-kinds.md](ref-kinds.md) and reused verbatim by the pre-flight rubric:

## Ref kinds

A ref is a contextual pointer with **no status effect** — closure is `closes`/`supersedes`, never a ref kind. A kind names **why the pointer exists**, chosen from what the **body** asserts: write the body, then tag the strongest relationship it states. Kinds are defined by **principle** (the relationship and its direction), not by which target types they are "allowed" on — whether a target is empirical (`fact`/`done`) or conceptual (`insight`/decision) is read from the target's kind, not encoded in the ref kind.

**Direction.** A ref is written on the *source*, pointing at the *target* (read as `source → target`). Most kinds point **backward** (you ref prior context). A small **forward class** — `surfaces`, `required-by` — is captured on the source pointing at what comes out of it. Because entries are immutable and you can only ref something that already exists, the kind flips with capture order: whichever entry is written second carries the edge. Two relationships are **order-independent pairs** — `depends-on`/`required-by` and `surfaces`/`surfaced-by` — where the second-captured entry takes the forward kind (`required-by`, `surfaces`) if it is the prerequisite/producer, the backward kind (`depends-on`, `surfaced-by`) if it is the dependent/produced. A single ref connects both ways — the target's downstream/`refd-by` shows the source — so a paired ref needs **no back-ref**. Don't add a weak `related` just to point back.

| Kind | `source → target` | Apply when | Not when |
|---|---|---|---|
| `grounded-in` | founded on / reasons from | the target is a basis the source rests on — a contract, aspiration, standing directive, a **fact** taken as premise or cited as empirical proof, an **insight** reasoned from, or a prior decision conformed to | you realize/operationalize it → `addresses`; you extend a closed line → `builds-on` |
| `builds-on` | continues / extends | the target is **closed** and you extend it, or you are the next step after a finished chain | the target is active and sharpened in place → `refines`; you realize its commitment → `addresses` |
| `refines` | sharpens (in place) | the target is **active** and you narrow/clarify its commitments without replacing it (the augmenting pattern; the refining entry closes alongside the target) | the target is closed → `builds-on`; you realize it → `addresses` |
| `addresses` | acts on / realizes | responding to a gap/question/insight, **or** realizing a decision's commitment — operationalizing a directive, supplying a plan's AC or an activity's work (incl. partial, without closing) | you only reason from it → `grounded-in`; the target depends on you → `required-by`; the target is a terminal `done` (a completed fact, not an open concern) → `builds-on`/`grounded-in` |
| `surfaces` | created / discovered (forward) | doing the source's work created or discovered the target; capture the surfaced entry first, then the source that refs it | generic neighborly context → `related` |
| `surfaced-by` | was raised / produced by (backward) | the target's work created or discovered this entry, captured after the surfacer — the backward partner of `surfaces`, including when the surfacer is a terminal `done` (where `addresses` cannot apply) | you only **reason from** the target → `grounded-in`; generic neighborly context → `related` |
| `depends-on` | needs first (prerequisite) | your work is gated on the target landing or holding first | the target is a basis you reason from → `grounded-in` |
| `required-by` | is the prerequisite of (forward) | this entry is what a later plan/activity/focus was waiting on, recorded from the prerequisite's side | you do/supply the target's work rather than gate it → `addresses` |
| `related` | sibling / neighbor (the floor) | a genuine parallel sibling, or context a decision must account for but does not fulfil — when no sharper kind fits | any sharper kind fits — check the others **first** |

**`grounded-in` absorbs empirical citation.** Citing a fact's or done's measured data as proof is `grounded-in` to that fact/done; the empirical hardness is read from the target's kind, so a separate `evidence` kind would just be target-type specialization. Put the proof nuance in the `desc` ("…as evidence of feasibility").

**`refines` vs `builds-on`** turns on the target's status: active + sharpened in place → `refines`; closed or a forward next-step → `builds-on`.

**`related` is the floor, never a default** — it is the most over-reached kind. For a decision target, split: the source *realizes* it → `addresses`; the source is *context it accounts for* → `related`.

**A terminal `done` is not "addressed."** A `done` records completed work — it is not a gap, question, insight, or commitment, so the relationship `addresses` names does not hold for it. When a later entry takes up a follow-up a done flagged, the kind is `builds-on` (the next step after that finished chain) or, when the entry reasons *from* the done as empirical evidence, `grounded-in` — and when the done's work *raised or produced* this entry, `surfaced-by` — never `addresses`. Choosing between `builds-on` and `grounded-in` here is a defensible-choice question, not an error.

**`surfaced-by` vs `grounded-in`.** Use `surfaced-by` when the target's work **raised or produced** this entry — you exist because of it. Use `grounded-in` when this entry merely **reasons from** the target as a basis. The split matters most when the surfacer is a terminal `done`: `addresses` is mechanically blocked there, so without `surfaced-by` the "raised by" relationship has no clean home and gets mis-anchored onto a convenient live decision.

**Growth.** Add an inverse kind only when the other direction has no *adequate* home. `depends-on`'s forward partner was homeless → `required-by`. `surfaces`'s reverse was first judged already covered by `grounded-in`/`addresses` → no inverse; that call proved wrong — those fallbacks are lossy (they understate "raised by") and mis-target (on a terminal-`done` surfacer `addresses` is blocked entirely), so `surfaces`'s reverse is now `surfaced-by`, added as its backward partner. The principle stands — homelessness includes *inadequate* homes, not only missing ones; that one "no inverse" judgment is the correction. Every added kind is one more judgment call at capture and one more rubric boundary — weigh that against a real query need before adding more.

## Retirement primitives

Every entry is retireable. Two primitives:

- **supersedes** — same-kind successor replaces it
- **closes** — new entry retires it without replacement

**What makes a close valid is the stated why**, not the closer's kind. The closing entry must say why the target no longer holds. These closes are refused no matter what the entry says:

- a **question, actor, or annotation** closes nothing; it states no findings, so it cannot report that something stopped holding
- a **decision other than a directive** does not close another decision; `supersedes` records the replacement and links the new decision to the one it replaces
- a **settled directive** is finished the moment it is written; it can be superseded, never closed

Typical per-kind retirement paths:

| Entry | Supersede path | Close path |
|---|---|---|
| gap | refined gap | decision addressing it; done signal (short-loop, see below); or any entry that says why it no longer applies |
| fact | corrected fact | any entry that says why it stopped holding (often a directive: "no longer true / no longer relevant"; a fact may close a fact when no corrected version exists) |
| question | refined question | directive: "answered as X" or "won't pursue"; or fact / insight (dissolution) |
| insight | corrected insight | any entry that says why it no longer holds (directive: "noted, no action needed"; or the done that records the work that made the insight no longer correct) |
| done | corrective done (rare) | — (terminal — facts of execution) |
| annotation | replacement annotation (rare; usually a new annotation entry instead) | any entry that says why the label is no longer wanted |
| directive | replacement directive | done signal (standard); directive retiring it |
| activity | replacement activity | done signal (standard); directive retiring it |
| contract | replacement contract | directive retiring it |
| plan | restructured plan | done signal (via ACs); directive retiring it |
| aspiration | evolved aspiration | directive retiring it |
| focus | replacement focus (priorities shift mid-cycle) | done signal (cycle ended naturally); directive retiring it |
| procedure | revised procedure (project customization or shipped successor) | directive retiring the move without replacement |

**Retirement rationale is required** whenever a close retires an entry rather than records its completion. Pre-flight checks that the narrative states *why*, not whether the why is correct, and flags a weak rationale instead of blocking the close. It matters most where a commitment is retired unbuilt: a `done` signal says what was delivered, a retiring directive must say why nothing will be.

## Short-loop closure

A `kind: done` signal may close a `kind: gap` signal directly, bypassing a decision. Use for narrow execution work where no choice was made — *"updated X to fix Y"*.

**Smell test before drafting:** if you'd have to describe *a choice or justification* to capture what was done, stop and capture a decision first. Approach-shaped narratives (*"changed the approach to Z because W"*) read like smuggled decisions; pre-flight flags them — more strictly at higher layers (strategic / conceptual) than at operational / process. At strategic layer, any short-loop closure is blocked: strategic gaps require a captured decision.

## Proposals vs Facts

Open entries — signals, unclosed decisions, open plans — describe *where the graph might go*, not where it is. Only a closing entry turns proposal into fact: a done signal declares what was done, a retirement says why the entry no longer applies.

## Contracts

Contracts are decisions marked `kind: contract`. They define standing constraints — architectural rules, authority boundaries, process agreements. They emerge from working patterns: a directive that hardens into a permanent rule can be reclassified via supersedes + `kind: contract`. Contracts define constraints, not participation boundaries — anyone can contribute signals and dialogue.

## Actors and Roles

Participants are first-class graph entries. Two kinds partition identity from participation:

- **Actor signals** (`kind: actor`) record *who* a participant is — frontmatter carries a required `canonical` (the identity string used in `participants` fields) and optional `aliases` (read-side convenience for mining and dialogue comprehension). Process layer. Default confidence high. Lifecycle: supersede to correct identity facts, retire via directive that closes the head actor signal.
- **Role decisions** (`kind: role`) record *what a participant does* — frontmatter's required `actor:` field names the canonical of the actor-identity chain the role binds to. Process layer. Default confidence medium. Multiple roles per actor are permitted. Roles are **orthogonal to contracts**: a role scopes one actor's participation pattern, while a contract is universal.

### Canonical-only in participants

The `participants` field on every entry lists **canonical names only** — never aliases. Aliases are resolved on the read side (agent comprehension, mining external sources) and are never a validation-time concern. The pre-flight mechanical canonical check (binary severity: pass or high) enforces this at capture time against *active* actor canonicals (currency — you don't add retired actors to new entries); `sdd lint` surfaces any participant name that doesn't resolve to *any* actor-identity chain's canonical history, active or retired (existence — a retired chain still uniquely owns its canonicals via the write-once invariant).

### Write-once canonical invariant

A canonical is **write-once across actor-identity chains**: once used by any chain, it cannot appear in any other chain, even after the original chain is closed. Within a single supersession chain, canonicals can change across entries (e.g., typo correction) or repeat freely. This preserves the temporal stability of historical participant references without requiring per-entry timestamp-based name resolution. `sdd lint` catches invariant violations as defense-in-depth against race conditions or validator bypass.

### Role-status cascade (chain canonical history)

Role status derives from the bound actor-identity chain's canonical history rather than from closes/supersedes pointing at the role itself:

1. A role with `actor: X` binds to the unique chain that has ever held `X` as canonical.
2. The role is **derived-active** iff that chain's head actor signal is active (not closed).
3. Retiring the chain (closing its head) transitively **derives-closed** every role that ever bound to any canonical in the chain's history. No separate role-retirement entries are needed for the cascade.

Capture-time and derivation-time are complementary:

- **Capture-time** (pre-flight) requires the role's `actor:` to match the **current head** canonical and the role's `refs` to include that head's entry ID. This forces new captures to use the latest identity form.
- **Derivation-time** (status rendering) walks **full chain history**. This keeps older role captures valid after within-chain canonical corrections — the role's `actor:` value stays stable under identity typo fixes.

Roles that reference a canonical matching no chain are **orphan** — flagged by the `sdd lint` orphan-role check. Orphans indicate abnormal state (direct file edits, corruption, validator bypass), distinct from the normal-case cascade where retirement derives-closes automatically.

### Surfacing participants

`sdd view --layout='participants'` renders a **Participants block** grouped by active-actor canonical. Each group header is the canonical; entries listed underneath are the active actor signal plus every derived-active role bound to that chain. The block is suppressed during grace (zero active actors) so fresh graphs stay quiet. For filtered views, `sdd view --layout='kind(actor):as-list'` and `kind(role):as-list` expose the underlying entries directly.

## Topics and annotations

Topics are hierarchical labels (`/`-joined paths, e.g. `infrastructure/cli`, `type-system/kinds`) that cluster entries across kind, layer, and type. Two ways to assign:

- **Inline `topics:`** in any entry's frontmatter — list of label strings. Zero-ceremony tagging at capture time.
- **`kind: annotation` signals** — structural metadata entries that point at member entries via `refs:` and declare topic assignments via `topics:`. Each item in an annotation's `topics:` list is either a plain label string (applies to *all* of the annotation's refs) or a mapping `{label, members}` where `members` is a subset of refs.

Either path produces "membership" — the entry is in the topic. The graph computes the **effective topic set** for any entry by merging its inline topics with topics declared by every annotation whose refs (or per-topic members sub-selection) include the entry. An annotation is itself a member of every label it declares — its own labels join its effective topic set the same way inline `topics:` would, so an annotation surfaces under the topics it assigns (members sub-selections only narrow which *refs* receive a label, never whether the annotation carries it). Effective topics render as `<label1, label2>` between `{status: ...}` and the summary on entry lines, and via the `Topics:` derived field on `sdd show`.

**Path semantics:**

- Components match `[\p{L}\p{N}\-]+` (Unicode letter/digit plus hyphen). Empty components rejected.
- Comparison is case-insensitive on each component; first-seen casing wins for display.
- Filter via `sdd view --layout='topic(<label>):as-list'` does component-wise prefix match (case-insensitive). `topic(UX)` matches `UX`, `UX/CLI`, `UX/CLI/Status` — but does not match `UXTesting` (because matching is component-wise, not raw-string).

**Label stability.** Topic labels are stable identifiers, the same principle as canonical participant names: a label means the same cluster everywhere it appears, so the graph stays coherent only if labels are reused rather than reinvented. Before tagging, check what labels are already in use and reuse one that fits the cluster; create a new label only when no existing one does. Prefer hierarchical paths (`foo/bar`) when a label belongs to a family — `type-system/topics` and `type-system/kinds` cluster together under `type-system` without colliding. This stability is what the capture-time topic procedure in `/sdd` enforces by researching existing labels before proposing one.

**No alias mechanism in v1.** If a topic label needs to evolve, capture a new annotation that re-assigns members under the new label rather than rewriting historical entries.

The annotation kind is general — today it carries topics, but future annotation forms (other typed-edge metadata) can add their own frontmatter fields alongside `topics:` without requiring a new kind.

## Focus and involvement

A `kind: focus` decision declares "what we're attending to in this period, and who is engaged." It carries:

- **`involvement:`** — list of triples, each `{target, actors?, when?}`. Required: `target` (entry ID). Optional: per-involvement `actors` and `when` overrides.
- **Top-level `actors:`** — focus-level default actor canonicals. Per-involvement values override; omitting on a triple inherits this default.
- **Top-level `when:`** — focus-level default temporal scope `{from?, to?}`. At least one of `from`/`to` is required when `when:` is present.

**Actors-set vs actors-omitted:** an involvement triple that declares `actors: []` explicitly is *deliberately unattributed* — the canonical "pull-available" state, in scope but awaiting pickup. A triple that omits `actors:` entirely *inherits* the focus-level default. The CLI preserves this distinction at capture time and through frontmatter roundtrip; rendering and ranking layers treat the two cases differently.

**Layer-flexible.** Focus is not pinned to a single layer like actor/role. Use the layer matching the cadence: process or operational for daily/weekly, tactical for cycle-level, strategic or conceptual for roadmap.

**Dual lifecycle.** A focus retires either by supersession (priorities shift mid-cycle) or by a closing done signal (cycle ended naturally — declared work was completed or work-set has resolved). Both paths are valid; pre-flight does not argue which one applies when. Three observation patterns surface as informational findings (low severity, never blocking): closure with no target completions, supersession with zero shared targets, and all-pull-available involvement.

## Rendering Conventions

Entry lines in `sdd view`, `sdd search`, and summary chains carry three kinds of information, visually distinguished by notation:

- **Identity (kind, layer, type)** renders as plain qualifiers: `tactical plan decision`, `process gap signal`. Kind acts like a sub-type — identity, not an attribute.
- **Stored attributes** live in the entry's YAML frontmatter — written at creation, immutable afterwards. Rendered with square brackets: `[confidence: medium]`.
- **Derived attributes** are computed from graph relationships on every read — never written on the entry itself. Rendered with curly braces: `{status: active}`, `{status: open}`, `{status: closed-by <full-id>}`, `{status: superseded-by <full-id>}`, `{status: settled}` (a born-terminal directive — see Directive intent). Done signals don't carry `{status: ...}` — they're terminal facts of execution with no lifecycle to track. The stored `intent` surfaces separately in square brackets, and only for `guiding` (`[intent: guiding]`) — pending and unspecified stay quiet, and settled shows through its `{status: settled}`.
- **Topic membership** is also derived (inline ∪ annotation) and renders with angle brackets between `{status: ...}` and the summary: `<infrastructure/cli, type-system/kinds>`. The segment is omitted entirely when the effective topic set is empty.

The stored-vs-derived split is what makes the immutability contract practical: state changes as the graph grows (a signal becomes closed when a closing done signal lands), but the entry file never changes. Reading `{status: ...}` tells you the current computed state; reading stored attrs tells you what was written originally.

Do not edit entries to "update" status — the graph computes it. To change status, add a new entry: a done signal or directive that `closes`, or a same-kind entry that `supersedes`.
