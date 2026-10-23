import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, test } from 'node:test';

import { regression } from './support/regression.mjs';

const require = createRequire(import.meta.url);
const vscode = require('./support/vscode.cjs');
const { ConfigurationManager } = require('../out/services/config.js');
const { TokenizerService } = require('../out/services/tokenizer.js');
const { defaultTheme } = require('../out/themes/default.js');

beforeEach(() => vscode.reset());
afterEach(() => ConfigurationManager.getInstance().dispose());

function ranges(source, language = 'html', theme = defaultTheme) {
  const editor = vscode.createEditor(source, language);
  const map = new TokenizerService().findClassRanges(editor, theme);
  return [...map]
    .flatMap(([key, value]) =>
      value.ranges.map((range) => ({
        key,
        text: editor.document.getText(range),
        start: editor.document.offsetAt(range.start),
        end: editor.document.offsetAt(range.end),
      }))
    )
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

for (const [name, source, language, expected] of [
  [
    'HTML attributes',
    '<div class="sm:hover:bg-red-500 focus:text-white"></div>',
    'html',
    ['sm:', 'hover:bg-red-500', 'focus:text-white'],
  ],
  ['single-quoted attributes', "<div class='hover:bg-red-500'></div>", 'html', ['hover:bg-red-500']],
  ['JSX expressions', '<div className={"hover:bg-red-500"} />', 'typescriptreact', ['hover:bg-red-500']],
  [
    'class utility calls',
    'const x = clsx("hover:p-2", { "focus:p-4": active });',
    'typescript',
    ['hover:p-2', 'focus:p-4'],
  ],
  ['tagged templates', 'const x = tw`sm:hover:flex`;', 'typescript', ['sm:', 'hover:flex']],
  ['markup in templates', 'const x = `<div class="hover:flex"></div>`;', 'javascript', ['hover:flex']],
  ['CSS apply directives', '.item { @apply sm:hover:flex focus:p-2; }', 'css', ['sm:', 'hover:flex', 'focus:p-2']],
  [
    'named relational variants',
    '<div class="group-hover/item:block peer-has-checked:flex"></div>',
    'html',
    ['group-hover/item:block', 'peer-has-checked:flex'],
  ],
  [
    'arbitrary selectors and values',
    '<div class="[&:nth-child(2)]:w-[calc(100%_-_4px)]"></div>',
    'html',
    ['[&:nth-child(2)]:w-[calc(100%_-_4px)]'],
  ],
  ['standalone important modifiers', '<div class="!hidden"></div>', 'html', ['!']],
  ['markup comments', '<!-- <div class="hover:flex"></div> -->', 'html', []],
  ['code comments', '// const x = "hover:flex";\n/* "focus:flex" */', 'typescript', []],
]) {
  test(name, () =>
    assert.deepEqual(
      ranges(source, language).map((range) => range.text),
      expected
    )
  );
}

test('UTF-16 ranges span exact variant text across CRLF lines', () => {
  const source = '<div title="😀">\r\n  <span class="sm:hover:flex"></span>\r\n</div>';
  const start = source.indexOf('sm:hover:');
  assert.deepEqual(ranges(source), [
    { key: 'sm', text: 'sm:', start, end: start + 3 },
    { key: 'hover', text: 'hover:flex', start: start + 3, end: start + 'sm:hover:flex'.length },
  ]);
});

test('base rules and variant rules have separate ranges', () => {
  const source = '<div class="hover:bg-red-500"></div>';
  const theme = { prefix: { hover: { color: '#112233' } }, base: { 'bg-*': { color: '#445566' } } };
  assert.deepEqual(
    ranges(source, 'html', theme).map((range) => [range.key, range.text]),
    [
      ['hover', 'hover:'],
      ['bg-red-500', 'bg-red-500'],
    ]
  );
});

test('documents above the configured size limit yield no ranges', () => {
  vscode.configure({ maxFileSize: 10 });
  assert.deepEqual(ranges('<div class="hover:flex"></div>'), []);
});

test('document positions clamp offsets inside CRLF terminators', () => {
  const document = vscode.createEditor('😀\r\nx').document;
  assert.deepEqual(document.positionAt(3), new vscode.Position(0, 2));
  assert.deepEqual(document.positionAt(4), new vscode.Position(1, 0));
  assert.equal(document.offsetAt(new vscode.Position(0, 100)), 2);
});

for (const [name, source, language] of [
  ['ordinary strings', 'const message = "hover:hello-world";', 'typescript'],
  ['ordinary template literals', 'const message = `hover:hello-world`;', 'typescript'],
  ['CSS block comments', '/* @apply hover:bg-red-500; */', 'css'],
  ['SCSS line comments', '// @apply hover:bg-red-500;', 'scss'],
]) {
  regression(
    `${name} do not receive class highlighting`,
    'Class context and comment boundaries must precede class parsing.',
    () => {
      assert.deepEqual(ranges(source, language), []);
    }
  );
}

regression(
  'important-prefixed variants end at the class boundary',
  'The important modifier offset is counted twice in the final variant range.',
  () => {
    const source = '<div class="!hover:bg-red-500"></div>';
    const start = source.indexOf('!hover:');
    assert.deepEqual(ranges(source), [
      { key: 'important', text: '!', start, end: start + 1 },
      { key: 'hover', text: 'hover:bg-red-500', start: start + 1, end: start + '!hover:bg-red-500'.length },
    ]);
  }
);
