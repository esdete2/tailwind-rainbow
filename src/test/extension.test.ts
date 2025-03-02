import * as assert from 'assert';
import { beforeEach, it } from 'mocha';
import * as vscode from 'vscode';

import { TailwindRainbowAPI } from '../extension';

suite('Tailwind Class Coloring Test Suite', () => {
  let doc: vscode.TextDocument;
  let editor: vscode.TextEditor;
  let api: TailwindRainbowAPI;

  // Test helpers
  async function updateTestFile(content: string) {
    await editor.edit((builder) => {
      const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
      builder.replace(fullRange, content);
    });
  }

  function getPrefixRanges() {
    const prefixRanges = api.getPrefixRanges(editor);

    const tableData = [];
    for (const [key, value] of prefixRanges.entries()) {
      tableData.push({
        prefix: key,
        count: value.length,
        ranges: value,
      });
    }
    console.table(tableData);
    return prefixRanges;
  }

  function verifyRanges(content: string, prefixRanges: Map<string, vscode.Range[]>) {
    // Helper to get the text at a specific range
    function getTextAtRange(range: vscode.Range): string {
      const lines = content.split('\n');
      const startLine = lines[range.start.line];
      const endLine = lines[range.end.line];

      if (range.start.line === range.end.line) {
        return startLine.substring(range.start.character, range.end.character);
      }

      return startLine.substring(range.start.character) + endLine.substring(0, range.end.character);
    }

    // Helper to get character offset in content string
    function getPositionOffset(position: vscode.Position): number {
      const lines = content.split('\n');
      let offset = 0;
      for (let i = 0; i < position.line; i++) {
        offset += lines[i].length + 1; // +1 for newline
      }
      return offset + position.character;
    }

    // For each prefix, verify its ranges
    for (const [prefix, ranges] of prefixRanges.entries()) {
      ranges.forEach((range, i) => {
        const text = getTextAtRange(range);
        console.log(
          `Verifying ${prefix} [Ln ${range.start.line}, Col ${range.start.character} / Ln ${range.end.line}, Col ${range.end.character}]:`,
          text
        );

        // Each range should start with its prefix
        assert.ok(
          text.startsWith(prefix + ':'),
          `Range for ${prefix} should start with "${prefix}:" but got "${text}"`
        );

        // If not the last range, shouldn't overlap with next
        if (i < ranges.length - 1) {
          const nextRange = ranges[i + 1];
          assert.ok(range.end.isBefore(nextRange.start), `Range ${i + 1} for ${prefix} overlaps with next range`);
        }

        // Check for gaps between ranges
        if (i > 0) {
          const prevRange = ranges[i - 1];
          assert.ok(
            prevRange.end.isEqual(range.start) || content[getPositionOffset(prevRange.end)].match(/[\s'"]/),
            `Gap between ranges ${i} and ${i + 1} for ${prefix}`
          );
        }
      });
    }
  }

  suiteSetup(async () => {
    const extension = vscode.extensions.getExtension('esdete.tailwind-rainbow');
    if (!extension) {
      throw new Error('Extension not found');
    }
    api = await extension.activate();

    doc = await vscode.workspace.openTextDocument({
      content: '<div></div>',
      language: 'html',
    });
    editor = await vscode.window.showTextDocument(doc);
  });

  beforeEach(async () => {
    console.log('\n');
  });

  it('should detect prefixes in double quotes', async function () {
    const content = '<div class="hover:bg-blue-500 lg:text-xl"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('lg'));
    assert.strictEqual(prefixRanges.size, 2);

    verifyRanges(content, prefixRanges);
  });

  it('should detect prefixes in single quotes', async function () {
    const content = "<div class='hover:bg-blue-500 lg:text-xl'></div>";
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('lg'));
    assert.strictEqual(prefixRanges.size, 2);

    verifyRanges(content, prefixRanges);
  });

  it('should detect prefixes in backticks', async function () {
    const content = '<div className={`hover:bg-blue-500 lg:text-xl`}></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('lg'));
    assert.strictEqual(prefixRanges.size, 2);

    verifyRanges(content, prefixRanges);
  });

  it('should detect multiple instances of the same prefix', async function () {
    const content = '<div class="hover:bg-blue-500 hover:text-white"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.strictEqual(prefixRanges.size, 1);
    assert.strictEqual(prefixRanges.get('hover')!.length, 2);

    verifyRanges(content, prefixRanges);
  });

  it('should handle nested quotes correctly', async function () {
    const content = `
      '<div class="sm:bg-red-500 hover:text-black"></div>'
      "<div class='lg:bg-red-500 active:text-black'></div>"
      \`<div class="md:bg-red-500 focus:text-black"></div>\`
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('sm'));
    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('lg'));
    assert.ok(prefixRanges.has('active'));
    assert.ok(prefixRanges.has('md'));
    assert.ok(prefixRanges.has('focus'));
    assert.strictEqual(prefixRanges.size, 6);

    verifyRanges(content, prefixRanges);
  });

  it('should handle complex nested combinations', async function () {
    const content = '<div class="dark:sm:hover:before:focus:text-blue-500"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('dark'));
    assert.ok(prefixRanges.has('sm'));
    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('before'));
    assert.ok(prefixRanges.has('focus'));
    assert.strictEqual(prefixRanges.size, 5);

    verifyRanges(content, prefixRanges);
  });

  it('should handle basic arbitrary values', async function () {
    const content = "<div class=\"before:content-['*'] after:content-['>>']\"></div>";
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('before'));
    assert.ok(prefixRanges.has('after'));
    assert.strictEqual(prefixRanges.size, 2);

    verifyRanges(content, prefixRanges);
  });

  it('should handle colons in arbitrary values', async function () {
    const content = '<div class="before:content-[test:with:colons]"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('before'));
    assert.strictEqual(prefixRanges.size, 1);

    verifyRanges(content, prefixRanges);
  });

  it('should handle escaped quotes in arbitrary values', async function () {
    const content = '<div class="before:content-[\\"test\\"] hover:text-xl"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('before'));
    assert.ok(prefixRanges.has('hover'));
    assert.strictEqual(prefixRanges.size, 2);

    verifyRanges(content, prefixRanges);
  });

  it('should handle ignored prefix modifiers', async function () {
    const content = '<div class="group-hover/button:bg-blue-500"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('group-hover/button'));
    assert.strictEqual(prefixRanges.size, 1);

    verifyRanges(content, prefixRanges);
  });

  it('should handle chained ignored prefix modifiers', async function () {
    const content = '<div class="peer-has-checked:bg-blue-500"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('peer-has-checked'));
    assert.strictEqual(prefixRanges.size, 1);

    verifyRanges(content, prefixRanges);
  });

  it('should handle mixed quotes and escaped content', async function () {
    const content = '<div class="hover:text-xl \\"quoted\\" sm:flex"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('sm'));
    assert.strictEqual(prefixRanges.size, 2);

    verifyRanges(content, prefixRanges);
  });

  it('should handle multiple lines', async function () {
    const content = `
      <div class="
        hover:bg-blue-500
        lg:text-xl
      "></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('lg'));
    assert.strictEqual(prefixRanges.size, 2);

    verifyRanges(content, prefixRanges);
  });

  it('should ignore invalid prefixes', async function () {
    const content = '<div class="something:special"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.strictEqual(prefixRanges.size, 0);
  });

  it('should ignore classes with double colons or starting/ending with colons', async function () {
    const content = `<div class=":before:content-none after: :hover:"></div>`;
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.strictEqual(prefixRanges.size, 0);
  });
});
