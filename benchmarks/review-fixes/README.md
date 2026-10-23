# Review correctness fixes

Recorded October 23, 2026, on an Apple M3 Max, darwin/arm64. The comparison point
is the [completed structural rebuild](../tokenizer-structure/README.md).
Preceding reports and benchmark harnesses remain unchanged.

## Correctness

All eight original regression assertions now pass in strict mode. The expanded
suite contains 121 passing tests, no failures and no TODOs. The fixes cover:

- Class context: ordinary strings and templates require surrounding configured
  class syntax, a configured tag, an open utility call or named collection, or
  literal template markup attributes. Content punctuation and proximity to a
  completed call do not establish eligibility. Identifier boundaries and
  case-insensitive attribute discovery preserve source UTF-16 offsets.
- CSS directives: `directives.ts` discovers `@apply` outside block comments,
  quoted literals and URL payloads. SCSS, Sass, Less and Stylus additionally
  recognize line comments. Comments inside a directive separate content regions;
  real content retains its original offsets. `@applyflex` is not a directive.
- Important modifiers: the final variant ends at the class boundary when its
  base has no enabled style. Nonzero offsets and multiple variants are covered.
- Enable handling: disabled highlighting clears decorations and cancels pending
  updates; re-enabling restores highlighting. The pending callback also reads
  the current enable setting before applying ranges.
- Untitled documents: supported languages receive decorations; unsupported
  languages and output/debug documents remain excluded.
- Theme lifecycle: settings overlay stable built-in/API registrations. Overrides
  can be replaced or removed without accumulating stale styles, and registered
  replacements for built-in names survive reloads.

Configured attribute, utility, tagged-template, markup-template and collection
cases remain covered. Conditional string operands are lexical candidates whose
eligibility is checked separately. Context lookbehind is bounded to 300 UTF-16
units, with a 100-unit attribute window; this is not a full language parser.

The context compatibility fixture remains unchanged as historical evidence.
Tests assert desired eligibility and comment behavior instead of replaying those
obsolete heuristics. Range assembly tests directly supply themed fragments to
the interval assembler, independently of eligibility. Historical malformed-input
fixtures remain active for behavior outside these six fixes: incomplete quotes,
malformed brackets and the lone-important exception are separate follow-up work.

[host-correctness.json](host-correctness.json) records ten passing checks in
actual VS Code 1.142.0 with Node v24.21.0. These cover both unrelated-string
assertions, CSS/SCSS comments, important boundaries, conditional utility
collections, real untitled decoration coordination, disabling/re-enabling and
registered-theme override removal. The coordinator checks invoke initialization
after actual settings changes; configuration event wiring and debounce
cancellation are tested in the unit suite. Decoration coordination is observed
at the service boundary while invoking the real decoration implementation;
the test does not inspect rendered pixels.

Compilation, lint, formatting and the package file-list check pass. The file list
includes the new compiled directive module and excludes tests, benchmarks,
prototypes and local project records. Listing used Node 24 because the pinned
packaging dependency fails under Node 25. No full VSIX was built or published.

## Performance

Each report retains raw timings, runtime and source/compiled fingerprints,
settings, theme, harness, corpus and output hashes. Three warm-up calls and nine
individual samples are used per path. The committed comparison tool accepts all
environment, harness, theme, setting and corpus guards. All six themed outputs
and lexical fingerprints remain unchanged: the benchmark corpora contain valid
class contexts, while the corrected false positives are covered by regressions.

### Real VS Code extension host

| Corpus            | Prior median, ms | After median, ms | Prior p95, ms | After p95, ms |
| ----------------- | ---------------: | ---------------: | ------------: | ------------: |
| html-small        |            0.553 |            0.591 |         1.270 |         4.011 |
| html-medium       |            4.679 |            5.103 |         5.372 |         5.652 |
| tsx-medium        |            4.172 |            4.436 |         5.139 |         5.281 |
| css-medium        |            5.940 |            5.486 |         6.666 |         6.960 |
| html-large        |           51.662 |           51.391 |        52.880 |        58.499 |
| repeated-variants |            4.418 |            4.614 |         5.073 |         5.151 |

Large HTML retains the interval-index gain: about 51.4 ms versus the original
production baseline's 1326.7 ms, roughly 26 times faster. Medium HTML and TSX
medians rise by about 0.4 and 0.3 ms respectively; this run does not establish
precise small-input costs or a new speedup. With nine samples empirical p95 is
the maximum observed call; the small-HTML outlier is not a reliable tail estimate.

### Node API test double

Node v25.9.0 has the same test double and harness hashes as the structural stage.
Medians are 0.648, 5.520, 4.226, 5.560, 52.571 and 4.272 ms in corpus order.
Use the raw report for full precision. Node and real-host results are compared
separately because their runtimes and document implementations differ.

An initial diagnostic run exposed CSS processing near 11 ms. Component timing
located unnecessary bounded context scans on strings with no possible configured
opener. A cheap opener check now avoids that work. The final reports above were
recorded after that change; they show CSS near 5.5 ms in both runners. Initial
diagnostics are not used as a baseline or pooled into the final measurements.

Timings exclude debounce, decoration application, document creation and file IO.
The supported minimum VS Code version was not measured. These are one formal
run per environment, not an end-to-end responsiveness or statistical guarantee.

## Reproduce

```sh
pnpm run test:unit
pnpm run test:regressions
VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' pnpm run test:host --output .sdd/tmp/review-host.json
pnpm run bench:tokenizer --output benchmarks/current-node.json
VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' pnpm run bench:tokenizer:host --output benchmarks/current-host.json
pnpm run bench:compare benchmarks/tokenizer-structure/production-node.json benchmarks/current-node.json
pnpm run bench:compare benchmarks/tokenizer-structure/production-host.json benchmarks/current-host.json
```

The executable override selects the measured installation; the default host
runners select VS Code 1.96.0, a separate runtime. SDD plan
`20261023-190546-d-ops-981` authorizes these six review fixes. The overlapping
unrelated-string issue is included; other GitHub requests remain deferred for
product-scope review. No GitHub issue was changed, and nothing was pushed or merged.
