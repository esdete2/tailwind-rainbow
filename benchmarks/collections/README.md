# Collections and coloring modes

Issue #14 implementation under plan `20261104-230001-d-ops-utr`. Before controls use the production source from merged 0.3.0 commit `48499045515810ee551951a8bc6c4b5548a37c97`. Reports preserve raw samples, corpus/output fingerprints, source/emitted-code hashes, settings and environment metadata.

## Default behavior

Default feature settings are `mode: class`, empty configured collection definitions, and no collection styles. Existing benchmark harnesses and earlier reports are unchanged. Each runner uses the same runtime, machine, harness, fixtures, settings and default theme before and after. All six highlighting fingerprints match; the strict suite also verifies all six lexical fingerprints.

| Corpus            | Node before ms | Node after ms | Host before ms | Host after ms | Ranges |
| ----------------- | -------------: | ------------: | -------------: | ------------: | -----: |
| html-small        |          0.583 |         0.657 |          0.535 |         0.571 |    567 |
| html-medium       |          5.008 |         4.834 |          4.676 |         4.469 |   5733 |
| tsx-medium        |          3.984 |         3.715 |          4.344 |         4.048 |   4893 |
| css-medium        |          5.179 |         5.129 |          4.913 |         5.045 |   6139 |
| html-large        |         51.198 |        52.430 |         51.567 |        50.127 |  54502 |
| repeated-variants |          4.412 |         4.088 |          4.172 |         3.876 |   5208 |

These are sampled tokenizer timings, not an extension-wide speed guarantee. Single-process Node medians and editor medians vary; the default runs show no material regression on these workloads. Nine samples per case cannot establish a general speedup or robust tail-latency estimate.

## Enabled collections

The separate collection harness styles all 15 predefined categories and configures a custom `buttons` collection. Each report records its mode, definitions, palette and added harness hash. It changes the exported default theme only inside its isolated benchmark process/profile and restores it afterward. `class` and `prefix` modes are measured separately. The broader palette emits more ranges, so these runs are additional-work measurements, not equivalent-output speed comparisons with defaults.

| Runner/mode         | Large HTML median ms | Large HTML ranges | Repeated variants median ms |
| ------------------- | -------------------: | ----------------: | --------------------------: |
| enabled-class-node  |               88.394 |            101218 |                       8.062 |
| enabled-prefix-node |               88.253 |            101218 |                       7.298 |
| enabled-class-host  |               90.357 |            101218 |                       7.544 |
| enabled-prefix-host |               88.099 |            101218 |                       7.436 |

## Environment and checks

- Apple M3 Max, macOS arm64; development Node 24.22.1. Matching editor timing controls use installed VS Code 1.144.0 with embedded Node 24.22.1. They are not directly compared to older 1.142.0 timing reports.
- All 161 strict tests pass with no failures/TODOs. Both VS Code 1.96.0 (embedded Node 20.18.1) and installed 1.144.0 pass 26 real-host checks and 47 legacy tests. The editor checks verify exact source ranges and exercise decoration APIs, without pixel inspection.
- Collection lookup is compiled on configuration changes. A test with 10,000 unrelated definitions guards against inspecting unrelated collection styles while matching a class. Collections do not load project configuration or a Tailwind runtime.
- Three new README configuration snippets are exercised through production services. The full predefined member lists are checked against the coverage document.
- Final review covers array replacement, empty collections, literal patterns, disabled-rule/overlap priority, distinct collection decoration keys, configuration/theme reloads and object-prototype names such as constructor. Exact base rules must be own properties. Styled collections also accept long lists of bare utilities within the existing 5,000-code-unit content limit.
- Unmodified predefined categories resolve exact names before the longest literal family, keeping border-collapse in Tables and text-shadow-* in Effects. Configured arrays use explicit ordering and replacement semantics. This is the documented implementation of Tailwind category boundaries.
- Compilation, lint, formatting and SDD validation pass. Package inspection is recorded in verification.json. The released root 0.3.0 VSIX is preserved; the feature package stays ignored under .sdd/tmp and retains manifest version 0.3.0 because versioning/publication is outside this slice.

## Reproduce

Use Node 24.22.1 and pnpm 10.33.0. Before-control commands must run before the production change, at the recorded baseline source. Use fresh output paths when repeating measurements.

```sh
pnpm test
pnpm run lint
pnpm run format:check
node tests/run-host.mjs --output .sdd/tmp/collections-minimum.json
VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' node tests/run-host.mjs --output .sdd/tmp/collections-installed.json
pnpm run test:legacy
VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' pnpm run test:legacy
node tests/benchmark/run.mjs --output .sdd/tmp/collections-node.json
VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' node tests/benchmark/run.mjs --host --output .sdd/tmp/collections-host.json
node tests/benchmark/run-collections.mjs --output .sdd/tmp/collections-enabled
VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' node tests/benchmark/run-collections.mjs --host --output .sdd/tmp/collections-enabled
node tests/benchmark/compare.mjs benchmarks/collections/before-node.json benchmarks/collections/after-node.json
node tests/benchmark/compare.mjs benchmarks/collections/before-host.json benchmarks/collections/after-host.json
pnpm exec vsce package --no-dependencies -o .sdd/tmp/tailwind-rainbow-collections.vsix
```

## Limits

Each case has three warmups and nine measured synchronous calls; empirical p95 is the maximum sample. Timing excludes debounce, painting/decoration application, document creation, file IO and fingerprint calculation. Background host/OS activity and GC can influence samples. The unchanged harness retains its historical stress-limit wording; production range assembly continues to use the AVL index. Minimum-editor performance was not benchmarked. Linux, Windows and hosted CI were not run locally. The installed editor initially aborted inside the sandbox; measurements succeeded when launched with the normal permissions in isolated temporary profiles. No normal editor profile was modified.

Collection families identify spelling patterns rather than validating every possible Tailwind value. Documentation tracks v4 categories with retained v3 spellings; no automatic namespace normalization or plugin discovery is added. Dependency-security maintenance remains deferred. Nothing is pushed, merged, tagged or published by this slice, and issue #14 remains open.
