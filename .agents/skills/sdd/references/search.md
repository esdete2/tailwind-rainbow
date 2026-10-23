---
metadata:
    sdd-content-hash: fc9f862a1117260d72b72b4c56ec1cfd09b4702b9e09bd66307d95ef45829656
    sdd-version: 0.17.0
---
# sdd search

Three retrieval modes, one CLI command. Use search to **surface candidates** during exploration and grooming — never as a substitute for the dialogue or for reading a candidate's full chain via `sdd show`.

## When to use each mode

- **`--term <regex>`** — keyword / token / ID lookup. Always available. Use for:
  - Finding entries that mention a specific identifier (`--term "d-tac-lqr"`)
  - Tracking down a precise phrase (`--term "augment plan"`)
  - Filtering by a known token someone just mentioned in dialogue
  - Repeatable: `--term apple --term harvest` requires both terms in the entry (AND); use `--term "(apple|orange)"` for OR via regex alternation.

- **`--query <phrase>`** — semantic / conceptual lookup. Requires `Search: vector,text` in the `sdd info` header (an embedding provider is configured). Use for:
  - Surfacing entries that talk about the same concept with different wording
  - Finding "anything related to X" when you don't know the exact terminology
  - Bridging across language differences in an evolving graph

- **Both flags together** — hybrid mode (RRF fusion). Use for important explorations where token specificity AND semantic breadth both matter. Don't combine reflexively for routine queries.

**Misuse to avoid:** `--query` with a single keyword (e.g. `--query "auth"`) is wasted spend — use `--term auth` for that. `--query` should carry phrase-level intent (e.g. `--query "how do we handle authentication boundaries"`).

## Reading citations

Each result row is the entry header line (the shared entry-line shape, same as `sdd view`) plus an indented citation:

```
20260504-235258-d-tac-lqr tactical plan decision [confidence: medium] (Christopher, Claude) {status: active} <summary>
    ↳ Approach > Storage  ·  <~150-char snippet>
```

The breadcrumb (`Approach > Storage`) is the heading-chain inside the entry's body or attachment that motivated the hit. `Summary` means the hit came from the entry's summary chunk; `Body` means body text without a heading. Attachments render as `[attachment: <path>]`.

The citation tells you **where in the entry** the match landed. Don't treat the snippet as the answer — it's a pointer. Once you've found a likely candidate, run `sdd show <full-id>` for the full chain.

## Filters

The `--type`, `--layer`, `--kind` filters (the same filter shape `sdd view` composes). Compose freely with `--term` / `--query`. Default behavior excludes `{status: superseded-by}` entries from results because superseded near-duplicates pollute clusters; `--include-superseded` overrides when you specifically want history.

`--limit N` caps the result count (default 10).

**Cross-repo scope.** `--repo <repo-id>` (repeatable) and `--all-repos` widen the search to connected repos, fusing every selected graph's hits into one ranked list. Vector search across repos builds and queries every connected index under the single user-global embedder, so all indexes share one vector space and scores stay comparable. The first cross-repo query embeds a connected graph on demand (slow); `sdd index --repo <repo-id>`/`--all-repos` pre-warms it. See the CLI reference's "Cross-repo references" section for connecting repos and the pushed-state cache model.

## Instruction templates

Instruction-tuned encoders (Qwen3, E5, Nomic, BGE) want a small instruction or prefix prepended to each input. The framework applies this transparently via two config keys:

- `embedding.query_template` — applied to the search-side text (used by `sdd search --query`).
- `embedding.document_template` — applied to the index-side text (used by `sdd index` and `sdd search` lazy-fill).

Both use a literal `{text}` placeholder that's replaced with the actual content. Empty values mean no transformation (correct for OpenAI / untemplated models).

**Asymmetry to remember:** changing `document_template` invalidates indexed embeddings — `sdd lint` will report drift and the next search lazy-fills. Changing `query_template` is a free tweak; old indexed docs stay valid because they aren't touched. The fingerprint reflects this — only the doc template enters it.

### Known-good templates

```yaml
# Qwen3 (instruction-tuned, query-only prefix)
embedding:
  provider: ollama
  model: hf.co/Qwen/Qwen3-Embedding-0.6B-GGUF:F16
  query_template: |-
    Instruct: Given a query phrase, retrieve related entries from a knowledge graph
    Query:{text}
  # document_template: ""  (Qwen3 documents take no prefix)

# Nomic Embed (dual prefix)
embedding:
  provider: ollama
  model: nomic-embed-text
  query_template: "search_query: {text}"
  document_template: "search_document: {text}"

# multilingual-e5 (dual prefix)
embedding:
  provider: ollama
  model: intfloat/multilingual-e5-large
  query_template: "query: {text}"
  document_template: "passage: {text}"

# OpenAI text-embedding-3 (no templates needed)
embedding:
  provider: openai
  model: text-embedding-3-small
  api_keys:
    openai: sk-...
```

If you switch templates after building, run `sdd index --force` to re-embed eagerly, or just let `sdd search` lazy-fill on the next query.

## Lifecycle

Vector mode reads from a machine-global index — a content-addressed store keyed by repo identity and embedder fingerprint, outside the working tree and shared across a repo's checkouts and worktrees. Two ways the index gets populated:

- **`sdd index`** — explicit warm-up: builds chunks for every entry on disk. Run once on a fresh clone, after a major batch of new entries, or after changing the embedding model. `--force` re-embeds everything regardless.
- **Lazy fill** — `sdd search` automatically chunks and embeds entries that are present on disk but missing from (or stale against) the index before the query runs. The first search after a branch switch or new captures may emit a few `lazy-indexed` lines; subsequent searches are fast.

`sdd lint` reports `Index:` health when an embedding provider is configured: total entries indexed and the count of entries indexed under a different fingerprint (drift). Drift converges as entries are re-embedded by `sdd search` or `sdd index --force`.

## Use in playbooks

**Engage (`playbook-engage.md` and the `/sdd-explore` compressor)** — during the universal entry move, when the briefing question widens to "what's related to this concept?" or "what entries already touch this area?", `sdd search --query "<concept phrase>"` surfaces seed candidates. Combine with `--term` when you have a known identifier or canonical name. The `/sdd-explore` sub-skill uses these same search modes when invoked from inside engage to compress a goal-tagged neighborhood.

**Groom (`/sdd-groom` and the Grooming Playbook)** — when checking for **Pattern B** (superseded in practice but no explicit `--supersedes` link), `sdd search --query` over the candidate's summary phrase often surfaces the newer entry. Same for hunting siblings before capturing a fresh signal that might re-frame existing ground.

**Capture-time discovery** — before drafting a new entry, `sdd search` for the topic to check whether you'd be re-stating something already in the graph. Refs are cheaper than supersedes; finding the existing entry up front lets you ref it instead.

Search returns ranked candidates — never a single answer. The agent applies semantic judgment via dialogue on the results, consistent with the dialogue-first commitment (d-stg-beb).
