import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const result = spawnSync(
  process.execPath,
  [
    '--import',
    // ESM preloads need file URLs for Windows drive-letter paths.
    new URL('./support/register.mjs', import.meta.url).href,
    '--test',
    fileURLToPath(new URL('./tokenizer.test.mjs', import.meta.url)),
    fileURLToPath(new URL('./document.test.mjs', import.meta.url)),
    fileURLToPath(new URL('./context.test.mjs', import.meta.url)),
    fileURLToPath(new URL('./classes.test.mjs', import.meta.url)),
    fileURLToPath(new URL('./theme.test.mjs', import.meta.url)),
    fileURLToPath(new URL('./templates.test.mjs', import.meta.url)),
    fileURLToPath(new URL('./ranges.test.mjs', import.meta.url)),
    fileURLToPath(new URL('./extension.test.mjs', import.meta.url)),
    fileURLToPath(new URL('./review.test.mjs', import.meta.url)),
    fileURLToPath(new URL('./compatibility.test.mjs', import.meta.url)),
    fileURLToPath(new URL('./collections.test.mjs', import.meta.url)),
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, RAINBOW_STRICT_REGRESSIONS: process.argv.includes('--strict') ? '1' : '0' },
  }
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
