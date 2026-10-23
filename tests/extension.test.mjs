import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { regression } from './support/regression.mjs';

const require = createRequire(import.meta.url);
const vscode = require('./support/vscode.cjs');
const { ConfigurationManager } = require('../out/services/config.js');
const { ExtensionService } = require('../out/services/extension.js');
const services = [];
const subscriptions = [];

beforeEach(() => vscode.reset());
afterEach(() => {
  for (const service of services.splice(0)) service.dispose();
  for (const subscription of subscriptions.splice(0)) subscription.dispose();
  ConfigurationManager.getInstance().dispose();
});

async function initialize({ enabled = true, untitled = false } = {}) {
  vscode.configure({ enabled });
  const editor = vscode.createEditor('<div class="hover:bg-red-500"></div>', 'html', untitled);
  vscode.window.activeTextEditor = editor;
  const service = new ExtensionService();
  services.push(service);
  service.initialize();
  await delay(20);
  return { editor, service };
}

function coloredRanges(editor) {
  return [...editor.decorations.values()].flat();
}

test('enabled supported documents receive decorations', async () => {
  const { editor } = await initialize();
  assert.ok(coloredRanges(editor).length > 0);
});

regression(
  'disabled highlighting applies no decorations',
  'The editor update path does not read the enable setting.',
  async () => {
    const { editor } = await initialize({ enabled: false });
    assert.equal(coloredRanges(editor).length, 0);
  }
);

regression(
  'untitled supported documents receive decorations',
  'The editor update path skips untitled documents.',
  async () => {
    const { editor } = await initialize({ untitled: true });
    assert.ok(coloredRanges(editor).length > 0);
  }
);

regression(
  'configuration changes preserve API-registered themes',
  'Theme reload clears themes registered by other extensions.',
  async () => {
    const { service } = await initialize();
    service.registerEventHandlers({ subscriptions });
    const theme = { prefix: { hover: { color: '#123456' } } };
    service.getThemeService().registerTheme('external', theme);
    vscode.configure({ debug: true });
    assert.deepEqual(service.getThemeService().getThemes().get('external'), theme);
  }
);
