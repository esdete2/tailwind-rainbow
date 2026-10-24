# Development toolchain update

Recorded October 24, 2026, on Apple M3 Max, darwin/arm64. The comparison point is
the [Tailwind syntax stage](../tailwind-syntax/README.md). Prior reports, corpus
generators, measurement code and the VS Code API test double are unchanged.

## Correctness and packaging

The production TypeScript source and all emitted production JavaScript files
are byte-for-byte unchanged. TypeScript 6.0.3 compiles with explicit Node and
Mocha ambient types while retaining ES2022 and Node16 module resolution. VS Code
API types are pinned exactly to 1.96.0. The selected toolchain and compatibility
holds are documented in [docs/toolchain.md](../../docs/toolchain.md).

The strict Node suite passes all 142 tests, including the six lexical corpus
fingerprints and all original review regressions. The 16-check actual-editor
suite passes in both [VS Code 1.96.0](host-correctness-minimum.json), with Node
20.18.1, and the [installed VS Code 1.142.0](host-correctness-current.json), with
Node 24.21.0. These checks inspect exact service ranges and call real decoration
APIs; they do not inspect rendered pixels.

The preserved legacy Mocha suite passes all 47 tests in each editor. Its launcher
uses the repository root and isolated temporary profiles. Two older assertions
now check the established context contract: variable-name suffixes alone do not
authorize class strings, and an unconfigured `classList.add` call does not inherit
eligibility from earlier closed calls. No production behavior was changed to
make those tests pass. Legacy report filenames accommodate slashes in branch
names. The legacy suite's diagnostic timings are separate from these reports.

Frozen-lockfile installation with strict peer checks, compilation, lint,
formatting and graph validation pass; details are in [verification.json](verification.json). A complete unsigned VSIX is built under
Node 24.22.1. Archive inspection verifies production modules and theme assets and
excludes source, compiled tests, CI files, lockfile, research documents and local
development records. The VSIX is a local ignored artifact; no publishing,
installation in the normal editor profile, push or merge was performed.

Mocha 12.0.3 failed inside the minimum editor with `ERR_REQUIRE_ESM` and requires
Node 20.19 or newer; Mocha 11.8.0 is retained for its Node 20.18.1 runtime. Its
deprecated transitive Glob 10 dependency remains a documented toolchain limit.
The updated CI matrix is configured for three operating systems and minimum and
stable editors; hosted CI and Linux/Windows execution have not been performed.

## Actual VS Code extension host

The before and after reports use VS Code 1.142.0, embedded Node 24.21.0, the same
machine, settings, theme, harness and corpora. The development Node runtime that
launches the editor does not perform the timed tokenizer calls.

| Corpus            | Before median, ms | After median, ms | Before p95, ms | After p95, ms |
| ----------------- | ----------------: | ---------------: | -------------: | ------------: |
| html-small        |             0.576 |            0.531 |          0.711 |         0.620 |
| html-medium       |             4.575 |            4.625 |          5.056 |         4.954 |
| tsx-medium        |             4.175 |            3.898 |          4.719 |         4.674 |
| css-medium        |             4.833 |            5.007 |          5.385 |         5.754 |
| html-large        |            50.615 |           46.884 |         53.424 |        60.440 |
| repeated-variants |             3.883 |            3.764 |          4.145 |         4.221 |

All six highlighting output fingerprints, lexical counts and range counts match.
Source and compiled fingerprints match as well. Large HTML retains the earlier
performance gain over the original 1326.7 ms baseline. Medians show no material
regression; the larger HTML maximum is a reminder that nine samples cannot
establish a robust tail estimate. Lower medians do not establish a new dependency
speedup when the executed production JavaScript is identical.

## Node 24 control

[control-node.json](control-node.json) was collected before dependency changes
with TypeScript 5.7.3 output, under Node 24.22.1. The same runtime runs
[production-node.json](production-node.json) after the update. Both execute
identical production JavaScript with the unchanged API test double.

| Corpus            | Before median, ms | After median, ms |
| ----------------- | ----------------: | ---------------: |
| html-small        |             0.572 |            0.579 |
| html-medium       |             4.485 |            4.718 |
| tsx-medium        |             3.687 |            4.119 |
| css-medium        |             5.271 |            4.832 |
| html-large        |            46.875 |           47.077 |
| repeated-variants |             3.634 |            3.632 |

The TSX Node median varies by about 12%, or 0.43 ms, while its real-host median
is lower. Investigation found no source or emitted-JavaScript change; unchanged
fingerprints and the opposite host direction provide no evidence of a toolchain
regression. Large HTML and repeated variants remain nearly identical. An initial
after-update Node diagnostic overlapped a running legacy editor suite; it was
excluded from the comparison and rerun without that concurrent test workload.
The earlier Node 25 report is not compared to Node 24 timings.

Reports include raw samples, runtime metadata and source, compiled, harness,
theme, corpus and output hashes. Each path uses three warm-ups and nine samples;
empirical p95 is their maximum. Timings exclude file IO, document creation,
debounce and decoration application. Correctness was checked in the minimum
editor, but its tokenizer performance and end-to-end paint latency were not
measured. Results cover these six corpora, not all possible source syntax.

## Reproduce

Use Node and pnpm versions specified in [the setup guide](../../docs/toolchain.md).

```sh
pnpm install --frozen-lockfile --strict-peer-dependencies
pnpm test
pnpm run test:host
pnpm run test:legacy
VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' pnpm run test:host
pnpm run bench:tokenizer --output benchmarks/current-node.json
VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' pnpm run bench:tokenizer:host --output benchmarks/current-host.json
pnpm run bench:compare benchmarks/toolchain-update/control-node.json benchmarks/current-node.json
pnpm run bench:compare benchmarks/tailwind-syntax/production-host.json benchmarks/current-host.json
pnpm run build
```

The comparison script requires matching runtime, machine, settings, theme,
harness and corpora. An executable override must select the same editor for host
timing comparisons. Plan `20261024-192200-d-ops-7h5` authorizes this local slice;
feature requests and broader Tailwind coverage remain subsequent work.
