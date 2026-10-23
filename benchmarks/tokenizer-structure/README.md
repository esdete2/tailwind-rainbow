# Tokenizer structural completion

Recorded October 23, 2026, on an Apple M3 Max, darwin/arm64. The comparison point
is the [context detection stage](../context-detection/README.md). All preceding
reports remain unchanged. Each raw report records measured source and compiled
code fingerprints, settings, environment, corpus and output hashes, and samples.

## Structure and compatibility

The 81-line `TokenizerService` coordinates configuration, lexical discovery,
context selection, class parsing and editor range assembly. The focused modules
under `src/services/tokenizer/` are:

| Module      | Responsibility                                                                |
| ----------- | ----------------------------------------------------------------------------- |
| types.ts    | Tokens, class-content regions and themed fragments with UTF-16 offsets.       |
| document.ts | Quoted spans, comments and shared quoted-string reading.                      |
| context.ts  | Quoted-span eligibility, CSS directives and template attribute regions.       |
| classes.ts  | Class-list and variant splitting, size guards and themed fragment boundaries. |
| theme.ts    | Raw lookup and fragment resolution with explicit rule priority.               |
| ranges.ts   | Document position normalization and first-accepted interval indexing.         |

Class parsing, theme matching and discovery accept explicit data and have no
runtime dependency on VS Code or ConfigurationManager. Public service methods
and Token/ClassToken exports are preserved. `src/services/utils.ts` retains its
lookup exports as compatible adapters; the prefix adapter supplies configured
ignored modifiers to the pure resolver.

Raw lookup and fragment resolution have distinct contracts. Raw lookup checks
exact rules before arbitrary fallback; fragment resolution first maps bracketed
syntax to the arbitrary rule. Disabled matches still shadow lower-priority rules.
Ignored-modifier patterns are applied in configured order as regular-expression
fragments when normalization is needed. Template discovery follows configured
identifier order, retaining repeated and overlapping matches. The adapter's
whole-template fallback depends on emitted themed fragments, not region count.

Characterization commit `bab58d3` passes against the prior implementation before
extraction. Tests cover class boundaries and guards, variants and brackets,
important modifiers, theme-rule priority, disabled rules, ignored-modifier
semantics, template ordering, UTF-16 offsets and output-dependent fallback.
A standalone Node subprocess additionally verifies the extracted parser, theme
resolver and template discovery run without editor or configuration services.

The suite has 100 passing tests and the same eight known failing assertions.
Strict mode exits 1 on those eight failures. Compilation, lint and formatting
pass. The VSIX file listing contains all extracted compiled modules and excludes
development artifacts. Listing was checked with Node 24 due to the pinned tool's
Node 25 dependency incompatibility; a full VSIX was not built.

Malformed-input snapshots in `tests/fixtures/classes-compatibility.json` are
explicit compatibility records, not desired highlighting assertions. They retain
incomplete bracket and whitespace behavior, important-tail overflow and the
lone-important exception during extraction. The desired important-prefix
boundary remains an explicit failing regression. Those cases and incomplete
quoted-input recovery require subsequent correctness work.

## Real VS Code extension host

VS Code 1.142.0, embedded Node v24.21.0, isolated user and extensions profile.
The settings, theme, corpora and benchmark harness match the preceding host run.
Each path has three warm-up calls and nine individual samples. All six output
fingerprints and range counts are unchanged; separate lexical token snapshots
also match the original scanner.

| Corpus            | Prior median, ms | After median, ms | Prior p95, ms | After p95, ms |
| ----------------- | ---------------: | ---------------: | ------------: | ------------: |
| html-small        |            0.530 |            0.553 |         0.591 |         1.270 |
| html-medium       |            4.660 |            4.679 |         5.764 |         5.372 |
| tsx-medium        |            4.264 |            4.172 |         4.723 |         5.139 |
| css-medium        |            6.087 |            5.940 |         7.349 |         6.666 |
| html-large        |           51.641 |           51.662 |        62.278 |        52.880 |
| repeated-variants |            4.489 |            4.418 |         4.829 |         5.073 |

Large HTML remains about 51.7 ms. The original production baseline was about
1326.7 ms on the same host runtime and harness, so the structural split retains
the interval-index improvement. This slice does not establish an additional
speedup. Small differences between individual runs should be judged over more
fresh processes. With nine samples empirical p95 is the maximum observed call,
not a reliable tail-latency estimate.

These are service timings, excluding debounce and decoration application.
The supported minimum VS Code version was not measured.

## Node API test double

[production-node.json](production-node.json) records Node v25.9.0 with matching
settings, corpora, theme and harness fingerprints. All six output fingerprints
match the preceding Node report and real-host output. The first Node run's large
HTML median rose from 52.805 ms to 56.648 ms, while the real-host median remained
similar. A fresh-process repeat is retained as
[production-node-repeat.json](production-node-repeat.json), where large HTML
measured 48.618 ms with identical code and output fingerprints. Both runs are
preserved, not pooled. This variation does not establish a consistent extraction
regression or speedup. Node and actual-host comparisons remain separate.

## Reproduce

From the repository root:

```sh
pnpm run test:unit
pnpm run test:regressions
pnpm run bench:tokenizer --output benchmarks/current-node.json
VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' pnpm run bench:tokenizer:host --output benchmarks/current-host.json
pnpm run bench:compare benchmarks/context-detection/production-node.json benchmarks/current-node.json
pnpm run bench:compare benchmarks/context-detection/production-host.json benchmarks/current-host.json
```

The executable override refers to the measured macOS installation. Compare the
same VS Code version; the default harness download uses the supported minimum,
which is a separate runtime. Original-baseline comparisons can use the reports
in `benchmarks/baseline/` with the same current files.

The approved structural plan is SDD entry `20261023-174844-d-ops-c9d`.
Correctness fixes remain a separate phase.
