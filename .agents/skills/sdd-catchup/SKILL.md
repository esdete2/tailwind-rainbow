---
allowed-tools: Bash(sdd *)
compatibility: Designed for OpenAI Codex
description: Produce a colleague-style catch-up briefing on the SDD project. Threads recent activity, active work, and warm gaps into 2–4 story-arc clusters with action-tight numbered items. Use as the check-in mode when starting a session or whenever a fresh briefing is wanted.
metadata:
    sdd-content-hash: c2ccd48f6dd289c141fe14e5fb09550b4e8ecad3a867539d0b6664e137177a34
    sdd-version: 0.17.0
name: sdd-catchup
---

You are producing a fast, useful catch-up for a competent colleague who knows the project but missed the week. **For composing this briefing only**, the fetched data below is your entire input — work directly from it, with no other lookups and no `sdd show` follow-ups. This scoping covers the briefing itself and nothing after it (see the handback note at the end).

Goal: a colleague-style briefing that surfaces what wants the user's next action. Cluster by project thread (current relevance, not kind or layer). Compress the input — don't echo CLI output verbatim.

# Tone of voice

Write like you're giving a fast, useful catch-up to a competent colleague who knows the project but missed the week. Less academic, more direct. Find the interesting thing in what happened — the unblock, the surprise, the convergence — and lead with it. Use causality to thread events: this finished, so this is now possible. Keep it lightweight: short sentences, plain words, room to breathe between paragraphs. Not chatty or performative — just the kind of explanation you'd actually want to hear.

## Mechanical swaps (lookup, no thinking)

- conflate → mix up, blur
- encompass → include
- operationalize → start using, apply
- leverage → use
- surface (as verb) → find, show, notice, catch
- uncover → find
- expose → show, turn up
- manifest → show up
- obviate → make X unnecessary
- primitive (project tic) → say what it actually is
- mandate (project tic) → rule, requirement
- leak (as noun, project tic) → say what's leaking
- "the X arc" / "the X runway" → say what happened
- load-bearing → important, critical (unless literal structural weight)
- hot, warm, hottest, warmest (heat-score translation) → describe what's drawing attention; e.g. "highest heat" → "drawing the most refs", or "context cost is climbing"

## Judgment patterns (read context, then rewrite)

- Passive surfacings ("X was uncovered", "Y surfaced") → first-person past: "we found X", "we caught it during Y".
- Abstract noun chains ("declarative intent with pre-resolved data") → describe the situation in plain words.
- "Breaks X by Y-ing Z" pattern → describe the actual consequence, not the rule violation.
- Internal references from entry text — slice numbers, AC numbers, version labels, fixture names, commit hashes. The reader doesn't have that context. Describe the work, not the project's internal labels.
- Echoing vocabulary from entry text — entries themselves use the banned words verbatim. Paraphrase even when copying from the source feels natural.
- Adjective stacking — one is usually enough.
- Trying to sound complete — capture what matters, not every nuance.

## Transformation examples (patterns, not phrases to copy)

  Bad: The team encountered an unexpected bottleneck while operationalizing
       the new caching layer.
  Good: The team hit a problem when they started using the new caching
        layer.
  Why: "encountered" → "hit"; "operationalizing" → "started using"; cut
       "unexpected" as filler.

  Bad: The deployment pipeline conflates artifact provenance with
       environment configuration.
  Good: The deploy script can't tell artifacts apart from environment
        settings.
  Why: "conflates X with Y" → "can't tell X apart from Y"; cut
       "provenance"; shorter compound noun.

  Bad: An incompatibility was uncovered between the new payment processor
       and the legacy auth system during integration testing.
  Good: We found the new payment system breaks our auth — caught it in
        integration tests.
  Why: passive "was uncovered" → "we found"; "incompatibility" →
       "breaks"; cut "legacy"; one clause instead of two.

  Bad: The retrospective surfaced three structural patterns and two
       operational concerns warranting further analysis.
  Good: The retro turned up five things worth digging into.
  Why: "surfaced" → "turned up"; drop the false categorization (just say
       "five things"); "warranting further analysis" → "worth digging
       into".

  Bad: The handler breaks transactional integrity by performing partial
       state updates.
  Good: The handler updates some things but not others, so the state can
        get out of sync.
  Why: "breaks X by Y-ing Z" pattern hides the concrete failure.
       Describe the actual consequence in plain words instead of naming
       the rule violation.

  Bad: Slice 8 closed the parent plan.
  Good: The closing piece shipped.
  Why: "Slice 8" is internal vocabulary from the plan body — the reader
       doesn't have that context. Describe the work, not the project's
       internal labels.

## Target-tone example

This is a finished briefing from a DIFFERENT DOMAIN (a small coffee roastery using SDD for a new subscription product). Match the REGISTER: short sentences, plain words, causal threading, story-arc headers. Do NOT match the words — your domain is the scope of this project. Apply the same discipline to whatever you find in the fetched data.

----

*Current focus: ship the subscription pause and decide GreenLeaf this fortnight.*

**The GreenLeaf decision is in — guardrails set**

The partnership is captured: we engage on our terms, full brand control, no co-branding. Jun added a guardrail covering all future deals — he picks the beans and writes the stories, no exceptions.

1. Open negotiations with GreenLeaf and hold our line (`d-stg-w4p`).
2. Watch new partnership signals against Jun's guardrail (`d-stg-k3f`).

**Three customer asks landed last week**

Lena wants more of the Sidama she loved (`s-ops-c2j`) — no path. Marco wants to pause while traveling (`s-ops-n4t`). Thomas got locked out after switching email (`s-ops-j7w`). Mara had to dig him out manually.

3. Build the subscription pause feature (`d-cpt-b4k`).
4. Decide Lena's reorder question — does it shift us toward a shop? (`s-cpt-f6m`).
5. Add the email update flow before more lock-outs land (`d-tac-c9w`).

**Content patterns from the analytics**

Tasting notes hold people for 3 minutes. The brewing guide gets 20% of views. Jun wants to try personalized brewing recommendations per discovery.

6. Run the personalized brewing experiment (`d-cpt-a2m`).

---

**Other open:**

- A. Fulfillment delay if we roast-to-order
- B. Auth approach beyond the email update fix
- C. Share-message length and prominence

Say *drill A* or *survey* for the full picture.

**What do you want to move forward?**

----

Things to notice in the example:

- Headers carry the story arc, not the kind.
- Trails are 1–3 short sentences, no semicolons.
- IDs appear inline in the trail when a specific entry is named, AND again at the end of the corresponding numbered item.
- Items lead with verbs and end with a period.
- Drill items can be 2–5 short labels — single-entry areas are fine.
- No "hot", "warm", "primitive", "mandate", "expose", "surface" anywhere.
- Aspirations and focus shaped what got threaded but were not restated as content. The italic focus line is the only mention.

## Test

Read each sentence as if saying it to a person at coffee. If you wouldn't say it that way, rewrite. Stay grounded — don't invent or speculate. Conversational doesn't mean loose.

## Names that stay

`sdd view`, `not()`, CQRS, `kind: focus`, `kind: annotation`, engage, `/sdd`, real entry IDs (e.g. `d-tac-1du`). These are real names of real things — keep them.

## Aspirations and focus — for judgment, not for content

The main `/sdd` skill injects active aspirations, active focus, and participants as always-on framing — read them from that context for threading judgment, not for content to render.

- Use aspirations to understand what the project is pulling toward.
- Use active focus to understand what we're attending to in this period.
- Don't restate aspirations in the briefing. They're context for your judgment, not content for the reader.

For focus: render a single italic summary line at the top, in plain language: "Current focus: <one-sentence plain summary>." Skip the line entirely if there are no active focuses. Do not enumerate involvement triples or repeat focus-entry text.

## Open loops — weave into threads, don't list

One of the fetched blocks is the **open-loops** lane (below): the coldest active commitments — things committed to or raised but not yet acted on. Heat misses these, because a fresh entry that nothing refs yet scores near zero and drops off the list. Don't render them as a separate "Open loops" section — that would scatter one storyline across two lists and recreate the kind-grouping the briefing exists to avoid. Instead:

- **Weave each open-loop entry into the thread its upstream belongs to.** Every entry carries its outgoing refs (the `→` sub-lines) — follow them to the story arc it builds on, and fold it in there, marked as not-yet-acted-on ("you captured this last week, still open").
- **A genuinely disconnected entry is its own beat.** If an open-loop entry has no upstream, or none that shows up in any other thread, it's a new line of work — give it a short "a new direction opened" beat. That's high-value to show.
- **Thread once.** An entry already surfaced via "Active and hot" or "Open and warm" is threaded a single time — don't repeat it because it also appears here.

# Fetched data

The five blocks below are injected fresh each invocation. Read them as your sole input **for composing this briefing** — don't run extra lookups to assemble it.

Run `sdd view --layout='kind(done):rank(by(date)):n(10):name("Recent done"):as-list'` and use its output as context.

Run `sdd view --layout='kind(plan,activity,directive):active:not(intent(guiding)):rank(heat(exp-7d)):n(8):expand(refs(inactive)):name("Active and hot"):as-list'` and use its output as context.

Each active entry may carry indented `→ <verb> <id> {status: …}` sub-lines for references whose target is currently inactive (closed or superseded). The sub-line shows the referenced entry's present state only — no timestamp, and no relationship beyond the verb (which is the generic `refs` for older entries). Don't render the sub-lines verbatim. This lane carries pending and unspecified directives but not guiding ones — guiding directives are standing context, surfaced separately at session start, not action items.

Run `sdd view --layout='kind(plan,activity,directive,gap,question):active:not(intent(guiding)):rank(coldness(exp-30d)):n(8):expand(refs):name("Open loops"):as-list'` and use its output as context.

This is the **open-loops** lane — heat's inverse. It surfaces the coldest active commitments (plans, activities, directives, gaps, questions): fresh, un-acted-on entries rank highest, because heat is blind to a just-captured entry that nothing refs yet. Each entry carries **all** its outgoing refs as indented `→ <verb> <id> {status: …}` sub-lines — its upstream, the thread it belongs to. Use these to weave it in (see "Open loops — weave into threads, don't list" above). Don't render this as its own block.

Run `sdd view --layout='kind(gap,question,insight):active:rank(heat(exp-14d)):n(15):name("Open and warm"):as-list'` and use its output as context.

## Work in progress

Run `sdd wip list` and use its output as context.

# Render in this exact format

```
*Current focus: <plain-language summary, one sentence, or skip if none>*

**<Story-arc header for thread 1>**

<1–3 short sentences of trail. White space between paragraphs.>

1. <Action-tight item> (`<short-id>`).
2. <Action-tight item> (`<short-id>`).

**<Header for thread 2>**

<Short trail.>

3. <Item> (`<short-id>`).
```

(2–4 threads total; 6–8 numbered items total across all threads.)

```
---

**Other open:**

- A. <area>
- B. <area>
- C. <area>

Say *drill A* or *survey* for the full picture.

**What do you want to move forward?**
```

# Format rules

- Items and trail sentences: ≤ ~15 words each. Split if longer. No semicolons in body — they signal report mode.
- Paragraphs of 1–3 short sentences. White space between them.
- Thread headers: bold with `**`. Story-arc phrase, not a kind name.
- IDs: backticks, in parens. Always at the end of numbered items. Inline in trails when the trail names a specific entry — repeat in the item below if applicable, that's fine.
- Blank line between threads. No blank line between numbered items within one thread.
- `---` separator before the closing block.
- Drill items: 2–5 short labels as bulleted A–E list. Single-entry areas are fine.
- Final prompt: bolded, single line, open question.
- Focus summary: italic, one line, at the very top. Skip if no active focuses.

# Don't

- Print `sdd view` output verbatim.
- Number every entry.
- Re-cluster by kind or layer.
- Render a standalone "Open loops" section — weave open loops into the story-arc threads instead.
- Add per-entry status / lifecycle commentary.
- Suggest a specific next step in the prompt.
- Add a standalone preamble line with graph stats.
- Restate aspirations or focus entries as content — they're framing.
- Echo banned words from entry text — paraphrase.
- Echo internal references (slice numbers, AC numbers, version labels, fixture names) — describe the work in plain words.

# After the briefing — hand back to /sdd

The "sole input, no lookups" rule above applies **only to composing this briefing**. It does not govern what comes next.

Once the briefing renders, control returns to `/sdd` and normal grounding resumes. The summaries you just read are pointers, not facts — and the catch-up named only a slice of the graph. So when the dialogue turns to any concept or area, don't reason from those summaries: run the **Widen → Inspect** moves first (see `/sdd` → "Ground before you claim — widen, then inspect"). Widen by searching from several different angles to find the entries the catch-up didn't name; then inspect the promising ones in full. Reading only what the briefing named confirms what you already spotted — it won't surface what you missed.
