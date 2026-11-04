# Context detection extraction

Recorded October 23, 2026, on an Apple M3 Max, darwin/arm64. The comparison point
is the [document scanning stage](../document-scanning/README.md). All preceding
reports are preserved unchanged. The raw reports include source and compiled-code
fingerprints for the measured implementation.

## Module boundary and contracts

`src/services/tokenizer/context.ts` exports quoted-span eligibility and CSS
@apply content discovery. It accepts settings as plain arrays and a set of
function names, without importing VS Code or ConfigurationManager. The service
captures current settings once per document calculation; configuration changes
apply on the next calculation. Class parsing and styling remain in the service,
as does class-attribute selection inside embedded template markup.

The context module preserves the eligibility heuristics: templates and class-like
payloads may be accepted without an enclosing class site. Identifier matching
uses lowercased configured names; function names and literal patterns retain
case. Short lookbehind is 100 UTF-16 units, lookahead is 50, and collection
boundaries allow a 300-unit lookbehind. CSS discovery searches raw literal
@apply text in the supported CSS-like languages, trims content and returns its
UTF-16 start in source order. Comment and keyword boundaries are not validated.

The labeled snapshots in `tests/fixtures/context-compatibility.json` document
those heuristics as compatibility behavior, not desired highlighting assertions.
The unrelated-string and CSS-comment regressions remain explicit known failures.
Controlled lexical candidates isolate otherwise unexercised compatibility
branches from the scanner's own quote and candidate-selection rules.

Characterization commit `c3ecb6e` passes against the implementation before
extraction. Cases cover configured identifiers and functions, template and
context patterns, exact lookaround limits, updates on an existing service, all
supported CSS language IDs, directive terminators and UTF-16 starts. A standalone
Node subprocess verifies the extracted functions run with plain settings without
VS Code or configuration services.

The suite has 74 passing tests and the same eight known failing assertions.
Strict mode exits 1 on those eight failures. Compilation, lint and formatting
pass. The VSIX file listing includes the compiled context module and excludes
development artifacts. Listing was checked with Node 24 due to the pinned tool's
Node 25 dependency incompatibility; a full VSIX was not built.

## Real VS Code extension host

VS Code 1.142.0, embedded Node v24.21.0, isolated user and extensions profiles.
The settings, theme, corpora and benchmark harness match the preceding host run.
Each path has three warm-up calls and nine individual samples. All six output
fingerprints and range counts are unchanged. The separate lexical token snapshots
also match the scanner before all extractions.

| Corpus            | Prior median, ms | After median, ms | Prior p95, ms | After p95, ms |
| ----------------- | ---------------: | ---------------: | ------------: | ------------: |
| html-small        |            0.548 |            0.530 |         0.697 |         0.591 |
| html-medium       |            4.719 |            4.660 |         5.336 |         5.764 |
| tsx-medium        |            4.228 |            4.264 |         4.534 |         4.723 |
| css-medium        |            6.104 |            6.087 |         7.089 |         7.349 |
| html-large        |           51.354 |           51.641 |        65.406 |        62.278 |
| repeated-variants |            4.408 |            4.489 |         4.651 |         4.829 |

Large HTML remains near 51–52 ms; the other host medians differ by less than 2%.
One formal run per version does not establish a speedup or a stable difference
at that scale. With nine samples empirical p95 is the maximum observed call,
so these figures do not establish a reliable tail-latency distribution.

These are service timings and exclude debounce and decoration application.
The supported minimum VS Code version was not measured.

## Node API test double

[production-node.json](production-node.json) records Node v25.9.0 with matching
settings, corpus, theme and harness fingerprints. All six output fingerprints
match the prior Node report and the actual host output. Large HTML measured
52.805 ms versus 52.794 ms previously. Medium HTML measured 5.684 ms versus
5.216 ms; its host median moved from 4.719 ms to 4.660 ms. The Node large-case
maximum rose from 58.363 ms to 66.490 ms while its median remained similar, and
the host large-case maximum decreased. These short-run differences do not show
a consistent service regression across runtimes; retain the raw samples and
repeat fresh processes when judging small changes. Node and host comparisons
remain separate.

## Reproduce

From the repository root:

```sh
pnpm run test:unit
pnpm run test:regressions
pnpm run bench:tokenizer --output benchmarks/current-node.json
VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' pnpm run bench:tokenizer:host --output benchmarks/current-host.json
pnpm run bench:compare benchmarks/document-scanning/production-node.json benchmarks/current-node.json
pnpm run bench:compare benchmarks/document-scanning/production-host.json benchmarks/current-host.json
```

The executable override refers to the measured macOS installation. Use the same
VS Code version for this comparison; the default harness download selects the
supported minimum, which is a separate runtime.

The approved extraction plan is SDD entry `20261023-151112-d-ops-vg0`.
