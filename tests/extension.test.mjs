import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { regression } from './support/regression.mjs';

const require = createRequire(import.meta.url);
const vscode = require('./support/vscode.cjs');
const { ConfigurationManager } = require('../out/services/config.js');
const { ExtensionService } = require('../out/services/extension.js');
const { ThemeService } = require('../out/services/theme.js');
const services = [];
const subscriptions = [];
const createEditor = vscode.createEditor;
const createDecoration = vscode.window.createTextEditorDecorationType;

beforeEach(() => {
  vscode.reset();
  const editors = new Set();
  vscode.createEditor = (...args) => {
    const editor = createEditor(...args);
    editors.add(editor);
    return editor;
  };
  // Disposing a VS Code decoration type removes its ranges from every editor.
  vscode.window.createTextEditorDecorationType = (options) => {
    const type = createDecoration(options);
    type.dispose = () => {
      for (const editor of editors) editor.decorations.delete(type);
    };
    return type;
  };
});
afterEach(() => {
  for (const service of services.splice(0)) service.dispose();
  for (const subscription of subscriptions.splice(0)) subscription.dispose();
  ConfigurationManager.getInstance().dispose();
  vscode.createEditor = createEditor;
  vscode.window.createTextEditorDecorationType = createDecoration;
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

test('disabling removes applied decorations and re-enabling restores them', async () => {
  const { editor, service } = await initialize();
  service.registerEventHandlers({ subscriptions });
  assert.ok(coloredRanges(editor).length > 0);
  vscode.configure({ enabled: false });
  await delay(20);
  assert.equal(coloredRanges(editor).length, 0);
  vscode.configure({ enabled: true });
  await delay(20);
  assert.ok(coloredRanges(editor).length > 0);
});

test('disabling cancels pending document decoration updates', async () => {
  const { editor, service } = await initialize();
  let changeDocument;
  const subscribe = vscode.workspace.onDidChangeTextDocument;
  vscode.workspace.onDidChangeTextDocument = (listener) => {
    changeDocument = listener;
    return subscribe(listener);
  };
  try {
    service.registerEventHandlers({ subscriptions });
  } finally {
    vscode.workspace.onDidChangeTextDocument = subscribe;
  }
  changeDocument({ document: editor.document });
  vscode.configure({ enabled: false });
  await delay(340);
  assert.equal(coloredRanges(editor).length, 0);
});

test('unsupported languages and diagnostic editors receive no decorations', async () => {
  for (const [language, scheme] of [
    ['plaintext', 'untitled'],
    ['html', 'output'],
    ['html', 'debug'],
  ]) {
    const editor = vscode.createEditor('<div class="hover:flex">', language, true);
    editor.document.uri.scheme = scheme;
    vscode.window.activeTextEditor = editor;
    const service = new ExtensionService();
    services.push(service);
    service.initialize();
    await delay(20);
    assert.equal(coloredRanges(editor).length, 0, `${language}:${scheme}`);
  }
});

test('settings overlays are removable without losing registered themes or stale styles', () => {
  const service = new ThemeService();
  const registered = { prefix: { hover: { color: '#112233' }, focus: { fontWeight: 'bold' } } };
  service.registerTheme('external', registered);
  vscode.configure({ theme: 'external', themes: { external: { prefix: { hover: { color: '#445566' } } } } });
  service.updateActiveTheme();
  assert.equal(service.getCurrentTheme().prefix.hover.color, '#445566');
  assert.equal(service.getCurrentTheme().prefix.focus.fontWeight, 'bold');
  vscode.configure({ themes: { external: { base: { flex: { color: '#778899' } } } } });
  service.updateActiveTheme();
  assert.equal(service.getCurrentTheme().prefix.hover.color, '#112233');
  assert.equal(service.getCurrentTheme().base.flex.color, '#778899');
  vscode.configure({ themes: {} });
  service.updateActiveTheme();
  service.updateActiveTheme();
  assert.deepEqual(service.getCurrentTheme(), registered);
  assert.deepEqual(service.getThemes().get('external'), registered);
  assert.deepEqual(registered.prefix.hover, { color: '#112233' });
});

test('registered built-in replacements survive reloads and temporary settings overrides', () => {
  const service = new ThemeService();
  const replacement = { prefix: { hover: { color: '#112233' } } };
  service.registerTheme('default', replacement);
  vscode.configure({ themes: { default: { prefix: { hover: { color: '#445566' } } } } });
  service.updateActiveTheme();
  assert.equal(service.getCurrentTheme().prefix.hover.color, '#445566');
  vscode.configure({ themes: {} });
  service.updateActiveTheme();
  assert.deepEqual(service.getCurrentTheme(), replacement);
  vscode.configure({ themes: { temporary: { prefix: {} } } });
  service.updateActiveTheme();
  assert.ok(service.getThemes().has('temporary'));
  vscode.configure({ themes: {} });
  service.updateActiveTheme();
  assert.equal(service.getThemes().has('temporary'), false);
});
