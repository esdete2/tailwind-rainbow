import { mkdtemp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { runTests } = require('@vscode/test-electron');
const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0 && !process.argv[outputIndex + 1]) throw new Error('--output requires a file path');
const output = resolve(outputIndex >= 0 ? process.argv[outputIndex + 1] : '.sdd/tmp/review-host.json');
await mkdir(dirname(output), { recursive: true });
const profile = await mkdtemp(join(process.platform === 'darwin' ? '/tmp' : tmpdir(), 'trr-'));
await runTests({
  vscodeExecutablePath: process.env.VSCODE_EXECUTABLE_PATH || undefined,
  version: '1.96.0',
  extensionDevelopmentPath: fileURLToPath(new URL('../', import.meta.url)),
  extensionTestsPath: fileURLToPath(new URL('./host/review.cjs', import.meta.url)),
  extensionTestsEnv: { RAINBOW_REVIEW_OUTPUT: output },
  launchArgs: [
    `--user-data-dir=${join(profile, 'user-data')}`,
    `--extensions-dir=${join(profile, 'extensions')}`,
    '--disable-extensions',
    '--disable-telemetry',
  ],
});
console.log(`Saved ${output}`);
