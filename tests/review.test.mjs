import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, test } from 'node:test';

const require = createRequire(import.meta.url);
const vscode = require('./support/vscode.cjs');
const { ConfigurationManager } = require('../out/services/config.js');
const { TokenizerService } = require('../out/services/tokenizer.js');
const { findApplyRegions } = require('../out/services/tokenizer/context.js');
const { defaultTheme } = require('../out/themes/default.js');

beforeEach(() => vscode.reset());
afterEach(() => ConfigurationManager.getInstance().dispose());

function highlighted(source, language = 'typescript', service = new TokenizerService()) {
  const editor = vscode.createEditor(source, language);
  return [...service.findClassRanges(editor, defaultTheme).values()].flatMap(({ ranges }) =>
    ranges.map((range) => editor.document.getText(range))
  );
}

test('class punctuation does not authorize unrelated strings or templates', () => {
  for (const source of [
    'const message = "hover:hello-world";',
    'const message = `hover:hello-world`;',
    'const classmate = "hover:flex";',
    '<div notclass="hover:flex" title="focus:flex" />',
    'cn("hover:flex"); const message = "focus:flex";',
    'cn("hover:flex") + "focus:flex";',
    'const variants = { primary: "hover:flex" }; const message = "focus:flex";',
    'const message = `hello ${name} hover:flex`;',
    'const message = { classmate: "hover:flex" };',
    'const message = "class=hover:flex";',
  ]) {
    const expected = source.includes('cn(') || source.includes('primary:') ? ['hover:flex'] : [];
    assert.deepEqual(highlighted(source), expected, source);
  }
});

test('class contexts preserve configured attributes calls templates and collections', () => {
  for (const source of [
    '<div class = "hover:flex" />',
    '<div className = { "hover:flex" } />',
    'const classes = "hover:flex";',
    'const value = { "className": "hover:flex" };',
    'const value = cn({ active: "hover:flex" });',
    'const value = cn([condition && "hover:flex"]);',
    'const variants = { primary: "hover:flex" };',
    'const value = tw`hover:flex`;',
    'const value = styled.div`hover:flex`;',
    'const value = `<div class="hover:flex"></div>`;',
    'const classes = `hover:flex`;',
  ])
    assert.deepEqual(highlighted(source), ['hover:flex'], source);
});

test('class context configuration changes apply to existing services', () => {
  const service = new TokenizerService();
  const source = 'const x = custom("hover:flex");';
  assert.deepEqual(highlighted(source, 'typescript', service), []);
  vscode.configure({ classFunctions: ['custom'] });
  assert.deepEqual(highlighted(source, 'typescript', service), ['hover:flex']);
  vscode.configure({ classFunctions: [] });
  assert.deepEqual(highlighted(source, 'typescript', service), []);
});

test('template attribute offsets remain exact after Unicode case expansion characters', () => {
  assert.deepEqual(highlighted('const x = `İ 😀<div class="hover:flex"></div>`;'), ['hover:flex']);
});

test('CSS comments suppress directive candidates without consuming following directives', () => {
  for (const language of ['css', 'scss', 'sass', 'less', 'stylus', 'postcss', 'tailwindcss']) {
    for (const source of [
      '/* @apply focus:flex; */ .x { @apply hover:flex; }',
      '/* 😀\r\n @apply focus:flex; */\r\n@apply hover:flex;',
      '@apply hover:flex; /* @apply focus:flex;',
      'content: "/* @apply focus:flex; */"; @apply hover:flex;',
      'content: "\\\" @apply focus:flex;"; @apply hover:flex;',
      'background: url(https://host/asset); @apply hover:flex;',
      'background: url(data:x/@apply\ focus:flex); @apply hover:flex;',
    ]) {
      const start = source.lastIndexOf('hover:flex');
      assert.deepEqual(
        findApplyRegions(source, language),
        [{ content: 'hover:flex', start }],
        `${language}: ${source}`
      );
    }
    assert.deepEqual(findApplyRegions('/* @apply hover:flex;', language), []);
    assert.deepEqual(findApplyRegions('@applyflex;', language), []);
  }
});

test('preprocessor line comments end at CRLF without interpreting URL slashes as comments', () => {
  for (const language of ['scss', 'sass', 'less', 'stylus']) {
    const source = '// @apply focus:flex;\r\n.x { background: url(https://host/a); @apply hover:flex; }';
    assert.deepEqual(findApplyRegions(source, language), [
      { content: 'hover:flex', start: source.indexOf('hover:flex') },
    ]);
  }
});

test('comments inside apply directives separate regions and preserve source offsets', () => {
  const source = '.x { @apply hover:flex /* @apply wrong; */ focus:flex; }';
  assert.deepEqual(findApplyRegions(source, 'css'), [
    { content: 'hover:flex', start: source.indexOf('hover:flex') },
    { content: 'focus:flex', start: source.indexOf('focus:flex') },
  ]);
});

test('important variant fragments end at the class boundary for every theme shape', () => {
  const service = new TokenizerService();
  for (const content of ['!hover:flex', '!sm:hover:flex']) {
    for (const base of [undefined, { flex: { color: '#112233' } }, { flex: { enabled: false } }]) {
      const theme = { prefix: { hover: {}, sm: {} }, important: {}, base };
      const offset = '😀\r\n'.length;
      const fragments = service.processClassContent(content, offset, theme);
      assert.ok(fragments.length > 1);
      assert.equal(fragments.at(-1).end, offset + content.length);
      assert.ok(fragments.every(({ start, end }) => start >= offset && end <= offset + content.length));
    }
  }
});
