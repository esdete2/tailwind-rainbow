import { mkdtemp } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0 && !process.argv[outputIndex + 1]) throw new Error('--output requires a directory');
const directory = resolve(outputIndex < 0 ? 'benchmarks/collections' : process.argv[outputIndex + 1]);
if (process.argv.includes('--host')) {
  const { runTests } = require('@vscode/test-electron');
  const profile = await mkdtemp(join(process.platform === 'darwin' ? '/tmp' : tmpdir(), 'trc-'));
  await runTests({
    vscodeExecutablePath: process.env.VSCODE_EXECUTABLE_PATH || undefined,
    version: process.env.VSCODE_VERSION || '1.96.0',
    extensionDevelopmentPath: fileURLToPath(new URL('../../', import.meta.url)),
    extensionTestsPath: fileURLToPath(new URL('./collections-host.cjs', import.meta.url)),
    extensionTestsEnv: { RAINBOW_COLLECTION_OUTPUT: directory },
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
  const { benchmarkCollections } = await import('./collections.mjs');
  api.reset();
  await benchmarkCollections({ api, createEditor: api.createEditor, runner: 'node-vscode-test-double', directory });
}
