import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    // macOS Unix-domain sockets require a short profile path.
    const profile = await mkdtemp(join(process.platform === 'darwin' ? '/tmp' : tmpdir(), 'trl-'));
    await runTests({
      vscodeExecutablePath: process.env.VSCODE_EXECUTABLE_PATH || undefined,
      version: process.env.VSCODE_VERSION || '1.96.0',
      extensionDevelopmentPath: resolve(__dirname, '../..'),
      extensionTestsPath: resolve(__dirname, './suite/index'),
      launchArgs: [
        `--user-data-dir=${join(profile, 'user-data')}`,
        `--extensions-dir=${join(profile, 'extensions')}`,
        '--disable-extensions',
        '--disable-telemetry',
      ],
    });
  } catch (err) {
    console.error('Failed to run tests', err);
    process.exit(1);
  }
}

main();
