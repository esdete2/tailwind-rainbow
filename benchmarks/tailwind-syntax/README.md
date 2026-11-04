# Tailwind v3/v4 syntax checks

Recorded October 24, 2026, on Apple M3 Max, darwin/arm64. The comparison point is
the [six-review-fix stage](../review-fixes/README.md). Prior benchmark reports,
corpora and measurement harnesses remain unchanged.

## Behavior and validation

The [compatibility matrix](../../docs/tailwind-compatibility.md) records official
syntax, grammar support, palette coverage and deferred features. The parser
supports documented v3 `hover:!flex` and v4 `hover:flex!` alongside standalone
`!flex`/`flex!`. The extension's `!hover:flex` form remains labeled compatibility
behavior, separate from documented Tailwind syntax.

Important markers receive independent one-code-unit ranges. Marker-free utility
names drive theme lookup; class fragments never consume the marker, including
when the final prefix extends through an unstyled base. A v3 marker in the
middle of that fallback divides its class decoration into two ranges.
Disabled important, prefix and base rules retain independent effects.

`syntax.ts` protects brackets, parentheses, quotes and escaped delimiters while
locating top-level variant separators and important markers. The class parser
retains UTF-16 source positions independently of marker-free lookup names.
`text-(length:--size)` remains one utility and follows the same base lookup rules
as its bracketed equivalent. Protected literal exclamation marks remain content.
Lone/repeated markers produce no fragments, mismatched closers are rejected and
incomplete groups cannot produce out-of-bounds spans. Public service methods and
theme resolution priorities remain intact.

The expanded suite has 142 passes, zero failures and zero TODOs in strict mode,
including all eight original review regressions. Before implementation the new
suite exposed 13 failures against the review-fix production implementation;
the existing source was unchanged while those tests were added. Historical class
fixtures remain unchanged, with the lone-marker exception superseded by the
explicit desired no-fragments assertion.

[host-correctness.json](host-correctness.json) records 16 passing checks in actual
VS Code 1.142.0 with Node v24.21.0. Six checks add exact source/key/offset assertions
for v3/v4 important positions, fallback splits, a typed parenthesized utility and
a protected literal `!`. Their documents include emoji and CRLF before the class
attribute. The remaining ten checks retain review-defect coverage. Coordinator
checks invoke initialization after settings changes; event wiring and debounce
cancellation remain covered by unit tests. These checks observe service ranges
and invoke real decoration APIs, without inspecting rendered pixels.

Compilation, lint, formatting and package file-list checks pass. The compiled
syntax module is included; tests, benchmarks, compatibility research documents,
prototypes and SDD records are excluded. Listing used Node 24 due to the pinned
packaging dependency's Node 25 incompatibility. No full VSIX was built.

## Performance

Reports retain source/compiled and harness fingerprints, settings, theme, corpus
and output hashes, environment metadata and all raw samples. Each path uses
three warm-ups and nine individual samples. Comparison guards accept the same
environment, settings, theme, harness and corpora. All six lexical and themed
output fingerprints and range counts match the review-fix reports.

### Actual VS Code extension host

| Corpus            | Prior median, ms | After median, ms | Prior p95, ms | After p95, ms |
| ----------------- | ---------------: | ---------------: | ------------: | ------------: |
| html-small        |            0.591 |            0.576 |         4.011 |         0.711 |
| html-medium       |            5.103 |            4.575 |         5.652 |         5.056 |
| tsx-medium        |            4.436 |            4.175 |         5.281 |         4.719 |
| css-medium        |            5.486 |            4.833 |         6.960 |         5.385 |
| html-large        |           51.391 |           50.615 |        58.499 |        53.424 |
| repeated-variants |            4.614 |            3.883 |         5.151 |         4.145 |

Large HTML remains about 50.6 ms versus 1326.7 ms in the original production
baseline, roughly 26 times faster. The final host run shows no material
regression. Lower medians in this single run do not establish a precise new
speedup or robust tail estimate; empirical p95 is the largest of nine calls.

### Node API test double

The Node v25.9.0 report has medians of 0.657, 5.122, 3.952, 5.074, 51.559 and
4.060 ms in corpus order. Node and actual-host results are compared separately.
An initial implementation showed large HTML around 57.6 ms and other Node
medians roughly 10% higher. Investigation identified unnecessary character-level
class-list scanning. Word scanning now invokes grouped markup handling only
where needed, while `syntax.ts` retains variant/value protection. All 142 tests
pass after that refinement. The final reports above use the resulting source;
initial diagnostics are not pooled with them or used as a replacement baseline.

Timings exclude debounce, decoration application, document creation and file IO.
The supported minimum VS Code version and end-to-end edit-to-paint latency were
not measured. These are one formal run per runner; benchmark corpora do not
exercise every new syntax, so exact-range regressions supply correctness evidence.

## Reproduce and scope

```sh
pnpm run test:regressions
VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' pnpm run test:host --output .sdd/tmp/compatibility-host-checks.json
pnpm run bench:tokenizer --output benchmarks/current-node.json
VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' pnpm run bench:tokenizer:host --output benchmarks/current-host.json
pnpm run bench:compare benchmarks/review-fixes/production-node.json benchmarks/current-node.json
pnpm run bench:compare benchmarks/review-fixes/production-host.json benchmarks/current-host.json
```

The executable override selects the measured installation; the default host
runners select VS Code 1.96.0, a separate runtime. SDD plan
`20261024-092359-d-ops-1rg` authorizes this slice. Palette expansion,
namespace-aware resolution, CSS configuration discovery and `@source inline()`
remain deferred. No complete v3/v4 compiler compatibility is claimed. Nothing
was pushed or merged, and no GitHub issues were changed.
