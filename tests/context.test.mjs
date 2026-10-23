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

beforeEach(() => {
  vscode.reset();
  vscode.configure({ classIdentifiers: [], classFunctions: [], templatePatterns: [], contextPatterns: [] });
});
afterEach(() => ConfigurationManager.getInstance().dispose());

/** Controlled lexical candidates isolate context heuristics from the scanner's candidate selection. */
function eligible(
  { before = '', content = 'flex', after = '', type = 'string', quote = '"' },
  service = new TokenizerService()
) {
  const text = before + content + after;
  const start = before.length;
  let accepted = false;
  service.tokenizeDocument = () => [{ type, content, start, end: start + content.length, quote }];
  service.processClassContent = service.processTemplateContent = () => {
    accepted = true;
    return [];
  };
  service.findClassRanges(vscode.createEditor(text), {});
  return accepted;
}

function applyContents(source, language = 'css') {
  const service = new TokenizerService();
  const regions = [];
  service.tokenizeDocument = () => [];
  service.processClassContent = (content, start) => {
    regions.push({ content, start });
    return [];
  };
  service.findClassRanges(vscode.createEditor(source, language), {});
  return regions;
}

test('configured identifiers match attribute and object markers without case sensitivity', () => {
  vscode.configure({ classIdentifiers: ['TW', 'data-style'] });
  for (const before of ['tw="', 'TW:', 'DATA-STYLE="']) assert.equal(eligible({ before }), true, before);
  assert.equal(eligible({ before: 'unknown="' }), false);
});

test('configured utility calls match names and optional whitespace', () => {
  vscode.configure({ classFunctions: ['cx'] });
  for (const before of ['cx("', 'cx ("', 'cx\n ("', 'helpers.cx("']) assert.equal(eligible({ before }), true, before);
  for (const before of ['CX("', 'notcx("', 'unknown("']) assert.equal(eligible({ before }), false, before);
});

test('utility call detection respects the short lookbehind boundary', () => {
  vscode.configure({ classFunctions: ['cx'] });
  assert.equal(eligible({ before: 'cx(' + ' '.repeat(97) }), true);
  assert.equal(eligible({ before: 'cx(' + ' '.repeat(98) }), false);
});

test('collection boundaries allow utility calls in the extended lookbehind', () => {
  vscode.configure({ classFunctions: ['cx'] });
  assert.equal(eligible({ before: 'cx(' + ' '.repeat(296) + '[' }), true);
  assert.equal(eligible({ before: 'cx(' + ' '.repeat(297) + '[' }), false);
});

test('configured context patterns require collection boundaries', () => {
  vscode.configure({ contextPatterns: ['palette'] });
  for (const boundary of ['[', '{', ',', ':']) {
    assert.equal(eligible({ before: 'palette' + ' '.repeat(110) + boundary }), true, boundary);
  }
  assert.equal(eligible({ before: 'palette' + ' '.repeat(110) + '(' }), false);
  assert.equal(eligible({ before: 'PALETTE' + ' '.repeat(110) + '[' }), false);
});

test('context patterns respect the extended lookbehind boundary', () => {
  vscode.configure({ contextPatterns: ['palette'] });
  assert.equal(eligible({ before: 'palette' + ' '.repeat(292) + '[' }), true);
  assert.equal(eligible({ before: 'palette' + ' '.repeat(293) + '[' }), false);
});

test('template patterns retain configured case and quote selection', () => {
  vscode.configure({ templatePatterns: ['styled'] });
  assert.equal(eligible({ before: 'styled ', quote: '`' }), true);
  assert.equal(eligible({ before: 'STYLED ', quote: '`' }), false);
  assert.equal(eligible({ before: 'styled ', quote: '"' }), false);
});

test('attribute fallback respects lookbehind and lookahead limits', () => {
  assert.equal(eligible({ before: 'class="' + 'x'.repeat(93) }), true);
  assert.equal(eligible({ before: 'class="' + 'x'.repeat(94) }), false);
  assert.equal(eligible({ after: 'x'.repeat(43) + 'class="' }), true);
  assert.equal(eligible({ after: 'x'.repeat(44) + 'class="' }), false);
});

test('configuration changes affect the next calculation on an existing service', () => {
  const service = new TokenizerService();
  const candidate = { before: 'custom="' };
  assert.equal(eligible(candidate, service), false);
  vscode.configure({ classIdentifiers: ['custom'] });
  assert.equal(eligible(candidate, service), true);
  vscode.configure({ classIdentifiers: [], classFunctions: ['custom'] });
  assert.equal(eligible(candidate, service), false);
  assert.equal(eligible({ before: 'custom("' }, service), true);
});

test('content and proximity heuristics match their labeled compatibility snapshots', async () => {
  const fixture = JSON.parse(await readFile(new URL('./fixtures/context-compatibility.json', import.meta.url), 'utf8'));
  for (const { candidate, accepted } of fixture.candidates)
    assert.equal(eligible(candidate), accepted, JSON.stringify(candidate));
  for (const { source, regions } of fixture.directives) assert.deepEqual(applyContents(source), regions);
});

for (const language of ['css', 'scss', 'sass', 'less', 'stylus', 'postcss', 'tailwindcss']) {
  test(`${language} documents expose CSS directive content`, () => {
    assert.deepEqual(applyContents('@apply flex;', language), [{ content: 'flex', start: 7 }]);
  });
}

test('CSS directive discovery ignores unsupported document languages', () => {
  for (const language of ['html', 'typescript', 'plaintext', 'CSS'])
    assert.deepEqual(applyContents('@apply flex;', language), []);
});

test('CSS directive content ends at delimiters or the end of input', () => {
  for (const delimiter of [';', '}', '\n', '\r', '']) {
    const source = '.x { @apply \t flex  ' + delimiter + (delimiter ? 'trailing' : '');
    assert.deepEqual(
      applyContents(source),
      [{ content: 'flex', start: source.indexOf('flex') }],
      JSON.stringify(delimiter)
    );
  }
});

test('CSS directives trim whitespace and preserve UTF-16 starts in source order', () => {
  const source = '/* 😀 */ .x { @apply\n\t flex  ; @apply  grid; }';
  assert.deepEqual(applyContents(source), [
    { content: 'flex', start: source.indexOf('flex') },
    { content: 'grid', start: source.indexOf('grid') },
  ]);
});

test('empty CSS directives emit no content regions', () => {
  assert.deepEqual(applyContents('@apply ; @apply\t; @apply'), []);
});

test('context detection runs with plain settings without VS Code or configuration', () => {
  const result = execFileSync(
    process.execPath,
    [
      '-e',
      `const {isClassContext, findApplyRegions} = require(process.argv[1]);
       const settings = Object.freeze({
         classIdentifiers: Object.freeze(['custom']), classFunctions: new Set(),
         templatePatterns: Object.freeze([]), contextPatterns: Object.freeze([])
       });
       const token = Object.freeze({type:'string', content:'flex', start:8, end:12, quote:'"'});
       process.stdout.write(JSON.stringify({
         eligible: isClassContext('custom="flex"', token, settings),
         regions: findApplyRegions('.x{@apply flex;}', 'css')
       }));`,
      fileURLToPath(new URL('../out/services/tokenizer/context.js', import.meta.url)),
    ],
    { encoding: 'utf8' }
  );
  assert.deepEqual(JSON.parse(result), { eligible: true, regions: [{ content: 'flex', start: 10 }] });
});
