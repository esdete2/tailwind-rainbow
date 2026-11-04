---
metadata:
    sdd-content-hash: 032a718e387efd66ca549f3c585880e2a00559d13fc377add207c7f0c4ea3aa3
    sdd-version: 0.17.0
---
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
