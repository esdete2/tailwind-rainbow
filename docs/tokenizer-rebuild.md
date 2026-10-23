# Tokenizer structure and verification

The rebuild uses TypeScript. The committed baseline records the production
implementation and its regression contract before extraction. Range assembly has
its own [measurements and contract](../benchmarks/range-assembly/README.md).
The [document scanning report](../benchmarks/document-scanning/README.md) records
the subsequent scanner and shared-type extraction against that comparison point.
The [context detection report](../benchmarks/context-detection/README.md) records
quoted-span eligibility and CSS directive discovery as an independent module.
The [structural completion report](../benchmarks/tokenizer-structure/README.md)
records the class parser, theme resolver and template-discovery extraction.

## Verification

Install the locked development dependencies with `pnpm install --frozen-lockfile`.
Standalone Node tests require Node 22.18+ for synchronous module hooks. This does
not change the extension's VS Code runtime requirement.

The pinned VSIX packaging tool fails under Node 25 because a dependency uses
the removed `SlowBuffer` API. Packaging exclusions were checked with Node 24;
dependency modernization is separate from the tokenizer rebuild.

```sh
pnpm run test:unit
pnpm run test:regressions
```

`test:unit` loads the compiled production services with a small VS Code API test
double. Passing cases cover attributes, JSX expressions, class functions,
templates, CSS directives, relational variants, arbitrary selectors, theme
rules, size guards and UTF-16 ranges. An editor initialization test checks that
the decoration path runs when enabled.

Regression tests assert the desired behavior. A known assertion failure is
reported as TODO in the ordinary suite; unexpected exceptions fail the suite.
A fixed regression passes automatically, without changing its expectation.
`test:regressions` makes every remaining regression a hard failure. It is expected
to exit nonzero until the recorded defects are fixed.

| Defect                                                                                       | Desired expectation                                                          |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Unrelated string highlighting ([#10](https://github.com/esdete2/tailwind-rainbow/issues/10)) | Ordinary strings and templates produce no class ranges.                      |
| CSS comment highlighting                                                                     | Block comments and SCSS line comments containing `@apply` produce no ranges. |
| Important prefix range overflow                                                              | The final variant ends before the attribute's closing quote.                 |
| Enable setting ignored                                                                       | Disabled highlighting applies no decorations.                                |
| Registered themes lost                                                                       | Configuration changes retain API-registered themes.                          |
| Untitled editors skipped                                                                     | Supported untitled documents receive decorations.                            |

The last three cases concern orchestration and theme lifecycle. They remain
separate from the scanner's behavior, so a tokenizer replacement does not conceal
outstanding extension defects.

## Measure production code

```sh
pnpm run bench:tokenizer --output benchmarks/current-node.json
pnpm run bench:tokenizer:host --output benchmarks/current-host.json
```

The Node runner uses the API test double. The host runner uses actual VS Code
documents, `positionAt`, `offsetAt` and `Range` objects. It creates a fresh
temporary user-data and extensions profile, leaving the normal editor profile
alone. Without an executable override it downloads VS Code 1.96.0, the supported
minimum. To use an installed version, set `VSCODE_EXECUTABLE_PATH` to its native
executable before running the host command. On macOS that executable is normally
inside `Visual Studio Code.app/Contents/MacOS/`.

Both runners time two paths independently: document lexical tokenization and
the full themed-range calculation. Context detection, theme lookup, offset
conversion and overlap handling are included in the second path. Debouncing,
decoration application, file IO, document creation and output fingerprinting are
excluded. These are scanner/service measurements, not complete edit-to-paint
latency measurements.

Deterministic corpora contain HTML, TSX and CSS at 10k, 100k and 950k UTF-16 units,
plus a 100k repeated-variant stress case. Inputs remain under the production
guard, which currently counts UTF-16 units despite its byte-oriented setting
description. No benchmark increases the guard to make a large corpus pass.

Each path has three warm-up calls and nine individual timing samples. Reports
contain raw samples, medians, empirical p95, output counts and fingerprints,
runtime and machine metadata, settings, source fingerprints and harness hashes.
With nine samples p95 is the largest observed call; it is not a robust estimate
of editor tail latency. Repeat fresh-process runs when judging small differences.

```sh
pnpm run bench:compare benchmarks/baseline/production-node.json benchmarks/current-node.json
pnpm run bench:compare benchmarks/baseline/production-host.json benchmarks/current-host.json
```

The comparison rejects mismatched runtimes, API implementations, settings,
themes, harnesses and corpora. Source changes are expected. Changed output is
reported alongside speed so skipped work cannot silently count as an
optimization. A deliberate correctness change requires reviewing the affected
range counts and hashes against the regression suite.

## TypeScript structure

`TokenizerService` coordinates configuration, discovery, parsing and range assembly.
The focused modules live in `src/services/tokenizer/`. Parsing, context detection
and theme resolution accept explicit data without editor or configuration services:

| Module        | Responsibility and contract                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| `types.ts`    | Shared tokens, class-content regions and document-relative UTF-16 offsets.                                   |
| `document.ts` | Scan quoted spans and comments, with a shared quoted-string reader and explicit incomplete-input boundaries. |
| `context.ts`  | Apply eligibility heuristics and discover CSS directives and template attributes in their established order. |
| `classes.ts`  | Split class lists and variants with square-bracket tracking, size guards and themed fragment boundaries.     |
| `theme.ts`    | Resolve special, exact, normalized, grouped and wildcard rules with explicit priority.                       |
| `ranges.ts`   | Normalize document offsets and accept ranges through an AVL interval index, retaining input priority.        |

Comments should explain offset units, lexical boundaries, recovery rules and
lookup priority where those constraints are non-obvious. Names describe enduring
responsibilities. The current prototype is a syntax experiment; it does not
replace context extraction or prove full-service performance.

Incremental region invalidation and worker scheduling follow profiling of the
complete pipeline. Prefix-only coloring, category palettes and additional
framework support are separate product changes. The structural split preserves
current highlighting behavior; the recorded correctness failures remain the
next phase. Malformed-input compatibility snapshots do not define desired highlighting.

The completed baseline plan is SDD entry `20261023-104123-d-ops-2e8`.
The range assembly plan is `20261023-113915-d-ops-9ek`; the document scanning plan
is `20261023-135603-d-ops-g47`. Context detection is tracked by
`20261023-151112-d-ops-vg0`. Structural completion is tracked by
`20261023-174844-d-ops-c9d`. Project records are managed through the CLI.
