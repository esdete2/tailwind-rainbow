import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { benchmark } from './measure.mjs';

const require = createRequire(import.meta.url);

export async function benchmarkCollections({ api, createEditor, runner, directory }) {
  const { predefinedCollections } = require('../../out/collections.js');
  const { defaultTheme } = require('../../out/themes/default.js');
  const { ConfigurationManager } = require('../../out/services/config.js');
  const styles = Object.fromEntries(
    Object.keys(predefinedCollections).map((name, i) => [name, { color: `#${(i + 1).toString(16).padStart(6, '0')}` }])
  );
  const definitions = { buttons: ['btn', 'btn-*'] };
  const config = api.workspace.getConfiguration('tailwindRainbow');
  const originalMode = config.get('mode');
  const originalDefinitions = config.get('collections');
  const originalStyles = defaultTheme.collections;
  await mkdir(directory, { recursive: true });
  try {
    defaultTheme.collections = styles;
    await config.update('collections', definitions, true);
    for (const mode of ['class', 'prefix']) {
      await config.update('mode', mode, true);
      ConfigurationManager.getInstance().reloadConfiguration();
      const report = await benchmark({ api, createEditor, runner });
      report.collectionSettings = { mode, definitions, styles };
      report.collectionHarnessSha256 = createHash('sha256')
        .update(await readFile(new URL('./collections.mjs', import.meta.url)))
        .digest('hex');
      await writeFile(
        join(directory, `enabled-${mode}-${runner === 'vscode-extension-host' ? 'host' : 'node'}.json`),
        JSON.stringify(report, null, 2) + '\n'
      );
    }
  } finally {
    await config.update('mode', originalMode, true);
    await config.update('collections', originalDefinitions, true);
    if (originalStyles === undefined) delete defaultTheme.collections;
    else defaultTheme.collections = originalStyles;
  }
}
