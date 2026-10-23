import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const result = spawnSync(
  process.execPath,
  [
    '--import',
    fileURLToPath(new URL('./support/register.mjs', import.meta.url)),
    '--test',
    fileURLToPath(new URL('./tokenizer.test.mjs', import.meta.url)),
    fileURLToPath(new URL('./ranges.test.mjs', import.meta.url)),
    fileURLToPath(new URL('./extension.test.mjs', import.meta.url)),
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, RAINBOW_STRICT_REGRESSIONS: process.argv.includes('--strict') ? '1' : '0' },
  }
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
