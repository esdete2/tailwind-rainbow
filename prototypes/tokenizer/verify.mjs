import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { scan, TokenKind } from './scanner.ts';

function expectedTokens(fixture, offset) {
  let cursor = 0;
  return fixture.tokens.flatMap(([kind, text]) => {
    const start = fixture.text.indexOf(text, cursor);
    assert.ok(start >= cursor, `Invalid expected token in ${fixture.name}: ${text}`);
    cursor = start + text.length;
    return [offset + start, offset + cursor, TokenKind[kind]];
  });
}

function checkRanges(tokens, source, regions) {
  assert.equal(tokens.length % 3, 0);
  let previousEnd = 0;
  for (let i = 0; i < tokens.length; i += 3) {
    const [start, end, kind] = tokens.subarray(i, i + 3);
    assert.ok(end > start && start >= previousEnd && end <= source.length, 'Ordered, nonempty ranges');
    assert.ok(kind >= 1 && kind <= 4, 'Known token kind');
    assert.ok(
      Array.from({ length: regions.length / 2 }, (_, r) => r).some(
        (r) => start >= regions[r * 2] && end <= regions[r * 2 + 1]
      ),
      'Every token stays inside a supplied class region'
    );
    previousEnd = end;
  }
}

export async function verify() {
  const fixtures = JSON.parse(await readFile(new URL('./fixtures/cases.json', import.meta.url), 'utf8'));
  for (const fixture of fixtures) {
    const prefix = fixture.prefix || 'const message = "hover:outside"; <div class="';
    const suffix = '">hover:outside</div>';
    const source = prefix + fixture.text + suffix + prefix + fixture.text + suffix;
    const secondStart = prefix.length + fixture.text.length + suffix.length + prefix.length;
    const regions = Uint32Array.of(
      prefix.length,
      prefix.length + fixture.text.length,
      secondStart,
      secondStart + fixture.text.length
    );
    const expected = Uint32Array.from([
      ...expectedTokens(fixture, prefix.length),
      ...expectedTokens(fixture, secondStart),
    ]);
    const actual = scan(source, regions);
    assert.deepEqual(actual, expected, `TypeScript: ${fixture.name}`);
    checkRanges(actual, source, regions);
  }

  let seed = 42;
  function random(max) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % max;
  }
  const fragments = [
    'hover:',
    '!',
    'p-2',
    '[',
    ']',
    '(',
    ')',
    ':',
    ' ',
    '\t',
    '\n',
    '\\',
    "'",
    '"',
    '😀',
    '日本語',
    '\ud800',
  ];
  for (let test = 0; test < 500; test++) {
    const source = Array.from({ length: 1 + random(80) }, () => fragments[random(fragments.length)]).join('');
    const regions = Uint32Array.of(0, source.length);
    const actual = scan(source, regions);
    checkRanges(actual, source, regions);
  }
  return {
    fixtures: fixtures.length,
    generatedCases: 500,
  };
}
