import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { cpus } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { cases, corpus } from './corpus.mjs';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../', import.meta.url));
const hash = (value) => createHash('sha256').update(value).digest('hex');

function measure(fn, size, warmups, samples) {
  const expected = size(fn());
  for (let i = 0; i < warmups; i++) fn();
  const durationsMs = [];
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    const result = fn();
    durationsMs.push(performance.now() - start);
    assert.equal(size(result), expected, 'Output counts must stay stable across timing samples');
  }
  const sorted = durationsMs.toSorted((a, b) => a - b);
  return {
    outputCount: expected,
    durationsMs,
    minMs: sorted[0],
    medianMs: sorted[Math.floor(sorted.length / 2)],
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
    maxMs: sorted.at(-1),
  };
}

async function productionFingerprint() {
  async function collect(directory) {
    const files = [];
    for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
      const file = `${directory}/${entry.name}`;
      if (file === 'src/test') continue;
      if (entry.isDirectory()) files.push(...(await collect(file)));
      else if (file.endsWith('.ts')) files.push(file);
    }
    return files;
  }
  const files = await collect('src');
  return Object.fromEntries(
    await Promise.all(files.sort().map(async (file) => [file, hash(await readFile(resolve(root, file)))]))
  );
}

export async function benchmark({ api, createEditor, runner }) {
  const { TokenizerService } = require('../../out/services/tokenizer.js');
  const { defaultTheme } = require('../../out/themes/default.js');
  const tokenizer = new TokenizerService();
  const sourceFingerprint = await productionFingerprint();
  const compiledFingerprint = Object.fromEntries(
    await Promise.all(
      Object.keys(sourceFingerprint)
        .filter((file) => !file.endsWith('.d.ts'))
        .map(async (file) => {
          const compiled = file.replace(/^src\//, 'out/').replace(/\.ts$/, '.js');
          return [compiled, hash(await readFile(resolve(root, compiled)))];
        })
    )
  );
  const warmups = 3;
  const samples = 9;
  const config = api.workspace.getConfiguration('tailwindRainbow');
  const settings = Object.fromEntries(
    [
      'maxFileSize',
      'classIdentifiers',
      'classFunctions',
      'templatePatterns',
      'contextPatterns',
      'ignoredPrefixModifiers',
    ].map((key) => [key, config.get(key)])
  );
  const results = [];

  for (const scenario of cases) {
    const source = corpus(scenario);
    assert.ok(source.length <= settings.maxFileSize, 'Performance corpora must not trigger the file-size guard');
    const editor = await createEditor(source, scenario.language);
    const countRanges = (map) => [...map.values()].reduce((count, entry) => count + entry.ranges.length, 0);
    const output = tokenizer.findClassRanges(editor, defaultTheme);
    assert.ok(countRanges(output) > 0, `Expected actual highlighting work for ${scenario.name}`);
    const entries = [...output]
      .map(([key, value]) => ({
        key,
        config: Object.fromEntries(Object.entries(value.config).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
        ranges: value.ranges.map((range) => [
          editor.document.offsetAt(range.start),
          editor.document.offsetAt(range.end),
        ]),
      }))
      .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    for (const entry of entries) entry.ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const result = {
      name: scenario.name,
      language: scenario.language,
      utf16Units: source.length,
      utf8Bytes: Buffer.byteLength(source),
      corpusSha256: hash(source),
      outputSha256: hash(JSON.stringify(entries)),
      lexical: measure(
        () => tokenizer.tokenizeDocument(source),
        (tokens) => tokens.length,
        warmups,
        samples
      ),
      themedRanges: measure(() => tokenizer.findClassRanges(editor, defaultTheme), countRanges, warmups, samples),
    };
    results.push(result);
    console.log(
      `${scenario.name}: ${result.themedRanges.medianMs.toFixed(2)} ms, ${result.themedRanges.outputCount} ranges`
    );
  }

  assert.deepEqual(await productionFingerprint(), sourceFingerprint, 'Production source changed during the benchmark');
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    environment: {
      runner,
      node: process.version,
      vscode: api.version ?? null,
      platform: process.platform,
      arch: process.arch,
      cpu: cpus()[0]?.model,
    },
    methodology: {
      warmups,
      samples,
      lexical: 'TokenizerService.tokenizeDocument(source)',
      themedRanges: 'TokenizerService.findClassRanges(editor, defaultTheme)',
      excluded: ['debounce', 'decoration application', 'file IO', 'document creation', 'result fingerprinting'],
      timing: 'Individual synchronous calls, not batch averages; empirical p95 is the maximum of nine samples.',
      stressLimit: 'Repeated-variant corpus is limited to 100k UTF-16 units to bound quadratic overlap work.',
      sizeLimit:
        'Production guard uses UTF-16 source.length; the large Unicode corpus can exceed its nominal limit in UTF-8 bytes.',
    },
    productionSha256: sourceFingerprint,
    compiledSha256: compiledFingerprint,
    harnessSha256: Object.fromEntries(
      await Promise.all(
        ['corpus.mjs', 'measure.mjs', '../support/vscode.cjs'].map(async (file) => [
          file,
          hash(await readFile(new URL(file, import.meta.url))),
        ])
      )
    ),
    settings,
    themeSha256: hash(JSON.stringify(defaultTheme)),
    results,
  };
}
