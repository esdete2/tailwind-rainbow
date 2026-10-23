import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../', import.meta.url));
const host = process.argv.includes('--host');
const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0 && !process.argv[outputIndex + 1]) throw new Error('--output requires a file path');
const output = resolve(
  outputIndex >= 0 ? process.argv[outputIndex + 1] : join(root, `benchmarks/current-${host ? 'host' : 'node'}.json`)
);
await mkdir(dirname(output), { recursive: true });

if (host) {
  const { runTests } = require('@vscode/test-electron');
  // macOS Unix-domain sockets have a 103-character path limit, including the profile path.
  const temporaryRoot = process.platform === 'darwin' ? '/tmp' : tmpdir();
  const profile = await mkdtemp(join(temporaryRoot, 'trb-'));
  await runTests({
    vscodeExecutablePath: process.env.VSCODE_EXECUTABLE_PATH || undefined,
    version: '1.96.0',
    extensionDevelopmentPath: root,
    extensionTestsPath: fileURLToPath(new URL('./host.cjs', import.meta.url)),
    extensionTestsEnv: { RAINBOW_BENCHMARK_OUTPUT: output },
    launchArgs: [
      `--user-data-dir=${join(profile, 'user-data')}`,
      `--extensions-dir=${join(profile, 'extensions')}`,
      '--disable-extensions',
      '--disable-telemetry',
    ],
  });
} else {
  await import('../support/register.mjs');
  const api = require('../support/vscode.cjs');
  api.reset();
  const { benchmark } = await import('./measure.mjs');
  const report = await benchmark({ api, createEditor: api.createEditor, runner: 'node-vscode-test-double' });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
}
console.log(`Saved ${output}`);
