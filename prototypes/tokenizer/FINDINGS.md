# Tokenizer experiment: initial results

Decision: the rebuild uses TypeScript. The comparison below records the experiment
that informed this choice; the active prototype contains only the TypeScript
scanner, tests and benchmarks.

Recorded on October 23, 2026, on an Apple M3 Max running macOS ARM64, Node
25.9.0 and standard Go 1.27.3 targeting `js/wasm`. The extension's own VS Code
runtime was not used.

## Result

Use TypeScript for the next rebuild milestone. In this experiment the linear
TypeScript scanner was faster than the equivalent Go/WASM scanner, including
when input and output transfer were excluded from the Go timing. These results
do not establish the performance of other WASM toolchains or algorithms.

| Corpus              | Source UTF-16 units |  Tokens | TS scan, ms | Go scanner only, ms | Go call including bridge, ms |
| ------------------- | ------------------: | ------: | ----------: | ------------------: | ---------------------------: |
| Small mixed markup  |              10,063 |     625 |       0.054 |               0.193 |                        0.238 |
| Medium mixed markup |             100,028 |   6,164 |       0.539 |               1.864 |                        2.100 |
| Large mixed markup  |           1,000,144 |  61,247 |       5.474 |              18.475 |                       20.971 |
| Repeated variants   |           1,000,258 | 101,888 |       9.172 |              31.152 |                       33.051 |

Values are medians of per-run medians across three fresh Node processes. Each
run used 11 calibrated samples per measurement and three warm-up batches. The
second run reversed backend measurement order; TypeScript remained faster.
The Go build used `-trimpath -ldflags="-s -w"`, without compiler instrumentation.

The WASM binary was 2,039,747 bytes. Loading, instantiation and runtime startup
took 21.5–23.4 ms in these runs. Final WASM linear-memory capacity was 18–20 MiB;
this includes the runtime and spare capacity, not just scanner data.

## Changed-region workload

For the large mixed document, rescanning one 96-unit class region took about
0.0013 ms in TypeScript and 0.0230 ms through Go/WASM. Sending the full source
snapshot into Go while scanning that same region took about 1.59 ms.

This supports passing small affected regions to the scanner and caching class
region information. It does not prove the latency of a complete incremental
parser: region discovery, lexical-state invalidation, document offset updates,
worker communication, cancellation and decoration updates are not implemented.

## Correctness and scope

Both backends passed 11 golden fixtures, each checked in two source regions,
and 500 deterministic generated cases. Fixtures cover variants, important
modifiers, arbitrary syntax, quotes, escapes, incomplete input and UTF-16
offsets. Generated cases check ordered ranges and backend parity.

Scanners receive known class regions and return packed token triples. They do
not detect class contexts, validate Tailwind classes, classify utility
categories, resolve themes or call VS Code APIs. These are not measurements
against the existing extension and do not resolve the open GitHub issues yet.

## Next experiment

Keep the scanner independent of editor and theme APIs. Build a context extractor
with realistic HTML and JSX/TSX fixtures, then measure full-document parsing,
actual edits, scheduling and decorations in the extension host using TypeScript.
Retain packed token ranges to keep allocations and editor integration simple.

See [README.md](README.md) for reproduction commands and timing definitions.
The latest detailed run is written to the ignored `results.json`; the three
recorded raw runs are available locally as `.build/run-1.json` through
`.build/run-3.json`.
