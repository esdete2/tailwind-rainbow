import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, test } from 'node:test';

const require = createRequire(import.meta.url);
const vscode = require('./support/vscode.cjs');
const { ConfigurationManager } = require('../out/services/config.js');
const { TokenizerService } = require('../out/services/tokenizer.js');
const { getThemeConfigForPrefix: prefix, getThemeConfigForBaseClass: base } = require('../out/services/utils.js');
const styles = Array.from({ length: 6 }, (_, index) => ({ color: `#00000${index}` }));

beforeEach(() => {
  vscode.reset();
  vscode.configure({ ignoredPrefixModifiers: [] });
});
afterEach(() => ConfigurationManager.getInstance().dispose());

test('special theme sections precede same-named prefix and base rules', () => {
  const theme = {
    arbitrary: styles[0],
    important: styles[1],
    prefix: { arbitrary: styles[2], important: styles[3] },
    base: { arbitrary: styles[4] },
  };
  assert.equal(prefix(theme, 'arbitrary'), styles[0]);
  assert.equal(prefix(theme, 'important'), styles[1]);
  assert.equal(base(theme, 'arbitrary'), styles[0]);
});

test('prefix lookup prioritizes exact, normalized and named-group rules', () => {
  vscode.configure({ ignoredPrefixModifiers: ['group'] });
  const theme = {
    prefix: { 'group-hover/item': styles[0], 'hover/item': styles[1], hover: styles[2], 'group-*': styles[3] },
  };
  assert.equal(prefix(theme, 'group-hover/item'), styles[0]);
  delete theme.prefix['group-hover/item'];
  assert.equal(prefix(theme, 'group-hover/item'), styles[1]);
  delete theme.prefix['hover/item'];
  assert.equal(prefix(theme, 'group-hover/item'), styles[2]);
  delete theme.prefix.hover;
  assert.equal(prefix(theme, 'group-hover/item'), styles[3]);
});

test('wildcard prefix lookup uses the literal first component', () => {
  vscode.configure({ ignoredPrefixModifiers: ['group'] });
  const theme = { prefix: { 'group-*': styles[0], 'hover-*': styles[1] } };
  assert.equal(prefix(theme, 'group-hover-extra'), styles[0]);
  assert.equal(prefix({ prefix: { 'supports-*': styles[2] } }, 'supports-display-grid'), styles[2]);
});

test('raw arbitrary lookup respects exact rules and keeps sections separate', () => {
  const theme = {
    arbitrary: styles[0],
    prefix: { '[&:hover]': styles[1], flex: styles[2] },
    base: { '[color:red]': styles[3], 'bg-*': styles[4] },
  };
  assert.equal(prefix(theme, '[&:hover]'), styles[1]);
  assert.equal(prefix(theme, '[&:focus]'), styles[0]);
  assert.equal(base(theme, '[color:red]'), styles[3]);
  assert.equal(base(theme, '[color:blue]'), styles[0]);
  assert.equal(base(theme, 'bg-red-500'), styles[4]);
  assert.equal(base(theme, 'flex'), null);
  assert.equal(prefix(theme, 'bg-red-500'), null);
});

test('fragment resolution normalizes arbitrary keys before raw exact lookup', () => {
  const theme = { arbitrary: styles[0], prefix: { '[&:hover]': styles[1] }, base: { '[color:red]': styles[2] } };
  const tokens = new TokenizerService().processClassContent('[&:hover]:[color:red]', 0, theme);
  assert.deepEqual(
    tokens.map((token) => [token.themeKey, token.rangeKey, token.config]),
    [
      ['arbitrary', '[&:hover]', styles[0]],
      ['arbitrary', '[color:red]', styles[0]],
    ]
  );
});

test('disabled exact rules are returned without lower-priority fallback', () => {
  const disabled = { enabled: false };
  assert.equal(prefix({ prefix: { 'hover/item': disabled, hover: styles[0] } }, 'hover/item'), disabled);
  assert.equal(base({ base: { 'bg-red-500': disabled, 'bg-*': styles[0] } }, 'bg-red-500'), disabled);
  assert.equal(prefix({ important: disabled, prefix: { important: styles[0] } }, 'important'), disabled);
});

test('ignored modifier patterns apply in configured order', () => {
  const theme = { prefix: { hover: styles[0] } };
  vscode.configure({ ignoredPrefixModifiers: ['group', 'peer'] });
  assert.equal(prefix(theme, 'group-peer-hover'), styles[0]);
  vscode.configure({ ignoredPrefixModifiers: ['peer', 'group'] });
  assert.equal(prefix(theme, 'group-peer-hover'), null);
  vscode.configure({ ignoredPrefixModifiers: ['.'] });
  assert.equal(prefix(theme, 'g-hover'), styles[0]);
});

test('ignored modifier patterns are evaluated only after exact lookup', () => {
  vscode.configure({ ignoredPrefixModifiers: ['['] });
  assert.equal(prefix({ prefix: { hover: styles[0] } }, 'hover'), styles[0]);
  assert.throws(() => prefix({}, 'unknown'), SyntaxError);
});
