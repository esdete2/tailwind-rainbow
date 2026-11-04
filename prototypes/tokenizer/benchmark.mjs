import { writeFile } from 'node:fs/promises';
import { arch, cpus, platform } from 'node:os';
import { performance } from 'node:perf_hooks';

import { scan } from './scanner.ts';
import { verify } from './verify.mjs';

const samples = 11;
const targetSampleMs = 20;
let checksum = 0;

function consume(tokens) {
  checksum = (checksum + tokens.length + (tokens.at(-1) || 0)) >>> 0;
}

function stats(times, iterations) {
  const sorted = times.toSorted((a, b) => a - b);
  return {
    medianMs: sorted[Math.floor(sorted.length / 2)],
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
    iterations,
    samples,
  };
}

function measure(fn) {
  function batch(iterations) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) consume(fn());
    return performance.now() - start;
  }
  let iterations = 1;
  while (batch(iterations) < targetSampleMs && iterations < 131072) iterations *= 2;
  for (let i = 0; i < 3; i++) batch(iterations);
  return stats(
    Array.from({ length: samples }, () => batch(iterations) / iterations),
    iterations
  );
}

function corpus(target, repeated = false) {
  const classes = [
    'flex items-center gap-4 px-4 py-2 sm:px-6 lg:px-8 hover:bg-blue-500 focus:ring-2 dark:text-white',
    'grid grid-cols-1 md:grid-cols-3 @max-sm/card:block group-hover/item:opacity-100',
    "before:content-['😀'] [&:nth-child(2)]:w-[calc(100%_-_4px)] text-(length:--size) font-bold!",
    'absolute -top-2 right-0 rounded-full bg-red-500/80 !sm:hover:p-4 supports-[display:grid]:grid',
  ];
  const repeatedClasses = Array.from({ length: 32 }, (_, i) => `hover:bg-red-${((i % 9) + 1) * 100}`).join(' ');
  const chunks = [];
  const regions = [];
  let length = 0;
  let index = 0;
  while (length < target) {
    const prefix = `<!-- node ${index}: 😀 -->\n<section class="`;
    const content = repeated ? repeatedClasses : classes[index % classes.length];
    const suffix = '">日本語 <span>unrelated:content</span></section>\n';
    regions.push(length + prefix.length, length + prefix.length + content.length);
    const chunk = prefix + content + suffix;
    chunks.push(chunk);
    length += chunk.length;
    index++;
  }
  return { source: chunks.join(''), regions: Uint32Array.from(regions) };
}

const correctness = await verify();
console.log('Correctness:', correctness);
const results = [];

for (const [name, size, repeated] of [
  ['small', 10000, false],
  ['medium', 100000, false],
  ['large', 1000000, false],
  ['repeated-variants', 1000000, true],
]) {
  const { source, regions } = corpus(size, repeated);
  const expected = scan(source, regions);
  const start = regions[0];
  const end = regions[1];
  const localRegions = Uint32Array.of(0, end - start);
  const changedRegion = source.slice(start, end);
  const row = {
    name,
    utf16Units: source.length,
    utf8Bytes: Buffer.byteLength(source),
    classRegions: regions.length / 2,
    tokens: expected.length / 3,
    regionUtf16Units: changedRegion.length,
    fullScan: measure(() => scan(source, regions)),
    regionRescan: measure(() => scan(changedRegion, localRegions)),
  };
  results.push(row);
  console.log(`Completed ${name}: ${source.length} UTF-16 units, ${row.tokens} tokens`);
}

const report = {
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0]?.model,
  },
  methodology: {
    samples,
    targetSampleMs,
    warmupBatches: 3,
    offsets: 'UTF-16',
    output: 'Uint32Array of start/end/kind triples',
    scope: 'Known class regions; excludes extraction, workers, themes and VS Code decorations',
    regionRescan: 'One supplied class region in local coordinates; no incremental document cache or edit invalidation',
    p95: '95th percentile of batch-average scan times, not individual-edit tail latency',
  },
  correctness,
  results,
  checksum,
};
await writeFile(new URL('./results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.table(
  results.map((r) => ({
    corpus: r.name,
    'Full scan ms': r.fullScan.medianMs.toFixed(3),
    'Region rescan ms': r.regionRescan.medianMs.toFixed(4),
  }))
);
console.log('Saved prototypes/tokenizer/results.json');
