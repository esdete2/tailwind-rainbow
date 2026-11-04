import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, test } from 'node:test';

const require = createRequire(import.meta.url);
const vscode = require('./support/vscode.cjs');
const { ConfigurationManager } = require('../out/services/config.js');
const { ThemeService } = require('../out/services/theme.js');
const { TokenizerService } = require('../out/services/tokenizer.js');
const { CollectionMatcher, predefinedCollection } = require('../out/services/tokenizer/collections.js');
const { getThemeConfigForBaseClass } = require('../out/services/utils.js');
const { predefinedCollections } = require('../out/collections.js');
const style = { color: '#112233' };
const other = { color: '#445566' };
const theme = { prefix: { sm: style, hover: other }, important: { color: '#FF0000' } };

beforeEach(() => vscode.reset());
afterEach(() => ConfigurationManager.getInstance().dispose());

function parse(value, activeTheme = theme, offset = 0, tokenizer = new TokenizerService()) {
  return tokenizer
    .processClassContent(value, offset, activeTheme)
    .map((t) => [t.start, t.end, t.rangeKey, t.config])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

test('prefix mode stops each variant at its colon', () => {
  vscode.configure({ mode: 'prefix' });
  assert.deepEqual(parse('sm:hover:!p-4', theme, 5), [
    [5, 8, 'sm', style],
    [8, 14, 'hover', other],
    [14, 15, 'important', theme.important],
  ]);
  assert.deepEqual(parse('hover:p-4!'), [
    [0, 6, 'hover', other],
    [9, 10, 'important', theme.important],
  ]);
  assert.deepEqual(parse('[&:hover]:unknown', { arbitrary: style }), [[0, 10, '[&:hover]', style]]);
});

test('mode defaults and reloads preserve variant fallback', () => {
  const tokenizer = new TokenizerService();
  assert.deepEqual(parse('hover:p-4', theme, 0, tokenizer), [[0, 9, 'hover', other]]);
  vscode.configure({ mode: 'prefix' });
  assert.deepEqual(parse('hover:p-4', theme, 0, tokenizer), [[0, 6, 'hover', other]]);
  vscode.configure({ mode: 'class' });
  assert.deepEqual(parse('hover:p-4', theme, 0, tokenizer), [[0, 9, 'hover', other]]);
  vscode.configure({ mode: 'invalid' });
  assert.deepEqual(parse('hover:p-4', theme, 0, tokenizer), [[0, 9, 'hover', other]]);
});

test('utility and important styles are independent of mode', () => {
  for (const mode of ['class', 'prefix']) {
    vscode.configure({ mode });
    const active = { ...theme, collections: { spacing: style } };
    assert.deepEqual(parse('hover:!p-4', active, 3), [
      [3, 9, 'hover', other],
      [9, 10, 'important', theme.important],
      [10, 13, 'collection:spacing', style],
    ]);
    assert.deepEqual(parse('hover:flex!', { ...theme, base: { flex: style } }), [
      [0, 6, 'hover', other],
      [6, 10, 'flex', style],
      [10, 11, 'important', theme.important],
    ]);
  }
});

test('predefined collections follow documented utility categories', () => {
  // Category sources and the complete family lists are documented in docs/collections.md.
  const examples = {
    layout: [
      'flex',
      'grid',
      'inline-flex',
      'table',
      'table-row',
      'hidden',
      'absolute',
      '-top-2',
      'sr-only',
      'box-decoration-clone',
      'break-before-page',
    ],
    flexboxGrid: [
      'flex-col',
      'basis-1/2',
      'grow',
      'shrink-0',
      'grid-cols-3',
      '-col-start-1',
      'gap-x-4',
      'items-center',
      'content-center',
    ],
    spacing: ['p-4', 'px-2', 'pbs-2', '-mx-4', 'm-auto', 'space-x-2', '-space-y-1', 'p-[var(--gap)]', 'p-(--gap)'],
    sizing: ['size-4', 'w-full', 'min-w-0', 'max-h-screen', 'is-full', 'min-bs-4'],
    typography: [
      'text-red-500',
      'text-(length:--size)',
      'font-bold',
      'font-sans',
      'italic',
      'truncate',
      '-tracking-wide',
      'content-["hello"]',
      'decoration-red-500',
      'break-words',
    ],
    backgrounds: ['bg-red-500', 'bg-[url(x-y)]', 'bg-linear-to-r', 'bg-gradient-to-r', 'from-red-500'],
    borders: [
      'border',
      'border-2',
      'border-brand',
      'rounded',
      'rounded-lg',
      'divide-x-2',
      'ring-2',
      'inset-ring-2',
      '-outline-offset-2',
    ],
    effects: [
      'shadow',
      'shadow-md',
      'text-shadow-sm',
      'inset-shadow-sm',
      'opacity-50',
      'bg-blend-multiply',
      'mask-linear-45',
    ],
    filters: ['blur', 'blur-sm', 'filter-none', 'backdrop-blur-sm', '-hue-rotate-90'],
    tables: ['border-collapse', 'border-separate', 'border-spacing-x-2', 'table-auto', 'table-fixed', 'caption-bottom'],
    transitionsAnimation: ['transition', 'transition-colors', 'duration-300', 'ease-in', 'delay-100', 'animate-spin'],
    transforms: [
      'transform',
      'transform-gpu',
      '-translate-x-1/2',
      'scale-x-50',
      '-rotate-45',
      'perspective-distant',
      'origin-center',
    ],
    interactivity: [
      'pointer-events-none',
      'cursor-pointer',
      'resize',
      'select-none',
      '-scroll-mt-2',
      'touch-pan-x',
      'scrollbar-thin',
    ],
    svg: ['fill-red-500', 'stroke-2', 'stroke-[3]'],
    accessibility: ['forced-color-adjust-none', 'forced-color-adjust-auto'],
  };
  assert.deepEqual(Object.keys(predefinedCollections), Object.keys(examples));
  for (const [name, classes] of Object.entries(examples)) {
    for (const value of classes) assert.equal(predefinedCollection(value), name, value);
  }
  for (const value of ['pointerless', 'btn-primary', 'maximal', '-p-4', '-border-2', 'tw-p-4', '[padding:1rem]'])
    assert.equal(predefinedCollection(value), undefined, value);
});

test('predefined boundaries are independent of which categories are styled', () => {
  const matcher = new CollectionMatcher();
  for (const [value, wrong] of [
    ['border-collapse', 'borders'],
    ['text-shadow-sm', 'typography'],
    ['bg-blend-normal', 'backgrounds'],
    ['content-center', 'typography'],
    ['flex', 'flexboxGrid'],
  ])
    assert.equal(matcher.lookup(value, { [wrong]: style }), null, value);
});

test('collection arrays add replace and empty complete definitions', () => {
  const matcher = new CollectionMatcher({ spacing: ['px-*'], buttons: ['btn', 'btn-*'], layout: [] });
  const styles = { spacing: style, buttons: other, layout: style, borders: other };
  assert.deepEqual(matcher.lookup('px-4', styles), { name: 'spacing', config: style });
  assert.equal(matcher.lookup('p-4', styles), null);
  assert.equal(matcher.lookup('flex', styles), null);
  assert.deepEqual(matcher.lookup('btn', styles), { name: 'buttons', config: other });
  assert.deepEqual(matcher.lookup('btn-primary', styles), { name: 'buttons', config: other });
  assert.deepEqual(matcher.lookup('border-2', styles), { name: 'borders', config: other });
});

test('collection patterns are literal families and exact names', () => {
  const matcher = new CollectionMatcher({
    custom: ['btn-*', '-mx-*', 'grid-cols-*', 'btn', '[color:red]', 'p*-*', '*', '', 'bad pattern'],
  });
  const styles = { custom: style };
  for (const name of ['btn', 'btn-primary', 'btn-primary-large', '-mx-2', 'grid-cols-[1fr_2fr]', '[color:red]'])
    assert.equal(matcher.lookup(name, styles)?.name, 'custom', name);
  for (const name of ['button', 'my-btn-primary', 'mx-2', 'grid-rows-2', 'p-4', 'px-4', 'anything', ''])
    assert.equal(matcher.lookup(name, styles), null, name);
});

test('configured collection priority is stable across exact and family matches', () => {
  const matcher = new CollectionMatcher({ first: ['p-*'], second: ['p-4'] });
  assert.deepEqual(matcher.lookup('p-4', { first: style, second: other, spacing: other }), {
    name: 'first',
    config: style,
  });
  assert.deepEqual(matcher.lookup('p-4', { second: other, spacing: style }), { name: 'second', config: other });
  const disabled = { enabled: false };
  assert.deepEqual(matcher.lookup('p-4', { first: disabled, second: other, spacing: style }), {
    name: 'first',
    config: disabled,
  });
});

test('compiled collections snapshot definitions and do not scan unrelated rules', () => {
  const definitions = {
    buttons: ['btn-*'],
    ...Object.fromEntries(Array.from({ length: 10000 }, (_, i) => [`other${i}`, [`other${i}-*`]])),
  };
  const matcher = new CollectionMatcher(definitions);
  definitions.buttons.push('changed');
  let reads = 0;
  const styles = new Proxy(
    { buttons: style },
    {
      get(target, key) {
        reads++;
        return target[key];
      },
    }
  );
  assert.equal(matcher.lookup('btn-primary', styles)?.name, 'buttons');
  assert.ok(reads <= 4, 'Lookup must not inspect unrelated collection styles');
  assert.equal(matcher.lookup('changed', styles), null);
});

test('explicit base rules precede collections including disabled matches', () => {
  for (const mode of ['class', 'prefix']) {
    vscode.configure({ mode });
    const active = { collections: { spacing: style }, base: { 'p-*': other } };
    assert.deepEqual(parse('p-4', active), [[0, 3, 'p-4', other]]);
    active.base['p-4'] = { enabled: false };
    assert.deepEqual(parse('p-4', active), []);
    assert.equal(getThemeConfigForBaseClass(active, 'p-4'), active.base['p-4']);
  }
});

test('disabled collections suppress utility fallthrough while preserving mode behavior', () => {
  vscode.configure({ collections: { custom: ['p-*'] } });
  const active = { ...theme, collections: { custom: { enabled: false }, spacing: style } };
  assert.deepEqual(parse('hover:p-4', active), [[0, 9, 'hover', other]]);
  vscode.configure({ mode: 'prefix' });
  assert.deepEqual(parse('hover:p-4', active), [[0, 6, 'hover', other]]);
});

test('collection names keep their decoration configuration separate from variant names', () => {
  vscode.configure({ mode: 'prefix', collections: { hover: ['btn-*'] } });
  const editor = vscode.createEditor('<x class="hover:btn-primary">');
  const ranges = new TokenizerService().findClassRanges(editor, { ...theme, collections: { hover: style } });
  assert.equal(ranges.get('hover').config, other);
  assert.equal(ranges.get('collection:hover').config, style);
  assert.equal(editor.document.getText(ranges.get('hover').ranges[0]), 'hover:');
  assert.equal(editor.document.getText(ranges.get('collection:hover').ranges[0]), 'btn-primary');
});

test('custom utility names do not inherit object-prototype base rules', () => {
  vscode.configure({
    collections: { widgets: ['constructor', 'toString', '__proto__'] },
    themes: { default: { collections: { widgets: style } } },
  });
  const active = new ThemeService().getCurrentTheme();
  const tokens = new TokenizerService().processClassContent('constructor toString __proto__', 0, active);
  assert.equal(tokens.length, 3);
  for (const token of tokens) {
    assert.equal(token.rangeKey, 'collection:widgets');
    assert.equal(token.config.color, style.color);
  }
});

test('styled collections accept long lists of bare utilities within the content limit', () => {
  const content = 'block flex grid hidden '.repeat(8);
  const active = { collections: { layout: style } };
  assert.equal(new TokenizerService().processClassContent(content, 0, active).length, 32);
  assert.deepEqual(new TokenizerService().processClassContent(content.repeat(30), 0, active), []);
});

test('collections preserve arbitrary-property and protected-value behavior', () => {
  vscode.configure({ collections: { props: ['[padding:1rem]'] } });
  const active = { arbitrary: other, collections: { props: style, spacing: style } };
  assert.deepEqual(parse('[padding:1rem]', active), [[0, 14, '[padding:1rem]', other]]);
  assert.deepEqual(parse('p-(--gap)!', { ...active, important: theme.important }), [
    [0, 9, 'collection:spacing', style],
    [9, 10, 'important', theme.important],
  ]);
  assert.deepEqual(parse('p-[var(--gap)]', active), [[0, 14, 'collection:spacing', style]]);
  vscode.configure({ collections: { props: ['arbitrary'] } });
  assert.deepEqual(parse('[padding:1rem]', { collections: { props: style } }), []);
});

test('mode and collections preserve exact document offsets and context filtering', () => {
  vscode.configure({ mode: 'prefix', collections: { buttons: ['btn-*'] } });
  const value = 'hover:btn-primary!';
  const source = `😀\r\nconst message = "${value}";\r\n<div class='${value}'></div>`;
  const editor = vscode.createEditor(source, 'typescriptreact');
  const offset = source.lastIndexOf(value);
  const actual = [...new TokenizerService().findClassRanges(editor, { ...theme, collections: { buttons: style } })]
    .flatMap(([key, entry]) =>
      entry.ranges.map((range) => [
        key,
        editor.document.offsetAt(range.start) - offset,
        editor.document.offsetAt(range.end) - offset,
      ])
    )
    .sort((a, b) => a[1] - b[1]);
  assert.deepEqual(actual, [
    ['hover', 0, 6],
    ['collection:buttons', 6, 17],
    ['important', 17, 18],
  ]);
});

test('configuration reload replaces collection matchers and preserves the public adapter', () => {
  const tokenizer = new TokenizerService();
  const active = { collections: { buttons: style } };
  vscode.configure({ collections: { buttons: ['btn-*'] } });
  assert.deepEqual(parse('btn-primary', active, 0, tokenizer), [[0, 11, 'collection:buttons', style]]);
  assert.equal(getThemeConfigForBaseClass(active, 'btn-primary'), style);
  vscode.configure({ collections: { buttons: ['button-*'] } });
  assert.deepEqual(parse('btn-primary', active, 0, tokenizer), []);
  assert.deepEqual(parse('button-primary', active, 0, tokenizer), [[0, 14, 'collection:buttons', style]]);
  vscode.configure({ collections: {} });
  assert.deepEqual(parse('button-primary', active, 0, tokenizer), []);
});

test('collection theme overlays retain registrations and remove stale settings', () => {
  const themes = new ThemeService();
  const registered = { collections: { spacing: style, layout: other } };
  themes.registerTheme('external', registered);
  vscode.configure({ theme: 'external', themes: { external: { collections: { spacing: other, custom: style } } } });
  themes.updateActiveTheme();
  assert.deepEqual(themes.getCurrentTheme().collections, { spacing: other, layout: other, custom: style });
  vscode.configure({ themes: {} });
  themes.updateActiveTheme();
  assert.deepEqual(themes.getCurrentTheme(), registered);
});

test('invalid collection members are ignored without changing default categories', () => {
  vscode.configure({ collections: { broken: false, buttons: [null, 2, 'btn-*'] } });
  const active = { collections: { buttons: style, spacing: other } };
  assert.deepEqual(parse('btn-primary p-4', active), [
    [0, 11, 'collection:buttons', style],
    [12, 15, 'collection:spacing', other],
  ]);
});
