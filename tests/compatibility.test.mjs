import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { parseClassContent } = require('../out/services/tokenizer/classes.js');
const prefixStyle = Object.freeze({ color: '#112233' });
const baseStyle = Object.freeze({ color: '#445566' });
const importantStyle = Object.freeze({ color: '#ff0000' });
const theme = Object.freeze({
  prefix: Object.freeze({ sm: prefixStyle, hover: prefixStyle }),
  base: Object.freeze({ flex: baseStyle, 'tw-flex': baseStyle, 'text-*': baseStyle, 'bg-*': baseStyle }),
  arbitrary: baseStyle,
  important: importantStyle,
});

function spans(content, activeTheme = theme, offset = 5) {
  return parseClassContent(content, offset, activeTheme, [])
    .map(({ rangeKey, start, end }) => [rangeKey, content.slice(start - offset, end - offset), start, end])
    .sort((a, b) => a[2] - b[2] || a[3] - b[3]);
}

for (const [name, content, expected] of [
  [
    'v3 standalone important',
    '!flex',
    [
      ['important', '!', 5, 6],
      ['flex', 'flex', 6, 10],
    ],
  ],
  [
    'v3 variant important',
    'hover:!flex',
    [
      ['hover', 'hover:', 5, 11],
      ['important', '!', 11, 12],
      ['flex', 'flex', 12, 16],
    ],
  ],
  [
    'v4 standalone important',
    'flex!',
    [
      ['flex', 'flex', 5, 9],
      ['important', '!', 9, 10],
    ],
  ],
  [
    'v4 variant important',
    'hover:flex!',
    [
      ['hover', 'hover:', 5, 11],
      ['flex', 'flex', 11, 15],
      ['important', '!', 15, 16],
    ],
  ],
  [
    'v3 prefixed utility',
    'sm:hover:!tw-flex',
    [
      ['sm', 'sm:', 5, 8],
      ['hover', 'hover:', 8, 14],
      ['important', '!', 14, 15],
      ['tw-flex', 'tw-flex', 15, 22],
    ],
  ],
  [
    'v4 namespace segment',
    'tw:hover:flex!',
    [
      ['hover', 'hover:', 8, 14],
      ['flex', 'flex', 14, 18],
      ['important', '!', 18, 19],
    ],
  ],
  [
    'extension leading compatibility',
    '!hover:flex',
    [
      ['important', '!', 5, 6],
      ['hover', 'hover:', 6, 12],
      ['flex', 'flex', 12, 16],
    ],
  ],
])
  test(name, () => assert.deepEqual(spans(content), expected));

test('important markers are excluded from final-prefix fallback fragments', () => {
  const cases = [
    [
      'hover:!flex',
      [
        ['hover', 'hover:', 5, 11],
        ['important', '!', 11, 12],
        ['hover', 'flex', 12, 16],
      ],
    ],
    [
      'hover:flex!',
      [
        ['hover', 'hover:flex', 5, 15],
        ['important', '!', 15, 16],
      ],
    ],
  ];
  for (const [content, expected] of cases) {
    for (const base of [undefined, { flex: { enabled: false } }]) {
      assert.deepEqual(spans(content, { prefix: theme.prefix, important: importantStyle, base }), expected);
    }
  }
});

test('disabled important and prefix rules leave independently styled utility fragments', () => {
  const settings = { ...theme, important: { enabled: false }, prefix: { hover: { enabled: false } } };
  assert.deepEqual(spans('hover:!flex', settings), [['flex', 'flex', 12, 16]]);
  assert.deepEqual(spans('hover:flex!', settings), [['flex', 'flex', 11, 15]]);
  assert.deepEqual(spans('!hover:flex', settings), [['flex', 'flex', 12, 16]]);
  assert.deepEqual(spans('hover:!flex', { ...settings, base: {} }), []);
});

test('disabled important styling does not extend a fallback across the marker', () => {
  assert.deepEqual(spans('hover:!flex', { prefix: theme.prefix, important: { enabled: false } }), [
    ['hover', 'hover:', 5, 11],
    ['hover', 'flex', 12, 16],
  ]);
  assert.deepEqual(spans('hover:flex!', { prefix: theme.prefix, important: { enabled: false } }), [
    ['hover', 'hover:flex', 5, 15],
  ]);
});

for (const content of [
  'text-(length:--size)',
  'bg-(--brand-color)',
  'text-[length:var(--size)]',
  'bg-[url("https://host/a:b!")]',
  'bg-(image:var(--image,url("https://host/a:b!")))',
  'bg-[url(foo\\)bar:baz)]',
  '[content:"[!:]>"]',
])
  test(`grouped utility preserves delimiters in ${content}`, () => {
    const prefix = 'sm:hover:';
    const result = spans(prefix + content);
    assert.deepEqual(result, [
      ['sm', 'sm:', 5, 8],
      ['hover', 'hover:', 8, 14],
      [content, content, 14, 14 + content.length],
    ]);
  });

test('an important suffix follows a protected literal exclamation mark', () => {
  const content = '[content:"!"]!';
  assert.deepEqual(spans(content), [
    ['[content:"!"]', '[content:"!"]', 5, 18],
    ['important', '!', 18, 19],
  ]);
});

test('important and variable ranges retain nonzero UTF-16 document offsets', () => {
  const offset = '😀\r\n'.length;
  const value = 'hover:text-(length:--size)!';
  const tokens = parseClassContent(value, offset, theme, []);
  assert.equal(tokens.find(({ type }) => type === 'important').start, offset + value.length - 1);
  assert.equal(tokens.find(({ rangeKey }) => rangeKey === 'text-(length:--size)').start, offset + 6);
  assert.ok(tokens.every(({ start, end }) => start >= offset && end <= offset + value.length && end > start));
});

test('marker-only and repeated-marker input does not form a utility', () => {
  for (const value of ['!', '!!', '!!flex', 'flex!!', '!flex!', 'hover:!', 'hover:!!flex', 'hover:!flex!'])
    assert.deepEqual(spans(value), [], value);
});

test('incomplete groups and escaped trailing delimiters keep fragment ranges in bounds', () => {
  for (const value of [
    'hover:text-(length:',
    'hover:bg-[url(',
    'hover:[content:"!',
    'hover:flex\\!',
    'hover:bg-(--x)!',
    'hover]::flex',
  ]) {
    for (const { start, end } of parseClassContent(value, 5, theme, [])) {
      assert.ok(start >= 5 && end <= 5 + value.length && start < end, value);
    }
  }
});
