# Range assembly comparison

Recorded October 23, 2026, on an Apple M3 Max, darwin/arm64. The original reports
in [baseline/](../baseline/README.md) are preserved unchanged. Characterization
commit `3a1e65c` passes against the original implementation before the extraction.
Source and compiled-code fingerprints in these reports identify the measured
implementation, including `src/services/tokenizer/ranges.ts`.

## Real VS Code extension host

VS Code 1.142.0, embedded Node v24.21.0, isolated user and extensions profile.
Same benchmark harness, corpora, settings, theme and environment as the original
host run. Three warm-up calls and nine individual samples per path.

| Corpus            | Before median, ms | After median, ms | Speedup | After p95, ms | Ranges |
| ----------------- | ----------------: | ---------------: | ------: | ------------: | -----: |
| html-small        |             0.659 |            0.539 |   1.22× |         2.126 |    567 |
| html-medium       |            24.418 |            4.694 |   5.20× |         4.955 |   5733 |
| tsx-medium        |            18.012 |            4.291 |   4.20× |         6.176 |   4893 |
| css-medium        |            28.588 |            5.807 |   4.92× |         6.510 |   6139 |
| html-large        |          1326.673 |           51.214 |  25.90× |        54.911 |  54502 |
| repeated-variants |            99.990 |            4.390 |  22.78× |         4.685 |   5208 |

All six canonical output fingerprints and range counts are identical to the
baseline. The 950k HTML service call improves from about 1.33 seconds to 51 ms;
the 100k repeated-variant call improves from about 100 ms to 4.4 ms. These are
full themed-range calculations, including lexical tokenization, class parsing,
theme lookup, position conversion and overlap handling. Debounce and decoration
application are excluded; these are not edit-to-paint latency measurements.

Each runner has one formal run before and after. With nine samples, empirical
p95 is the maximum observed call. The small HTML case's p95 increases slightly,
from 2.077 ms to 2.126 ms, despite its lower median; small differences should be
checked over multiple fresh processes before drawing conclusions.

## Node API test double

[production-node.json](production-node.json) records Node v25.9.0 using the same
API test double and benchmark harness as its original Node report. The large
HTML case improves from 791.3 ms to 55.6 ms and the repeated-variant case from
35.0 ms to 4.6 ms. All six output fingerprints match the Node baseline and the
real-host report. Node and host timings are separate comparisons.

## Contract and complexity

Candidates retain their input priority. Within a range key, the first accepted
interval wins, touching boundaries count as overlaps, and the first eligible
configuration supplies the group's style. Independent keys can overlap. UTF-16
offsets are normalized through the document API before interval comparisons,
including reversed endpoints, out-of-bounds offsets and CRLF terminators.

Accepted intervals are indexed by an AVL tree per key. Because accepted
intervals are disjoint, overlap lookup follows one branch at each node; AVL
balancing bounds lookup and insertion to O(log n). Range assembly takes
O(n log n) index work and O(n) auxiliary space for n eligible candidates,
separate from document API conversion costs. The index exists only during one
calculation. Range objects are constructed for accepted candidates.

The original large HTML output has seven keys with 7,786 disjoint ranges each.
Scanning every prior range requires 212,149,035 comparisons. The extracted
assembler makes no Range.intersection calls. A regression guard rejects such
calls and checks 12,000 candidates in ascending, descending and shuffled order,
then verifies rejection of overlapping probes. Separate characterization cases
and deterministic interval-selection comparisons cover priority and boundaries.

The suite has 31 passing tests and eight explicit known failing assertions
covering the six recorded defects. Strict mode exits 1 on those eight failures.
Compilation and lint pass. The VSIX file listing includes the compiled range
module and excludes development artifacts; listing was checked under Node 24
because the pinned packaging tool fails under Node 25. A full VSIX was not built.

## Reproduce

From the repository root:

```sh
pnpm run test:unit
pnpm run test:regressions
pnpm run bench:tokenizer --output benchmarks/current-node.json
VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' pnpm run bench:tokenizer:host --output benchmarks/current-host.json
pnpm run bench:compare benchmarks/baseline/production-node.json benchmarks/current-node.json
pnpm run bench:compare benchmarks/baseline/production-host.json benchmarks/current-host.json
```

The executable override is specific to the measured macOS installation; use the
same VS Code version when reproducing this host comparison. Without an override
the harness downloads the supported minimum version, which is a separate runtime
and cannot be compared to these reports. The supported minimum was not measured.

The approved range assembly plan is SDD entry `20261023-113915-d-ops-9ek`.
Further tokenizer module extraction and correctness fixes are subsequent work.
