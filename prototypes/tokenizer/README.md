# TypeScript tokenizer prototype

An isolated TypeScript scanner with correctness fixtures and benchmarks. The
production extension does not use these files, and VSIX packaging excludes this
directory. The extension's TypeScript project includes only `src/`. The prototype
has no npm dependencies.

The decision to use TypeScript is recorded in [FINDINGS.md](FINDINGS.md), including
the historical comparison that informed it.

## Run

Requires Node.js 22.18+ with TypeScript type stripping enabled. The prototype
runs in Node, independently of the extension's older runtime target.

```sh
node prototypes/tokenizer/test.mjs
node prototypes/tokenizer/benchmark.mjs
```

No compilation or extension installation is needed.

## Contract and coverage

The scanner receives a source snapshot and trusted, sorted, disjoint UTF-16
`[start, end]` pairs for known class-list regions. It returns a `Uint32Array`
containing `[start, end, kind]` triples, also in UTF-16 code units:

| Kind                     | Value | Example                                  |
| ------------------------ | ----- | ---------------------------------------- |
| Variant                  | 1     | `sm:`, `[&:hover]:`, `group-hover/item:` |
| Utility                  | 2     | `px-4`, `w-`, `text-(length:--size)`     |
| Arbitrary value/property | 3     | `[calc(100%_-_4px)]`, `[color:red]`      |
| Important modifier       | 4     | leading, post-variant, or trailing `!`   |

The scanner respects nested brackets, parentheses, escapes, quoted arbitrary
values, ASCII class-list whitespace, and incomplete input. Golden fixtures check
expected offsets and kinds in multiple regions, including supplementary Unicode
characters. Deterministic generated cases check range invariants. These tests
verify lexical segmentation, not Tailwind class validity.

Class-region extraction, framework parsing, theme/category lookup, worker
scheduling, and VS Code decoration APIs are outside this prototype. An ordinary
string will be tokenized if a caller supplies it as a class region. Solving
GitHub issue #10 still requires a separate context extractor.

## Measurements

The harness verifies correctness before timing and warms each measured path.
Each timing has 11 samples, with calibrated batches targeting at least 20 ms
and three warm-up batches. The p95 in `results.json` is a percentile of batch
averages; it is not the p95 latency of individual editor updates.

- **Full scan:** source string and all supplied class regions to packed tokens.
- **Region rescan:** one class region in local coordinates, approximating the
  scanner workload after an extractor identifies an affected region. It does not
  implement incremental extraction, offset shifting or cache invalidation.

Generated corpora cover approximately 10k, 100k and 1M UTF-16 units of mixed
markup, plus 1M units with repeated variants. They include unrelated text outside
the supplied regions. Corpus generation and correctness checks are not timed.
The scanner uses linear scanning without range-overlap searches.

The latest run is written to the ignored `results.json`. Synthetic corpora and
one machine limit generalization. Repeat fresh-process runs and evaluate real
editor traces when integrating the scanner. These measurements do not compare
against the existing extension; worker scheduling and actual decoration latency
need separate validation.
