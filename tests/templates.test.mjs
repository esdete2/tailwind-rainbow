import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, test } from 'node:test';

const require = createRequire(import.meta.url);
const vscode = require('./support/vscode.cjs');
const { ConfigurationManager } = require('../out/services/config.js');
const { TokenizerService } = require('../out/services/tokenizer.js');

beforeEach(() => vscode.reset());
afterEach(() => ConfigurationManager.getInstance().dispose());

/** Record parsing requests through the service, including its output-dependent template fallback. */
function requests(content, identifiers = ['class'], emit = false) {
  vscode.configure({ classIdentifiers: identifiers });
  const service = new TokenizerService();
  const calls = [];
  service.tokenizeDocument = () => [{ type: 'template', content, start: 7, end: 7 + content.length, quote: '`' }];
  service.processClassContent = (text, start) => {
    calls.push({ content: text, start });
    return emit
      ? [{ type: 'class', content: text, start, end: start + text.length, rangeKey: 'test', config: {} }]
      : [];
  };
  service.findClassRanges(vscode.createEditor('class=`' + content + '`'), {});
  return calls;
}

test('template attributes follow identifier order and preserve UTF-16 starts', () => {
  const content = '😀<x class="flex" className=\'grid\' class="block">';
  assert.deepEqual(requests(content, ['className', 'class']), [
    { content: 'grid', start: 7 + content.indexOf('grid') },
    { content: 'flex', start: 7 + content.indexOf('flex') },
    { content: 'block', start: 7 + content.indexOf('block') },
  ]);
});

test('template attributes accept either quote and whitespace after equals', () => {
  const content = '<x CLASS= \t "flex" class=\'grid\'>';
  assert.deepEqual(requests(content), [
    { content: 'flex', start: 7 + content.indexOf('flex') },
    { content: 'grid', start: 7 + content.indexOf('grid') },
  ]);
});

test('template attribute matching requires an adjacent equals sign and quoted value', () => {
  assert.deepEqual(requests('<x class ="flex" class={value} class=flex>'), []);
});

test('template discovery retains repeated and overlapping identifier matches', () => {
  const content = '<x class="class=\'flex\'">';
  assert.deepEqual(requests(content), [
    { content: "class='flex'", start: 7 + content.indexOf("class='flex'") },
    { content: 'flex', start: 7 + content.indexOf('flex') },
  ]);
  assert.equal(requests('<x class="flex">', ['class', 'class']).length, 2);
});

test('template fallback depends on emitted fragments rather than discovered attributes', () => {
  const content = 'class="flex"';
  assert.deepEqual(requests(content), [
    { content: 'flex', start: 14 },
    { content, start: 7 },
  ]);
  assert.deepEqual(requests(content, ['class'], true), [{ content: 'flex', start: 14 }]);
});

test('template fallback is limited to content without markup', () => {
  assert.deepEqual(requests('hover:flex'), [{ content: 'hover:flex', start: 7 }]);
  assert.deepEqual(requests('<span>hover:flex</span>'), []);
});

test('incomplete template attributes use the quoted-reader compatibility boundary', () => {
  assert.deepEqual(requests('<x class="flex'), [{ content: 'fle', start: 17 }]);
  assert.deepEqual(requests('<x class="'), []);
});
