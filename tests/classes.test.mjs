import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const vscode = require('./support/vscode.cjs');
const { ConfigurationManager } = require('../out/services/config.js');
const { TokenizerService } = require('../out/services/tokenizer.js');
const prefixStyle = { color: '#112233' };
const baseStyle = { color: '#445566' };
const arbitraryStyle = { color: '#778899' };
const importantStyle = { fontWeight: 'bold' };
const theme = {
  prefix: { hover: prefixStyle, sm: prefixStyle },
  base: { flex: baseStyle, grid: baseStyle, 'bg-*': baseStyle },
  arbitrary: arbitraryStyle,
  important: importantStyle,
};

beforeEach(() => {
  vscode.reset();
  vscode.configure({ ignoredPrefixModifiers: [] });
});
afterEach(() => ConfigurationManager.getInstance().dispose());

function parse(content, activeTheme = theme, offset = 0) {
  return new TokenizerService().processClassContent(content, offset, activeTheme);
}

function fragment(content, start, end, rangeKey, config, themeKey = rangeKey, type = 'class') {
  return { type, content, start, end, themeKey, rangeKey, config };
}

test('class lists produce independent prefix and base fragments', () => {
  assert.deepEqual(parse('hover:flex sm:bg-red-500', theme, 10), [
    fragment('hover:flex', 10, 16, 'hover', prefixStyle),
    fragment('hover:flex', 16, 20, 'flex', baseStyle),
    fragment('sm:bg-red-500', 21, 24, 'sm', prefixStyle),
    fragment('sm:bg-red-500', 24, 34, 'bg-red-500', baseStyle),
  ]);
});

test('class-list whitespace preserves document-relative starts', () => {
  const content = 'flex \t\r\ngrid';
  assert.deepEqual(parse(content), [
    fragment('flex', 0, 4, 'flex', baseStyle),
    fragment('grid', content.indexOf('grid'), content.length, 'grid', baseStyle),
  ]);
});

test('markup delimiters end a class list after a word', () => {
  for (const delimiter of ['<', '>', '{', '}'])
    assert.deepEqual(parse(`flex${delimiter} grid`), [fragment('flex', 0, 4, 'flex', baseStyle)], delimiter);
});

test('arbitrary selectors and values protect bracketed colons', () => {
  const prefix = '[&:nth-child(2)]';
  const base = 'bg-[url(x:y)]';
  const content = `${prefix}:${base}`;
  assert.deepEqual(parse(content, theme, 5), [
    fragment(content, 5, 5 + prefix.length + 1, prefix, arbitraryStyle, 'arbitrary'),
    fragment(content, 5 + prefix.length + 1, 5 + content.length, base, baseStyle),
  ]);
});

test('important modifiers have separate fragments when their base is themed', () => {
  assert.deepEqual(parse('!hover:flex'), [
    fragment('!', 0, 1, 'important', importantStyle, 'important', 'important'),
    fragment('hover:flex', 1, 7, 'hover', prefixStyle),
    fragment('hover:flex', 7, 11, 'flex', baseStyle),
  ]);
  assert.deepEqual(parse('!flex', { ...theme, important: { enabled: false } }), [
    fragment('flex', 1, 5, 'flex', baseStyle),
  ]);
});

test('disabled exact rules suppress wildcard fragments', () => {
  assert.deepEqual(
    parse('hover:bg-red-500', {
      prefix: { hover: { enabled: false } },
      base: { 'bg-red-500': { enabled: false }, 'bg-*': baseStyle },
    }),
    []
  );
});

test('an unstyled base remains inside its final styled variant', () => {
  assert.deepEqual(parse('sm:hover:unknown', { prefix: theme.prefix }), [
    fragment('sm:hover:unknown', 0, 3, 'sm', prefixStyle),
    fragment('sm:hover:unknown', 3, 16, 'hover', prefixStyle),
  ]);
});

test('class-content guards retain their configured thresholds', () => {
  assert.equal(parse('hover:flex' + ' '.repeat(4990)).length, 2);
  assert.deepEqual(parse('hover:flex' + ' '.repeat(4991)), []);
  assert.equal(parse('flex' + ' '.repeat(96)).length, 1);
  assert.deepEqual(parse('flex' + ' '.repeat(97)), []);
});

test('leading and trailing variant separators yield no fragments', () => {
  assert.deepEqual(parse(':hover:flex hover:flex: !:flex !hover:'), []);
});

test('malformed class content retains its labeled compatibility outcomes', async () => {
  const fixture = JSON.parse(await readFile(new URL('./fixtures/classes-compatibility.json', import.meta.url), 'utf8'));
  for (const item of fixture.cases) {
    if (item.error)
      assert.throws(() => parse(item.content, item.theme, item.offset), { name: item.error }, item.content);
    else assert.deepEqual(parse(item.content, item.theme, item.offset), item.tokens, item.content);
  }
});

test('class parsing and theme resolution run without VS Code or configuration', () => {
  const result = execFileSync(
    process.execPath,
    [
      '-e',
      `const {parseClassContent} = require(process.argv[1]);
       const {lookupPrefix} = require(process.argv[2]);
       const {findTemplateRegions} = require(process.argv[3]);
       const style = Object.freeze({color:'#112233'});
       const theme = Object.freeze({prefix:Object.freeze({hover:style})});
       const modifiers = Object.freeze([]);
       process.stdout.write(JSON.stringify({
         fragments:parseClassContent('hover:flex',3,theme,modifiers).map(t=>[t.rangeKey,t.start,t.end]),
         rule:lookupPrefix(theme,'hover',modifiers).color,
         regions:findTemplateRegions('<x class="flex">',2,Object.freeze(['class']))
       }));`,
      ...['classes', 'theme', 'context'].map((name) =>
        fileURLToPath(new URL(`../out/services/tokenizer/${name}.js`, import.meta.url))
      ),
    ],
    { encoding: 'utf8' }
  );
  assert.deepEqual(JSON.parse(result), {
    fragments: [['hover', 3, 13]],
    rule: '#112233',
    regions: [{ content: 'flex', start: 12 }],
  });
});
