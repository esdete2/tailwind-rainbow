import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error('Usage: node tests/benchmark/compare.mjs <baseline.json> <current.json>');
const [baseline, current] = await Promise.all(paths.map(async (path) => JSON.parse(await readFile(path, 'utf8'))));
assert.equal(baseline.schemaVersion, current.schemaVersion, 'Report schemas must match');
assert.deepEqual(baseline.environment, current.environment, 'Compare the same runtime, API implementation and machine');
assert.deepEqual(baseline.settings, current.settings, 'Tokenizer settings must match');
assert.equal(baseline.themeSha256, current.themeSha256, 'Themes must match');
assert.deepEqual(baseline.harnessSha256, current.harnessSha256, 'Benchmark harness and corpora must match');
assert.deepEqual(
  baseline.results.map((row) => row.name),
  current.results.map((row) => row.name),
  'Corpus names and order must match'
);

console.table(
  current.results.map((row, index) => {
    const before = baseline.results[index];
    assert.equal(before.corpusSha256, row.corpusSha256, `Corpus changed: ${row.name}`);
    return {
      corpus: row.name,
      'before ms': before.themedRanges.medianMs.toFixed(3),
      'after ms': row.themedRanges.medianMs.toFixed(3),
      speedup: `${(before.themedRanges.medianMs / row.themedRanges.medianMs).toFixed(2)}x`,
      'before p95 ms': before.themedRanges.p95Ms.toFixed(3),
      'after p95 ms': row.themedRanges.p95Ms.toFixed(3),
      'output unchanged': before.outputSha256 === row.outputSha256,
      'range count': `${before.themedRanges.outputCount} → ${row.themedRanges.outputCount}`,
    };
  })
);
console.log('Output changes require correctness review alongside timing changes.');
