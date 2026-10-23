import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { cases, corpus } from './benchmark/corpus.mjs';

const require = createRequire(import.meta.url);
const vscode = require('./support/vscode.cjs');
const { ConfigurationManager } = require('../out/services/config.js');
const { TokenizerService } = require('../out/services/tokenizer.js');
const hash = (value) => createHash('sha256').update(value).digest('hex');

beforeEach(() => vscode.reset());
afterEach(() => ConfigurationManager.getInstance().dispose());

function scan(source) {
  return new TokenizerService().tokenizeDocument(source);
}

for (const quote of ['"', "'", '`']) {
  test(`document scanning identifies ${quote}-quoted spans`, () => {
    const content = 'sm:hover:flex';
    const source = `cn(${quote}${content}${quote})`;
    assert.deepEqual(scan(source), [
      { type: quote === '`' ? 'template' : 'string', content, start: 4, end: 4 + content.length, quote },
    ]);
  });
}

test('quoted spans retain escaped delimiters and backslashes', () => {
  const content = String.raw`a\"b\\c`;
  const source = `cn("${content}")`;
  assert.deepEqual(scan(source), [{ type: 'string', content, start: 4, end: 4 + content.length, quote: '"' }]);
});

test('quoted spans contain comment markers without emitting comment tokens', () => {
  const content = '// /* # <!-- {/*';
  assert.deepEqual(scan(`class="${content}"`), [
    { type: 'string', content, start: 7, end: 7 + content.length, quote: '"' },
  ]);
});

test('template spans contain interpolation and nested markup', () => {
  const content = '<div class="sm:flex">${value}</div>';
  assert.deepEqual(scan(`html\`${content}\``), [
    { type: 'template', content, start: 5, end: 5 + content.length, quote: '`' },
  ]);
});

for (const [name, opener, closer] of [
  ['block comments', '/*', '*/'],
  ['HTML comments', '<!--', '-->'],
  ['JSX comments', '{/*', '*/}'],
]) {
  test(`document scanning delimits ${name}`, () => {
    const content = `${opener} "hover:flex" ${closer}`;
    const source = `${content} class="x"`;
    const start = source.lastIndexOf('"x"') + 1;
    assert.deepEqual(scan(source), [
      { type: 'comment', content, start: 0, end: content.length },
      { type: 'string', content: 'x', start, end: start + 1, quote: '"' },
    ]);
  });

  test(`${name} consume the remaining input without a closing delimiter`, () => {
    const source = `${opener} "hover:flex"`;
    assert.deepEqual(scan(source), [{ type: 'comment', content: source, start: 0, end: source.length }]);
  });
}

for (const opener of ['//', '#']) {
  test(`${opener} comments end before a line terminator`, () => {
    for (const terminator of ['\r', '\n', '\r\n', '']) {
      const content = `${opener} "hover:flex"`;
      const source = content + terminator;
      assert.deepEqual(scan(source), [{ type: 'comment', content, start: 0, end: content.length }]);
    }
  });
}

test('regular quoted spans require a recognized preceding boundary', () => {
  for (const prefix of ['class=', 'class={', 'cn(', ',', '[', '{', ':']) {
    const start = prefix.length + 1;
    assert.deepEqual(scan(`${prefix}"value"`), [
      { type: 'string', content: 'value', start, end: start + 5, quote: '"' },
    ]);
  }
  assert.deepEqual(scan('return "value"'), []);
  assert.deepEqual(scan('"value"'), []);
});

test('regular quoted span detection uses a bounded whitespace lookbehind', () => {
  assert.equal(scan(`x=${' '.repeat(99)}"value"`).length, 1);
  assert.deepEqual(scan(`x=${' '.repeat(100)}"value"`), []);
});

test('document token offsets count UTF-16 code units across CRLF', () => {
  const content = 'sm:flex 😀';
  assert.deepEqual(scan(`😀\r\nclass="${content}"\r\n`), [{ type: 'string', content, start: 11, end: 21, quote: '"' }]);
});

test('empty input and empty quoted content have distinct token streams', () => {
  assert.deepEqual(scan(''), []);
  assert.deepEqual(scan('class=""'), [{ type: 'string', content: '', start: 7, end: 7, quote: '"' }]);
});

test('incomplete quoted spans match the documented lexical compatibility snapshots', async () => {
  const fixture = JSON.parse(
    await readFile(new URL('./fixtures/document-compatibility.json', import.meta.url), 'utf8')
  );
  for (const { source, tokens } of fixture.incomplete) assert.deepEqual(scan(source), tokens);
});

test('benchmark corpora retain their lexical token fingerprints', async () => {
  const fixture = JSON.parse(
    await readFile(new URL('./fixtures/document-compatibility.json', import.meta.url), 'utf8')
  );
  assert.deepEqual(
    fixture.corpora.map((entry) => entry.name),
    cases.map((entry) => entry.name)
  );
  for (const [index, scenario] of cases.entries()) {
    const source = corpus(scenario);
    const expected = fixture.corpora[index];
    assert.equal(hash(source), expected.sourceSha256, scenario.name);
    const tokens = scan(source);
    assert.equal(tokens.length, expected.tokenCount, scenario.name);
    assert.equal(hash(JSON.stringify(tokens)), expected.tokensSha256, scenario.name);
  }
});

test('document scanning runs without a VS Code runtime or configuration', () => {
  const result = execFileSync(
    process.execPath,
    [
      '-e',
      `const {scanDocument, readQuotedString} = require(process.argv[1]);
       process.stdout.write(JSON.stringify({
         tokens: scanDocument('class="sm:flex"'),
         quoted: readQuotedString('x"abc"', 1, '"')
       }));`,
      fileURLToPath(new URL('../out/services/tokenizer/document.js', import.meta.url)),
    ],
    { encoding: 'utf8' }
  );
  assert.deepEqual(JSON.parse(result), {
    tokens: [{ type: 'string', content: 'sm:flex', start: 7, end: 14, quote: '"' }],
    quoted: { endPos: 6, content: 'abc' },
  });
});
