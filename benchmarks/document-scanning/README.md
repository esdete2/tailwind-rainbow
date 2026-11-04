# Document scanning extraction

Recorded October 23, 2026, on an Apple M3 Max, darwin/arm64. The comparison point
is the [range assembly report](../range-assembly/README.md). Original baseline
and range assembly reports are preserved unchanged. Source and compiled-code
fingerprints identify the measured scanner, shared types and service adapter.

## Structure and contracts

- `src/services/tokenizer/document.ts` contains document scanning and shared
  quoted-string reading. It has no runtime dependency on VS Code or configuration.
- `src/services/tokenizer/types.ts` contains Token and ClassToken. The service
  re-exports both types and preserves tokenizeDocument and processClassContent.
- `src/services/tokenizer/ranges.ts` derives its candidate shape from ClassToken
  so token and range contracts share the same definition.

Comments explain UTF-16 offsets, delimiter boundaries and incomplete-input
handling. Class-context validation, class splitting and theme matching remain
in the service for later extraction. The document scanner still gates regular
quotes using a bounded lexical lookbehind; this is separate from class-context
validation and does not fix unrelated-string highlighting.

Characterization commit `be50780` passes against the prior implementation before
extraction: comments, quotes, escapes, lexical boundaries, Unicode and CRLF
positions, incomplete input and all six lexical token fingerprints. A standalone
Node subprocess additionally verifies that the extracted scanner loads and runs
without VS Code or configuration. The suite now has 52 passing tests and the
same eight explicit known failures; strict mode exits 1 on those eight failures.
Compilation, lint and formatting pass. The VSIX file listing includes the new
compiled modules and excludes development artifacts. Listing uses Node 24 due
to the pinned tool's Node 25 dependency incompatibility; a full VSIX was not built.

Incomplete quoted spans reserve a closing-delimiter position even at EOF. This
can omit the final code unit or produce end before start for a lone opener.
The fixtures in `tests/fixtures/document-compatibility.json` explicitly label
these as compatibility snapshots, not desired highlighting assertions. Repairing
incomplete-input recovery remains follow-up correctness work.

## Real VS Code extension host

VS Code 1.142.0, embedded Node v24.21.0, isolated user and extensions profiles.
All runs use matching settings, themes, corpora and benchmark harnesses, with
three warm-ups and nine individual samples per path. All six themed-range
fingerprints and output counts match both preceding stages, and the separate
lexical snapshots match the scanner before extraction.

| Corpus            | Prior median, ms | First median, ms | Repeat median, ms | First p95, ms | Repeat p95, ms |
| ----------------- | ---------------: | ---------------: | ----------------: | ------------: | -------------: |
| html-small        |            0.539 |            0.548 |             0.562 |         0.697 |          0.641 |
| html-medium       |            4.694 |            4.719 |             4.753 |         5.336 |          5.197 |
| tsx-medium        |            4.291 |            4.228 |             4.085 |         4.534 |          4.750 |
| css-medium        |            5.807 |            6.104 |             5.970 |         7.089 |          7.493 |
| html-large        |           51.214 |           51.354 |            52.467 |        65.406 |         64.070 |
| repeated-variants |            4.390 |            4.408 |             4.339 |         4.651 |          4.870 |

The first fresh run is [production-host.json](production-host.json). A second
fresh process is preserved as
[production-host-repeat.json](production-host-repeat.json); neither replaces the
other. Large HTML stays near 51–52 ms median. Both fresh runs contain a slower
large-case sample around 64–65 ms, compared with the prior report's 54.9 ms
empirical p95. With nine samples p95 is the maximum and cannot establish a
reliable tail-latency distribution.

To investigate that difference, a separate diagnostic loaded the prior service
from commit c9cae80217b8fd8378bf731739d82cd546a5b7d4 by transpiling its TypeScript,
and compared it with the extracted service in one host against the same large
HTML document and range assembler. After five warm-ups per version, thirty
calls per version alternated execution order. The prior service measured
50.080 ms median / 53.873 ms p95; the extracted service measured
49.824 ms median / 53.422 ms p95. This check found no consistent extraction
penalty. [host-control.json](host-control.json) preserves all diagnostic samples
and code fingerprints. It uses a separate harness, is not pooled with the formal
reports, and does not establish a speedup.

These are service timings. Debounce and decoration application are excluded.
The supported minimum VS Code version was not measured.

## Node API test double

[production-node.json](production-node.json) records Node v25.9.0 with the same
API test double and harness as the preceding Node report. All six output
fingerprints match. Large HTML measured 52.794 ms versus 55.573 ms in the prior
report. Small differences between individual runs are not optimization evidence;
this slice changes structure and preserves behavior. Node and host comparisons
remain separate.

## Reproduce

From the repository root:

```sh
pnpm run test:unit
pnpm run test:regressions
pnpm run bench:tokenizer --output benchmarks/current-node.json
VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' pnpm run bench:tokenizer:host --output benchmarks/current-host.json
pnpm run bench:compare benchmarks/range-assembly/production-node.json benchmarks/current-node.json
pnpm run bench:compare benchmarks/range-assembly/production-host.json benchmarks/current-host.json
```

The executable override refers to the measured macOS installation. Compare the
same VS Code version; the harness's default download uses the supported minimum,
which is a separate runtime. The optional same-process diagnostic is described
above and is not part of these standard benchmark commands.

The approved extraction plan is SDD entry `20261023-135603-d-ops-g47`.
