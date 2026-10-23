---
metadata:
    sdd-content-hash: 4dd2428cb5c296fbc730919be8ef768b66c6886a9373dc5eeceae72bbd7a0300
    sdd-version: 0.17.0
---
# SDD CLI Reference

## Commands

- `sdd info` — session framing only: `Local participant: ...`, `Language: ...` (when configured), `Search: ...`. The session header surface for skill `!`sdd ...`` injections that need the agent to see who's local and which retrieval modes are available; also the bare-`sdd` default command.
- `sdd view --layout=<spec>` — compose custom graph views from source, filter, transform, aggregate, rank, page, and render primitives, with named macros as sugar. The overview surface: `decisions` / `signals` / `aspirations` / `contracts` / `participants` / `insights` / `done` macros render kind-grouped sections. `sdd view --help` prints the full grammar, vocabulary tables, and examples; bare `sdd view` reports the missing `--layout` and directs there. `--repo <repo-id>` (repeatable) / `--all-repos` fan out across connected repos. See "`sdd view` pipeline" below.
- `sdd show <id>` — full entry plus its upstream (grounding) and downstream (consumers) chains. Both shown by default: upstream depth 2, downstream depth 1.
- `sdd show <id> [<id2> ...]` — multiple IDs in one call render their entries back to back (handy for comparing a cluster, e.g. the entries a new one will ref)
- `sdd show <id> --up N --down N` — set the upstream and downstream expansion depths independently. Defaults: `--up 2 --down 1` (downstream fans out faster, so it stays shallower). `0` turns a direction off; `--up 0 --down 0` is the primary entry alone. Increase (e.g. `--up 4 --down 3`) to see more of an entry's surroundings on demand.
- `sdd new <type> <layer> [flags] <description>` — create entries (output prints the new entry ID, file path, and the LLM-generated summary so the agent can verify fidelity)
- `sdd summarize <id>` — regenerate the named entry's summary unconditionally (summaries are derived on demand with no staleness tracking). `sdd summarize --all` fills only entries that have no summary yet; add `--force` to regenerate every entry.
- `sdd summarize <id> --text "<summary>"` — write a user-supplied summary directly, bypassing the LLM. Use `--text -` to read from stdin. Single entry only; rejected with `--all` or multiple IDs.
- `sdd lint` — check graph integrity (dangling refs, type mismatches, broken attachment links, missing summaries, and cross-repo references whose target repo isn't a declared dependency). When an embedding provider is configured, also reports the search index's fingerprint and drift count.
- `sdd index` — warm up the machine-global search index (content-addressed by repo identity and embedder fingerprint, outside the working tree) over every entry on disk. Skips entries whose stored hash and embedder fingerprint match the manifest; `--force` re-embeds everything regardless. `--repo <repo-id>` (repeatable) / `--all-repos` also eagerly build the connected repos' indexes so the first cross-repo search is warm; `--force` reaches those connected indexes too. Required only on a fresh clone or after deliberate rebuilds — `sdd search` lazy-fills missing/stale entries on demand.
- `sdd search [--term <regex>...] [--query <phrase>] [--type d|s] [--layer ...] [--kind ...] [--repo <repo-id>...] [--all-repos] [--include-superseded] [--limit N] [--max-citations N]` — three-mode retrieval. `--term` runs text mode (live grep with multi-term AND), `--query` runs vector mode, both flags together run hybrid (RRF fusion). At least one of `--term` / `--query` is required; vector and hybrid require `Search: vector,text` in the `sdd info` header. `--repo <repo-id>` (repeatable) / `--all-repos` fan out across connected repos and fuse results into one ranked list (see "Cross-repo references" below). `--max-citations` caps the snippet sub-lines per entry (default 3); `--max-citations 0` suppresses them entirely, rendering entry headers only — the terse "which entries match, and what topics do they carry" lookup. See [search reference](search.md) for citation reading and mode selection guidance.
- `sdd repo add <clone-url>` — connect another graph for cross-repo references: clone its graph into a machine-local cache, verify its declared `repo_id`, register the connection, and record + commit a `dependencies:` entry in `.sdd/config.yaml`. Re-running for an already-connected URL just ensures the dependency is declared.
- `sdd repo list` — connected repos and whether each is cached.
- `sdd repo sync [repo-id ...]` — refresh connected caches to their latest pushed state (all, or the named repos).
- `sdd repo remove <repo-id>` — drop a dependency from `.sdd/config.yaml` (project-scoped; the cache stays). Refuses when any local entry still references that repo — removal would strand those references — unless `--force`, which removes anyway and names each stranded reference.
- `sdd wip start <entry-id> --exclusive --participant <name> <description>` — create WIP marker
- `sdd wip start <entry-id> --branch --exclusive --participant <name> <description>` — create WIP marker, create git branch and check out to it
- `sdd wip done <marker-id>` — remove WIP marker (deletes branch if merged)
- `sdd wip done <marker-id> --force` — remove WIP marker and force-delete unmerged branch (discard flow)
- `sdd wip list` — list active WIP markers

## Entry IDs

Every argument that takes an entry ID — positional args on `sdd show`, `sdd summarize`, and the `--refs`, `--closes`, `--supersedes` flags on `sdd new` — accepts both:

- **Full ID** (e.g. `20260408-104102-d-prc-oka`) — deterministic and collision-proof as the graph grows. **Agents always use full IDs when invoking the CLI.**
- **Short ID** (e.g. `d-prc-oka`, shape `{type}-{layer}-{suffix}`) — human convenience. Resolves to the full ID when the suffix uniquely identifies an entry. Ambiguous short IDs exit non-zero and list all matching full IDs.

Short IDs are fine in user-facing narrative (catch-up tables, grooming summaries, dialogue). Never substitute them for full IDs in CLI calls you construct — a suffix collision would break the call later when the graph grows.

### Cross-repo IDs

When repos are connected (see "Cross-repo references" below), an entry ID can name an entry in another graph:

- **Cross-repo ID** (`<repo-id>:<entry-id>`, e.g. `github.com/acme/platform:20260709-...-d-cpt-abc`) — a target's canonical repo identity, then the entry within it. This is the form stored on disk for any cross-repo reference.
- **Bare ID across repos** — a short or unprefixed-full ID resolves against the union of the local graph and its declared dependencies, not just the local graph. A unique match resolves; a genuine collision across repos exits non-zero and lists the candidates (the local one bare, foreign ones fully prefixed). This applies wherever a typed ID is resolved — `sdd show` and the `show` MCP tool. Written references always expand to the full `<repo-id>:<entry-id>` form regardless of how you typed them.

When you have only a short ID for a possibly-foreign entry, resolve it with `sdd show <short-id>` (a free read) and use the full ID it prints in any CLI call you construct.

## `sdd view` pipeline

`sdd view` runs a layout pipeline over the graph. Each section is a colon-chained sequence of function calls; multiple sections separate with commas. Render is always the section's terminator. Filters intersect cumulatively; non-filter modifiers (rank, page, name, render) apply last-write-wins per kind.

```
layout    := entry ("," entry)*
entry     := func (":" func)*
func      := name ("(" arg-list? ")")?
```

Args use parens: `kind(plan)`, `n(10)`. Multi-arg disjunction: `kind(plan,directive)`. Nested calls let algorithms carry decay: `rank(heat(exp-14d))`. Strings use quotes: `topic("infrastructure/cli")`. No whitespace anywhere except inside quoted strings.

### Sources

| Function | Semantics |
|---|---|
| `source(graph)` | All graph entries (default if omitted) |
| `source(wip)` | Active WIP markers from `.sdd/graph/wip/`. Disjoint vocabulary — only `name()` and `as-wip-list` compose; graph-side primitives error |

### Filters (graph source)

| Function | Semantics |
|---|---|
| `active` | Entries not closed and not superseded |
| `kind(K[, K2, ...])` | Disjunction within one filter; multiple `kind()` calls intersect |
| `intent(I[, I2, ...])` | Directives whose intent is in the set (`pending`, `guiding`, `settled`). Mirrors `kind()`: disjunction within a call, intersection across calls. Only directives carry intent, so this implicitly narrows to directives. Invalid values are rejected |
| `type(T)` | Entries of type T (`d`/`s` or `decision`/`signal`) |
| `layer(L)` | Entries at layer L (`stg`, `cpt`, `tac`, `ops`, `prc`; full names also accepted) |
| `since(spec)` | ISO date `YYYY-MM-DD` or duration `Nd|Nw|Nm|Ny`. Quoted string. m/y use calendar arithmetic; d/w use 24h offsets |
| `topic(L)` | Entries whose effective topic set has L as a component-wise prefix (case-insensitive) |
| `participant(P[, P2, ...])` | Entries listing any of the named canonical participants. Bare idents for single-word names (`participant(Christopher)`); quoted strings for names with spaces (`participant("Jonathan Philipp")`). Multiple `participant()` calls intersect |
| `untagged` | Entries whose effective topic set is empty — the inverse of having any topic. Counts annotation membership, not just inline `topics:`. The grooming/backfill entry point |
| `id(ID[, ID2, ...])` | Keep only the listed entries (intersects like other filters). Short IDs work bare (`id(d-tac-6tz)`); full IDs start with digits so they must be quoted (`id("20260520-131326-d-tac-6tz")`). Resolves short→full, surfaces ambiguity; an ID that matches nothing drops out silently |
| `not(<filter>)` | Excludes entries matched by the inner filter. Supported inner: `kind`, `intent`, `layer`, `topic` |

### Rank, page, output, transforms

| Function | Semantics |
|---|---|
| `rank(<algorithm>)` | Sort by computed score, descending. Adds `{score: X.XXX}` to rendered entries |
| `n(N)` | Take first N entries (after filtering and ranking) |
| `skip(N)` | Drop first N entries (after filtering and ranking, before `n(N)`) — pages through what a bounded list cut |
| `name(<string>)` | Final section header — overrides any prefix and any rank-based auto-derive. Last call wins; `name("")` clears any prior name |
| `name-prefix(<string>)` | Prefix the auto-derive composer extends with the rank suffix. Macros bake this so `top(N)` reads "Top by heat (exp-14d)" by default and "Top by in-degree" after `:rank(in-degree)` — the prefix stays, the suffix tracks rank |
| `expand(involvement)` | Per row, explode involvement triples into focus-block sub-rows (focus-block only) |
| `expand(refs)` | Per row, render each entry's outgoing refs as indented sub-lines (as-list only). Optional nested `expand(refs(inactive))` narrows to refs whose target is currently inactive. Composes with filters, `rank`, and `n` |
| `group(by(<field>))` | Bucket entries by field — one of `kind`, `layer`, `type`, `participant` — producing a grouped shape (consume with `as-grouped`). `participant` is multi-valued: a co-authored entry buckets under each author |
| `stalled(<value>)` | Threshold below which a focus target with assigned actors is "stalled" (default 1.0) |
| `brief` | Compact entry lines: identity qualifiers plus the first summary sentence, no attribute segments (confidence, status, score, topics, participants). For injection surfaces where full lines cost context; composes with the entry-line renders, rejected for `as-counts` |

**`expand(refs)` sub-line shape.** Each ref renders as `→ <verb> <full-id> {status: …}` with an optional `: "<desc>"` clause when the ref carries a description. The verb is the per-ref kind (`grounded-in`, `builds-on`, `refines`, `addresses`, `surfaces`, `surfaced-by`, `depends-on`, `required-by`, `related`); legacy bare-string refs (kind `unknown`) render with the generic verb `refs`, and legacy on-disk `grounds`/`evidence` render as `grounded-in` (resolved at parse). Status surfaces the referenced entry's *current* derived state, so stale summary prose can't mislead a reader into treating a closed dependency as still open. Done-signal targets carry no status segment (they are terminal). Three shapes:

```
→ refs 20260506-151345-d-tac-uww {status: closed-by 20260507-133746-s-tac-z2o}     # legacy bare-string ref
→ grounded-in 20260413-142536-d-cpt-ah1 {status: active}                            # object-form, no desc
→ depends-on 20260423-143213-d-tac-hsu {status: closed-by 20260423-144715-s-tac-2y0}: "wraps the sync infra"  # object-form with desc
```

`expand(refs(inactive))` keeps only the sub-lines whose target is currently inactive — the exact inverse of the `active` filter: closed, superseded, or a role whose bound actor chain is retired. It is a current-state filter, not a changelog: it reports what each referent's state is now, not whether it changed since being referenced (a ref to an already-closed predecessor shows the same as one that closed afterward).

**Section header resolution:** the executor picks the header in this order:
1. Explicit `name(...)` → final, no auto-append.
2. `name-prefix(...)` set + `rank(...)` set → `"<prefix> by <algorithm>"` (e.g. "Top by heat (exp-14d)", "Done by date").
3. `name-prefix(...)` set, no rank → just the prefix (e.g. "Focus", "Participants").
4. No prefix, rank set → `"Top by <algorithm>"` (covers raw `rank(heat):as-list` without a macro).
5. Neither → headerless section.

### Algorithms (used inside `rank(...)`)

| Algorithm | Formula |
|---|---|
| `heat(decay)` | Σ over incoming refs of decay(age). Default decay: `exp-14d` |
| `in-degree` | Raw count of incoming refs (decay arg ignored) |
| `mult(decay)` | `heat(decay) × in-degree` |
| `add(decay)` | `heat(decay) + in-degree` |
| `log(decay)` | `heat(decay) × log(1 + in-degree)` |
| `coldness(decay)` | `decay(entry age) / (1 + in-degree)` — heat's inverse: fresh, un-referenced entries rank highest (surfacing unacted-on commitments). Decay applies to the entry's own age, not ref ages. Default decay: `exp-30d` (slower than heat's `exp-14d`, so undone work fades over months) |
| `by(date)` | Sort by entry creation timestamp (no scores) |

### Decay names (used inside algorithm calls)

| Name | Formula |
|---|---|
| `exp-{7,14,30}d` | `2^(-age_days/N)` — half-life every N days |
| `linear-{7,14,30}d` | `max(0, 1 - age_days/N)` — zero past N days |
| `none` | `1` (no age effect) |

### Render terminators

| Render | Input shape |
|---|---|
| `as-list` | Flat list — one line per entry. Auto-derives header from rank when no `name()` (e.g. "Top by heat (exp-14d)", "Most recent" for by(date)) |
| `as-grouped` | Grouped result (requires `group(by(<field>))`); one `### <bucket>` per group |
| `as-counts` | Per-topic aggregate rows over the filtered set: `<count>  <label>  heat <h>`, ordered count-descending then heat. Answers "what topics exist and how many entries each carries" without listing members. Mutually exclusive with `rank`/`n`/`group`/`expand` (it aggregates the whole filtered set; truncating entries first would miscount). Untagged entries contribute to no row |
| `as-focus-block` | Focus-block result (requires `kind(focus):active:expand(involvement)`); per-focus header + per-target lines tagged `{state: pull-available|stalled|driving}` |
| `as-participants-block` | Active actor heads + bound active roles (requires `kind(actor):active`); one `### <canonical>` per actor with bound role entries underneath |
| `as-wip-list` | WIP marker rows (requires `source(wip)`) |

### Macros

Each macro bakes a `name-prefix(...)` so the rendered section gets a header automatically; for ranked macros the resolver appends the rank suffix.

| Macro | Expansion | Default header |
|---|---|---|
| `top(N)` | `active:n(N):rank(heat(exp-14d)):name-prefix("Top"):as-list` | `## Top by heat (exp-14d)` |
| `topic(L)` | `topic(L):rank(heat(exp-14d)):name-prefix("Topic: <L>"):as-list` | `## Topic: <L> by heat (exp-14d)` |
| `focus` | `kind(focus):active:expand(involvement):name-prefix("Focus"):as-focus-block` | `## Focus` |
| `decisions` | `active:kind(plan,directive,activity,contract,aspiration):group(by(kind)):name-prefix("Decisions"):as-grouped` | `## Decisions` |
| `signals` | `active:kind(gap,question):group(by(kind)):name-prefix("Signals"):as-grouped` | `## Signals` |
| `insights` | `active:kind(insight):since("30d"):rank(by(date)):name-prefix("Insights"):as-list` | `## Insights by date` |
| `done` | `kind(done):since("30d"):rank(by(date)):name-prefix("Done"):as-list` | `## Done by date` |
| `aspirations` | `active:kind(aspiration):name-prefix("Aspirations"):as-list` | `## Aspirations` |
| `contracts` | `active:kind(contract):name-prefix("Contracts"):as-list` | `## Contracts` |
| `participants` | `active:kind(actor):name-prefix("Participants"):as-participants-block` | `## Participants` |
| `wip` | `source(wip):name-prefix("WIP"):as-wip-list` | `## WIP` |

User modifiers append after macro expansion and resolve via last-write-wins. Examples:

- `top(20):rank(in-degree)` → `## Top by in-degree` (prefix "Top" stays; suffix tracks the override)
- `top(20):name("My summary")` → `## My summary` (explicit `name(...)` is final, no auto-append)
- `focus:name("Active focuses")` → `## Active focuses` (final override)
- `focus:name-prefix("Active")` → `## Active` (prefix override; no rank to append)

### Worked examples

```bash
sdd view --layout='top(20)'
# Twenty most-warm active entries (catch-up "what's hot")

sdd view --layout='focus,top(15)'
# Active focuses with state-derived involvement, then top-15 by heat.
# Sections render independently — an entry in both the focus block and
# the top list appears in both (cross-section dedup is an open design
# question; sections currently render fully on their own information).

sdd view --layout='decisions,signals,participants'
# Three sections: kind-grouped decisions, kind-grouped signals,
# active actor canonicals with bound roles

sdd view --layout='topic(catch-up-scaling):rank(heat):n(10):as-list'
# Top 10 entries clustered under catch-up-scaling, ranked by heat

sdd view --layout='wip'
# Active WIP markers (just source(wip):as-wip-list under the hood)

sdd view --layout='top(10):rank(heat(exp-7d)):name("Hot last week"),top(10):rank(heat(exp-30d)):name("Hot last month")'
# Two side-by-side top-10s with explicit headers

sdd view --layout='top(20):not(kind(contract,aspiration))'
# Top 20 by heat, excluding standing entries that anchor by structure

sdd view --layout='kind(plan,activity):active:rank(heat(exp-7d)):n(8):expand(refs(inactive)):as-list'
# Top-8 active plans/activities by recent heat, each showing only the refs
# whose target is now inactive (closed, superseded, or a retired role) — the
# lean catch-up view that flags dependencies no longer live

sdd view --layout='kind(plan,activity,directive,gap,question):active:rank(coldness(exp-30d)):n(8):expand(refs):name("Open loops"):as-list'
# The catch-up "open loops" lane — heat's inverse. Surfaces the coldest
# active commitments (fresh, un-acted-on entries rank highest), each carrying
# its full upstream via expand(refs) so a briefing can thread it. Catches
# what heat is blind to: a just-captured plan with no incoming refs yet.

sdd view --layout='active:as-counts'
# What topics exist across active entries and how many entries each carries —
# the capture-time "which clusters are in use" overview.

sdd view --layout='active:untagged:n(20):as-list'
# Twenty active entries that carry no topic at all — the grooming/backfill worklist.

sdd view --layout='id("20260520-003237-s-cpt-ghy","20260506-191632-d-cpt-ni0"):as-list'
# The named entries (full IDs quoted), so their effective topics show inline —
# how the capture procedure reads the topics on entries a new one will ref.
```

## `sdd show` output format

- **Primary entry**: a YAML frontmatter envelope (id, type, kind, layer, confidence, participants, refs, closes, supersedes, attachments, derived status/topics, time) followed by the raw markdown body. The stored summary is omitted by default — pass `--with-summary` to include it for drift review.
- **Neighborhood**: `# upstream` and `# downstream` sections, each a compact markdown tree. One bullet per node — `<ref-kind> <full-id> (<entry-kind>, <status>) — <first-sentence>` — with indentation encoding depth and an `↳` sub-line carrying the ref's "why" (its `desc`) when present.
- **Dedup**: each entry shown at shallowest occurrence; later encounters show `(see above)`.
- **Truncation**: at the depth boundary, a node's unexpanded children render as an indented child-level line `+N more refs truncated (depth N): <ids>`.
- **Rendering**: a styled, colored view on an interactive terminal (the body rendered through glamour); plain markdown for non-TTY consumers, `--format text`, or `NO_COLOR`. Both share one data model — only presentation differs. The styled palette is defined by the CLI color-scheme directive.

Depth is controlled per direction by `--up` / `--down` (see the `sdd show` entry above).

## `sdd new` flags

- `--refs '{json}'` — referenced entry (repeatable). JSON object `{"id":"<id>","kind":"<kind>","desc":"<optional>"}`. `kind` is required from the closed set — see [framework-concepts → Ref kinds](framework-concepts.md). `desc` is optional and explains *why* this ref exists in the entry's narrative.
- `--supersedes id` — entry ID this replaces
- `--closes id1,id2` — entry IDs this resolves/fulfills
- `--participants p1,p2` — participant names
- `--confidence high|medium|low` — confidence level
- `--intent pending|guiding|settled` — directive lifecycle posture (kind: directive only). **Required on every directive capture** — no default; rejected on any other kind. `pending` demands follow-up, `guiding` is standing context that shapes later decisions, `settled` is born-terminal (needs no closing edge; a medium pre-flight finding fires if the body doesn't justify the terminality).
- `--kind <kind>` — signals: gap (default), fact, question, insight, done, actor, annotation; decisions: directive (default), activity, plan, contract, aspiration, role, focus, procedure
- `--canonical name` — frontmatter `canonical` (kind: actor and kind: procedure — actor identity or playbook-move identity)
- `--class move|shell` — frontmatter `class` (kind: procedure only). Default move (a playbook step started through the engine loop); `shell` marks a session base auto-started by the engine's session door — set it when superseding a shell procedure such as `user-dialogue`
- `--aliases a,b` — frontmatter `aliases` (kind: actor only)
- `--actor canonical` — frontmatter `actor` (kind: role only)
- `--topics LABEL[,LABEL...]` — inline `topics:` labels (any kind). CSV form. Each label is a topic-path string (`/`-joined components, e.g. `infrastructure/cli`).
- `--topic '{json}'` — annotation topic cluster (kind: annotation only). Repeatable. Either a JSON object `{"label":"path","members":["id",...]}` (sub-selection of refs) or a bare label like `--topic catch-up-scaling` (applies to all refs).
- `--actors NAME[,NAME...]` — focus-level default actor canonicals (kind: focus only). CSV form.
- `--when '{json}'` — focus-level default temporal scope (kind: focus only). JSON object `{"from":"YYYY-MM-DD","to":"YYYY-MM-DD"}`; at least one of `from` / `to` is required when present.
- `--involvement '{json}'` — focus involvement triple (kind: focus only). Repeatable. JSON object `{"target":"<id>","actors":["..."],"when":{"from":"...","to":"..."}}`. Omitting `actors` inherits the focus-level default; explicit `"actors":[]` declares pull-available involvement (deliberately unattributed).
- `--attach spec` — file to attach (repeatable, see below)
- `--skip-preflight` — skip pre-flight validation (entry is annotated with `preflight: skipped`)
- `--dry-run` — run validation and pre-flight only, without writing or committing the entry
- `--preflight-timeout` — timeout for pre-flight validation (default `2m`)

See the Entry IDs section above for how ID arguments are resolved across all commands.

## Annotation and focus capture examples

**Annotation — tag a cluster of entries with a topic** (one entry, all refs are members):

```bash
sdd new s cpt --kind annotation --confidence medium \
  --refs '{"id":"20260505-215340-s-cpt-rwd","kind":"related"}' \
  --refs '{"id":"20260505-215333-s-cpt-jq7","kind":"related"}' \
  --refs '{"id":"20260504-100323-s-cpt-8tu","kind":"related"}' \
  --topics catch-up-scaling \
  "These three entries cluster around the catch-up-scaling concern that drove Plan 1 / Plan 2."
```

**Annotation with multiple topics and a sub-selection**:

```bash
sdd new s cpt --kind annotation --confidence medium \
  --refs '{"id":"20260423-203503-d-cpt-ygn","kind":"related"}' \
  --refs '{"id":"20260506-151849-d-tac-gvn","kind":"related"}' \
  --topic catch-up-scaling \
  --topic '{"label":"type-system/kinds","members":["20260423-203503-d-cpt-ygn"]}' \
  "Both refs are catch-up related; only ygn is also a type-system/kinds entry."
```

The first `--topic` is bare-label form (applies to all refs); the second restricts to one member.

**Focus — declare an involvement period** (uses outer single quotes for JSON to preserve `$`/backticks; inner double quotes for JSON keys):

```bash
sdd new d tac --kind focus --confidence medium \
  --participants Christopher,Claude \
  --actors Christopher,Claude \
  --when '{"from":"2026-05-06","to":"2026-05-20"}' \
  --involvement '{"target":"20260506-151849-d-tac-gvn"}' \
  --involvement '{"target":"20260506-151345-d-tac-uww","actors":[]}' \
  --involvement '{"target":"20260506-152044-d-tac-1du","actors":["Claude"],"when":{"from":"2026-05-13","to":"2026-05-20"}}' \
  "Drive type-system 7+7 + sdd view + playbook rewrite over the next two weeks."
```

The first triple inherits both top-level defaults; the second overrides actors with explicit empty (pull-available); the third overrides both actors and when.

## Quoting convention for JSON flags

- Outer single quotes preserve `$`, backticks, and backslashes verbatim
- Inner double quotes for JSON keys and string values
- The CLI accepts JSON parse errors gracefully — failures cite the offending field path

## Attachments

The `--attach` flag is repeatable and supports filename mapping:

- `--attach path/to/file.md` — attach with original filename
- `--attach path/to/file.md:renamed.md` — attach with a custom target filename
- `--attach -:plan.md` — read stdin and save as `plan.md` (at most one `-` per invocation)

Use `{{attachments}}/filename` in the entry description to link to attachments. The CLI resolves these to relative paths. Example:

```
sdd new d tac --intent pending --attach /tmp/design.md:plan.md "See [plan]({{attachments}}/plan.md) for details."
```

## Long descriptions

Descriptions are positional arguments. For multi-line markdown (plan decisions with `## Acceptance criteria`, or decisions with rationale paragraphs), use quoted heredocs assigned to variables — no temp files needed. Pipe the attachment content via stdin with `--attach -:plan.md`:

```
DESC=$(cat <<'EOF'
Fork SDD into a standalone repo...

## Acceptance criteria

- [ ] Repository exists with main branch pushed
- [ ] ...
EOF
)

PLAN=$(cat <<'EOF'
# Fork plan

## Alternatives considered
...
EOF
)

echo "$PLAN" | sdd new d tac --kind plan --confidence high \
  --refs '{"id":"<id>","kind":"addresses"}' \
  --participants "Name,Claude" \
  --attach -:plan.md \
  "$DESC"
```

Use quoted `'EOF'` so markdown content with `$`, backticks, or backslashes is preserved verbatim. For scratch files you do want on disk, `.sdd/tmp/` is gitignored.

## Cross-repo references

References usually stay within one graph. When reasoning genuinely builds on another repo's graph, connect that repo and reference across the boundary instead of re-deriving or paraphrasing it locally.

- **Connect once** with `sdd repo add <clone-url>` — clones the repo's graph into a machine-local cache, verifies the `repo_id` it declares, and records + commits a `dependencies:` entry in `.sdd/config.yaml`. The dependency is the portable record (like `go.mod`); a colleague who clones the repo runs `sdd repo add` for the same URL to connect their own cache.
- **Reference by cross-repo ID** — `<repo-id>:<entry-id>` in a `--refs` value. Any ref kind may cross the boundary, but lifecycle edges (`--closes`, `--supersedes`) stay within-graph: a decision can't close an entry in another repo.
- **Declared-dependency precondition** — a cross-repo ref must resolve to a *declared* dependency when captured, the same resolve-or-block gate that guards local refs. If the target repo isn't connected, offer to `sdd repo add` it first (and confirm the target entry is pushed) rather than dropping the connection to a local paraphrase.
- **The cache is pushed state** — a connected cache is a clone of the remote's pushed branch, not a working tree. A foreign entry resolves only after it's committed *and pushed*; `sdd repo sync` (and cross-repo `sdd show`/`sdd search`) refresh the cache. When a cross-repo ref won't resolve, the target is usually unpushed or the cache is stale.
- **Search across repos** with `--repo <repo-id>`/`--all-repos` on `sdd search` and `sdd view` — results fuse into one ranked list under a single shared embedder. `sdd index --repo <repo-id>`/`--all-repos` pre-warms a connected index so the first cross-repo search isn't slow.
