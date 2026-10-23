# Production tokenizer baseline

Recorded on October 23, 2026, before production changes. Every production
source hash was verified against commit `2bc800a` (version 0.2.1).

## Real VS Code extension host

Machine: Apple M3 Max, darwin/arm64.
VS Code 1.142.0, embedded Node v24.21.0.
Three warm-up calls and nine individual samples per path, in a fresh isolated
profile. These are service timings; debounce and decoration application are
excluded. With nine samples the empirical p95 is the maximum observed call.

| Corpus            | UTF-16 units | Lexical median, ms | Themed ranges median, ms | Themed ranges p95, ms | Ranges |
| ----------------- | -----------: | -----------------: | -----------------------: | --------------------: | -----: |
| html-small        |       10,000 |              0.057 |                    0.659 |                 2.077 |    567 |
| html-medium       |      100,000 |              0.177 |                   24.418 |                25.565 |   5733 |
| tsx-medium        |      100,000 |              0.181 |                   18.012 |                19.570 |   4893 |
| css-medium        |      100,000 |              0.867 |                   28.588 |                30.195 |   6139 |
| html-large        |      950,000 |              1.534 |                 1326.673 |              1418.558 |  54502 |
| repeated-variants |      100,000 |              0.141 |                   99.990 |               101.597 |   5208 |

The large corpus spends about 1.5 ms in lexical tokenization and about 1.33 s
in the full themed-range path. VS Code reported the extension host as
unresponsive during large-corpus sampling. This makes downstream matching and
range assembly the first profiling target; it is not evidence that the lexical
scanner alone accounts for the slowdown. The repeated-variant case also exposes
the cost of checking each emitted range against earlier ranges for the same key.

## Node test-double runner

[production-node.json](production-node.json) records Node v25.9.0 on
the same machine with the VS Code API test double. All six corpora produced
identical canonical range/configuration fingerprints in the Node and real-host
runners. Their timings are kept separate and must not be compared as a speedup.

Raw host samples and provenance are in
[production-host.json](production-host.json). Reports include corpus hashes,
source and compiled-code fingerprints, output counts and hashes, settings,
theme and benchmark-harness hashes, and environment details. The baseline has
one formal run per runner; exploratory measurements are not pooled into it.

## Regression contract

The suite currently has 17 passing tests and eight known failing assertions
covering the six recorded defects. Normal mode reports those assertions as
TODO. Strict mode fails on them. The assertions describe desired behavior,
and fixes become ordinary passing tests without changing their expectations.

See [the workflow and proposed module split](../../docs/tokenizer-rebuild.md)
for reproduction and comparison commands. Preserve these baseline reports;
write later measurements to the ignored `benchmarks/current-*.json` paths.
