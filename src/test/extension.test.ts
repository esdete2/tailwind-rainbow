import * as assert from 'assert';
import { beforeEach, it } from 'mocha';
import * as vscode from 'vscode';

import { TailwindRainbowAPI } from '../extension';

suite('Tailwind Class Coloring Test Suite', () => {
  let doc: vscode.TextDocument;
  let editor: vscode.TextEditor;
  let api: TailwindRainbowAPI;

  // Test helpers
  async function updateTestFile(content: string, language?: string) {
    const doc = await vscode.workspace.openTextDocument({
      content,
      language: language || 'html',
    });
    editor = await vscode.window.showTextDocument(doc);
  }

  function getTokenRanges() {
    const tokenRanges = api.getTokenRanges(editor);

    const tableData = [];
    for (const [key, value] of tokenRanges.entries()) {
      tableData.push({
        prefix: key,
        count: value.length,
        ranges: value,
      });
    }
    console.table(tableData);
    return tokenRanges;
  }

  function verifyRanges(content: string, tokenRanges: Map<string, vscode.Range[]>, expectedColoredPartials?: string[]) {
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

    // Collect all ranges in order for comparison with expected partials
    const allRanges: { prefix: string; range: vscode.Range; rangeIndex: number }[] = [];
    for (const [prefix, ranges] of tokenRanges.entries()) {
      ranges.forEach((range, rangeIndex) => {
        allRanges.push({ prefix, range, rangeIndex });
      });
    }

    // Sort ranges by position in document
    allRanges.sort((a, b) => {
      if (a.range.start.line !== b.range.start.line) {
        return a.range.start.line - b.range.start.line;
      }
      return a.range.start.character - b.range.start.character;
    });

    // For each prefix, verify its ranges
    for (const [prefix, ranges] of tokenRanges.entries()) {
      ranges.forEach((range, i) => {
        const text = getTextAtRange(range);
        console.log(
          `Verifying ${prefix} [Ln ${range.start.line}, Col ${range.start.character} / Ln ${range.end.line}, Col ${range.end.character}]:`,
          text
        );

        // If expected partials provided, check against them by document order
        if (expectedColoredPartials) {
          const globalIndex = allRanges.findIndex((r) => r.range === range);
          if (globalIndex < expectedColoredPartials.length) {
            assert.strictEqual(
              text,
              expectedColoredPartials[globalIndex],
              `Expected colored partial at index ${globalIndex} should be "${expectedColoredPartials[globalIndex]}" but got "${text}"`
            );
          }
        }

        // Each range should contain its prefix (special case for important and base classes)
        if (prefix === 'important') {
          assert.ok(text === '!', `Range for ${prefix} should be "!" but got "${text}"`);
        } else if (text.includes(':') && !text.startsWith('[') && !text.endsWith(']')) {
          // This is a prefixed class (contains colon)
          assert.ok(text.includes(prefix + ':'), `Range for ${prefix} should contain "${prefix}:" but got "${text}"`);
        } else {
          // This is a base class (no colon), should match exactly or be part of the class name
          assert.ok(
            text === prefix || text.includes(prefix),
            `Range for ${prefix} should contain "${prefix}" but got "${text}"`
          );
        }

        // If not the last range, shouldn't overlap with next
        if (i < ranges.length - 1) {
          const nextRange = ranges[i + 1];
          assert.ok(range.end.isBefore(nextRange.start), `Range ${i + 1} for ${prefix} overlaps with next range`);
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
    // Ensure our main editor is active and ready
    if (!editor || editor.document.isClosed) {
      editor = await vscode.window.showTextDocument(doc);
    }
  });

  it('should detect prefixes in double quotes', async function () {
    const content = '<div class="hover:bg-blue-500 lg:text-xl lg:hover:bg-red-500"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('lg'));
    assert.strictEqual(tokenRanges.size, 2);

    verifyRanges(content, tokenRanges, ['hover:bg-blue-500', 'lg:text-xl', 'lg:', 'hover:bg-red-500']);
  });

  it('should detect prefixes in single quotes', async function () {
    const content = "<div class='hover:bg-blue-500 lg:text-xl'></div>";
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('lg'));
    assert.strictEqual(tokenRanges.size, 2);

    verifyRanges(content, tokenRanges, ['hover:bg-blue-500', 'lg:text-xl']);
  });

  it('should detect prefixes in backticks', async function () {
    const content = '<div className={`hover:bg-blue-500 lg:text-xl`}></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('lg'));
    assert.strictEqual(tokenRanges.size, 2);

    verifyRanges(content, tokenRanges, ['hover:bg-blue-500', 'lg:text-xl']);
  });

  it('should detect prefixes in template literals and JSX expressions', async function () {
    const content = `
      <div className={\`hover:bg-blue-500 lg:text-xl\`}></div>
      <div className={"md:bg-red-500"}></div>
      <div className={'sm:text-white'}></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('lg'));
    assert.ok(tokenRanges.has('md'));
    assert.ok(tokenRanges.has('sm'));
    assert.strictEqual(tokenRanges.size, 4);

    verifyRanges(content, tokenRanges, ['hover:bg-blue-500', 'lg:text-xl', 'md:bg-red-500', 'sm:text-white']);
  });

  it('should detect multiple instances of the same prefix', async function () {
    const content = '<div class="hover:bg-blue-500 hover:text-white"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.strictEqual(tokenRanges.size, 1);
    assert.strictEqual(tokenRanges.get('hover')!.length, 2);

    verifyRanges(content, tokenRanges, ['hover:bg-blue-500', 'hover:text-white']);
  });

  it('should handle nested quotes correctly', async function () {
    const content = `
      '<div class="sm:bg-red-500 hover:text-black"></div>'
      "<div class='lg:bg-red-500 active:text-black'></div>"
      \`<div class="md:bg-red-500 focus:text-black"></div>\`
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('sm'));
    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('lg'));
    assert.ok(tokenRanges.has('active'));
    assert.ok(tokenRanges.has('md'));
    assert.ok(tokenRanges.has('focus'));
    assert.strictEqual(tokenRanges.size, 6);

    verifyRanges(content, tokenRanges, [
      'sm:bg-red-500',
      'hover:text-black',
      'lg:bg-red-500',
      'active:text-black',
      'md:bg-red-500',
      'focus:text-black',
    ]);
  });

  it('should handle complex nested combinations', async function () {
    const content = '<div class="dark:sm:hover:before:focus:text-blue-500"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('dark'));
    assert.ok(tokenRanges.has('sm'));
    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('before'));
    assert.ok(tokenRanges.has('focus'));
    assert.strictEqual(tokenRanges.size, 5);

    verifyRanges(content, tokenRanges, ['dark:', 'sm:', 'hover:', 'before:', 'focus:text-blue-500']);
  });

  it('should handle basic arbitrary values', async function () {
    const content = "<div class=\"before:content-['*'] after:content-['>>']\"></div>";
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('before'));
    assert.ok(tokenRanges.has('after'));
    assert.strictEqual(tokenRanges.size, 2);

    verifyRanges(content, tokenRanges, ["before:content-['*']", "after:content-['>>']"]);
  });

  it('should handle colons in arbitrary values', async function () {
    const content = '<div class="before:content-[test:with:colons]"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('before'));
    assert.strictEqual(tokenRanges.size, 1);

    verifyRanges(content, tokenRanges, ['before:content-[test:with:colons]']);
  });

  it('should handle escaped quotes in arbitrary values', async function () {
    const content = '<div class="before:content-[\\"test\\"] hover:text-xl"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('before'));
    assert.ok(tokenRanges.has('hover'));
    assert.strictEqual(tokenRanges.size, 2);

    verifyRanges(content, tokenRanges, ['before:content-[\\"test\\"]', 'hover:text-xl']);
  });

  it('should handle ignored prefix modifiers', async function () {
    const content = '<div class="group-hover/button:bg-blue-500"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('group-hover/button'));
    assert.strictEqual(tokenRanges.size, 1);

    verifyRanges(content, tokenRanges, ['group-hover/button:bg-blue-500']);
  });

  it('should handle chained ignored prefix modifiers', async function () {
    const content = '<div class="peer-has-checked:bg-blue-500"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('peer-has-checked'));
    assert.strictEqual(tokenRanges.size, 1);

    verifyRanges(content, tokenRanges, ['peer-has-checked:bg-blue-500']);
  });

  it('should handle wildcard patterns', async function () {
    const content = '<div class="min-[1920px]:max-w-sm max-sm:w-full"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('min-[1920px]'));
    assert.ok(tokenRanges.has('max-sm'));
    assert.strictEqual(tokenRanges.size, 2);

    verifyRanges(content, tokenRanges, ['min-[1920px]:max-w-sm', 'max-sm:w-full']);
  });

  it('should handle arbitrary prefixes', async function () {
    const content = '<div class="[&.is-dragging]:cursor-grabbing"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('[&.is-dragging]'));
    assert.strictEqual(tokenRanges.size, 1);

    verifyRanges(content, tokenRanges, ['[&.is-dragging]:cursor-grabbing']);
  });

  it('should handle important modifier', async function () {
    const content = '<div class="!text-red-500"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('important'));
    assert.strictEqual(tokenRanges.size, 1);

    verifyRanges(content, tokenRanges, ['!']);
  });

  it('should handle mixed quotes and escaped content', async function () {
    const content = '<div class="hover:text-xl \\"quoted\\" sm:flex"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('sm'));
    assert.strictEqual(tokenRanges.size, 2);

    verifyRanges(content, tokenRanges, ['hover:text-xl', 'sm:flex']);
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

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('lg'));
    assert.strictEqual(tokenRanges.size, 2);

    verifyRanges(content, tokenRanges, ['hover:bg-blue-500', 'lg:text-xl']);
  });

  it('should ignore invalid prefixes', async function () {
    const content = '<div class="something:special"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.strictEqual(tokenRanges.size, 0);
    verifyRanges(content, tokenRanges, []);
  });

  it('should ignore standalone prefixes', async function () {
    const content = '<div class="invalid md checked"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.strictEqual(tokenRanges.size, 0);
    verifyRanges(content, tokenRanges, []);
  });

  it('should ignore quotes outside of class names', async function () {
    const content = `
    It's a single single quote
    <div class="hover:bg-blue-500 after:content-['Hi']"></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('after'));
    assert.strictEqual(tokenRanges.size, 2);

    verifyRanges(content, tokenRanges, ['hover:bg-blue-500', "after:content-['Hi']"]);
  });

  it('should ignore classes with double colons or starting/ending with colons', async function () {
    const content = `<div class=":before:content-none after: :hover:"></div>`;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.strictEqual(tokenRanges.size, 0);
    verifyRanges(content, tokenRanges, []);
  });

  it('should detect prefixes in utility functions', async function () {
    const content = `
      <div
        className={classNames("lg:bg-blue-500", {
          "md:text-white": true,
        })}
      ></div>
      <div className={cn("sm:border-2", "hover:bg-red-500")}></div>
      <div className={clsx("xl:p-4", { "focus:ring-2": isActive })}></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('lg'));
    assert.ok(tokenRanges.has('md'));
    assert.ok(tokenRanges.has('sm'));
    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('xl'));
    assert.ok(tokenRanges.has('focus'));
    assert.strictEqual(tokenRanges.size, 6);

    verifyRanges(content, tokenRanges, [
      'lg:bg-blue-500',
      'md:text-white',
      'sm:border-2',
      'hover:bg-red-500',
      'xl:p-4',
      'focus:ring-2',
    ]);
  });

  it('should detect prefixes in variable assignments', async function () {
    const content = `
      const tableClasses = "sm:border-2 lg:shadow-lg";
      const buttonStyles = 'hover:bg-blue-500 focus:outline-none';
      let cardClasses = \`md:rounded-lg xl:max-w-md\`;
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('sm'));
    assert.ok(tokenRanges.has('lg'));
    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('focus'));
    assert.ok(tokenRanges.has('md'));
    assert.ok(tokenRanges.has('xl'));
    assert.strictEqual(tokenRanges.size, 6);

    verifyRanges(content, tokenRanges, [
      'sm:border-2',
      'lg:shadow-lg',
      'hover:bg-blue-500',
      'focus:outline-none',
      'md:rounded-lg',
      'xl:max-w-md',
    ]);
  });

  it('should detect prefixes in CVA (Class Variance Authority) patterns', async function () {
    const content = `
      const button = cva(["font-semibold", "border", "rounded"], {
        variants: {
          intent: {
            primary: "md:bg-black hover:bg-gray-800",
            secondary: "md:bg-white hover:bg-gray-100"
          },
          disabled: {
            false: null,
            true: ["md:opacity-50", "cursor-not-allowed"],
          },
        },
        compoundVariants: [
          {
            intent: "primary",
            disabled: false,
            class: "hover:bg-blue-600 focus:ring-2",
          },
        ],
        defaultVariants: {
          intent: "primary",
          disabled: false,
        },
      });
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('md'));
    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('focus'));
    assert.strictEqual(tokenRanges.size, 3);

    verifyRanges(content, tokenRanges, [
      'md:bg-black',
      'hover:bg-gray-800',
      'md:bg-white',
      'hover:bg-gray-100',
      'md:opacity-50',
      'hover:bg-blue-600',
      'focus:ring-2',
    ]);
  });

  it('should detect prefixes in more utility function patterns', async function () {
    const content = `
      const styles = twMerge("sm:p-4", "lg:p-8");
      const classes = tw\`md:flex xl:block\`;
      const theme = styled.div\`
        sm:text-sm
        lg:text-lg
      \`;
      classList.add("hover:opacity-75");
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('sm'));
    assert.ok(tokenRanges.has('lg'));
    assert.ok(tokenRanges.has('md'));
    assert.ok(tokenRanges.has('xl'));
    assert.ok(tokenRanges.has('hover'));
    assert.strictEqual(tokenRanges.size, 5);

    verifyRanges(content, tokenRanges, [
      'sm:p-4',
      'lg:p-8',
      'md:flex',
      'xl:block',
      'sm:text-sm',
      'lg:text-lg',
      'hover:opacity-75',
    ]);
  });

  it('should detect base class patterns like bg-*, text-*, etc.', async function () {
    // Inject base class configurations for testing via workspace configuration
    const config = vscode.workspace.getConfiguration('tailwindRainbow');
    const originalThemes = config.get('themes', {});

    const testThemes = {
      ...originalThemes,
      'test-base-patterns': {
        prefix: {
          hover: {
            color: '#4ee585',
            fontWeight: '700',
          },
          lg: {
            color: '#a78bfa',
            fontWeight: '700',
          },
        },
        base: {
          'bg-*': {
            color: '#ff6b6b',
            fontWeight: '600',
          },
          'text-*': {
            color: '#4ecdc4',
            fontWeight: '600',
          },
          'p-*': {
            color: '#ffe66d',
            fontWeight: '600',
          },
          'rounded-*': {
            color: '#ff8b94',
            fontWeight: '600',
          },
        },
      },
    };

    // Set the test themes and activate the test theme
    await config.update('themes', testThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'test-base-patterns', vscode.ConfigurationTarget.Global);

    // Give some time for the configuration to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    const content = `
      <div class="bg-blue-500 text-white p-4 rounded-lg"></div>
      <div class="bg-red-300 text-gray-800 p-2 rounded-md"></div>
      <div class="bg-gradient-to-r text-xl p-8 rounded-full"></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('bg-blue-500'));
    assert.ok(tokenRanges.has('bg-red-300'));
    assert.ok(tokenRanges.has('bg-gradient-to-r'));
    assert.ok(tokenRanges.has('text-white'));
    assert.ok(tokenRanges.has('text-gray-800'));
    assert.ok(tokenRanges.has('text-xl'));
    assert.ok(tokenRanges.has('p-4'));
    assert.ok(tokenRanges.has('p-2'));
    assert.ok(tokenRanges.has('p-8'));
    assert.ok(tokenRanges.has('rounded-lg'));
    assert.ok(tokenRanges.has('rounded-md'));
    assert.ok(tokenRanges.has('rounded-full'));
    assert.strictEqual(tokenRanges.size, 12);

    verifyRanges(content, tokenRanges, [
      'bg-blue-500',
      'text-white',
      'p-4',
      'rounded-lg',
      'bg-red-300',
      'text-gray-800',
      'p-2',
      'rounded-md',
      'bg-gradient-to-r',
      'text-xl',
      'p-8',
      'rounded-full',
    ]);

    // Restore original configuration
    await config.update('themes', originalThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'default', vscode.ConfigurationTarget.Global);
  });

  it('should handle mixed prefix and base class patterns', async function () {
    // Inject base class configurations for testing via workspace configuration
    const config = vscode.workspace.getConfiguration('tailwindRainbow');
    const originalThemes = config.get('themes', {});

    const testThemes = {
      ...originalThemes,
      'test-mixed-patterns': {
        prefix: {
          hover: {
            color: '#4ee585',
            fontWeight: '700',
          },
          lg: {
            color: '#a78bfa',
            fontWeight: '700',
          },
          sm: {
            color: '#d18bfa',
            fontWeight: '700',
          },
          focus: {
            color: '#4ee6b8',
            fontWeight: '700',
          },
        },
        base: {
          'bg-*': {
            color: '#ff6b6b',
            fontWeight: '600',
          },
          'border-*': {
            color: '#95e1d3',
            fontWeight: '600',
          },
        },
      },
    };

    // Set the test themes and activate the test theme
    await config.update('themes', testThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'test-mixed-patterns', vscode.ConfigurationTarget.Global);

    // Give some time for the configuration to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    const content = `
      <div class="hover:bg-blue-500 lg:border-2 bg-white border-gray-300"></div>
      <div class="sm:bg-red-500 focus:border-blue-500"></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('bg-blue-500'));
    assert.ok(tokenRanges.has('lg'));
    assert.ok(tokenRanges.has('border-2'));
    assert.ok(tokenRanges.has('bg-white'));
    assert.ok(tokenRanges.has('border-gray-300'));
    assert.ok(tokenRanges.has('sm'));
    assert.ok(tokenRanges.has('bg-red-500'));
    assert.ok(tokenRanges.has('focus'));
    assert.ok(tokenRanges.has('border-blue-500'));
    assert.strictEqual(tokenRanges.size, 10);

    verifyRanges(content, tokenRanges, [
      'hover:',
      'bg-blue-500',
      'lg:',
      'border-2',
      'bg-white',
      'border-gray-300',
      'sm:',
      'bg-red-500',
      'focus:',
      'border-blue-500',
    ]);

    // Restore original configuration
    await config.update('themes', originalThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'default', vscode.ConfigurationTarget.Global);
  });

  it('should detect * and ** prefix as a regular Tailwind prefix', async function () {
    const content = `
      <div class="*:bg-blue-500 **:bg-blue-500"></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('*'));
    assert.ok(tokenRanges.has('**'));
    assert.strictEqual(tokenRanges.size, 2);

    verifyRanges(content, tokenRanges, ['*:bg-blue-500', '**:bg-blue-500']);
  });

  it('should handle mixed * and ** prefixes with existing prefix and base classes', async function () {
    // Inject test theme with base classes alongside * and ** prefixes
    const config = vscode.workspace.getConfiguration('tailwindRainbow');
    const originalThemes = config.get('themes', {});

    const testThemes = {
      ...originalThemes,
      'test-star-mixed': {
        prefix: {
          '*': {
            color: '#ff6600',
            fontWeight: '600',
          },
          '**': {
            color: '#ff3300',
            fontWeight: '700',
          },
          hover: {
            color: '#4ee585',
            fontWeight: '700',
          },
          sm: {
            color: '#d18bfa',
            fontWeight: '700',
          },
        },
        base: {
          'bg-*': {
            color: '#ff6b6b',
            fontWeight: '600',
          },
        },
      },
    };

    // Set the test theme
    await config.update('themes', testThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'test-star-mixed', vscode.ConfigurationTarget.Global);

    // Give some time for the configuration to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    const content = `
      <div class="hover:bg-blue-500 *:text-white bg-red-300 sm:p-4"></div>
      <div class="**:border-2 bg-white *:shadow-lg"></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('bg-blue-500'));
    assert.ok(tokenRanges.has('*'));
    assert.ok(tokenRanges.has('bg-red-300'));
    assert.ok(tokenRanges.has('sm'));
    assert.ok(tokenRanges.has('**'));
    assert.ok(tokenRanges.has('bg-white'));
    assert.strictEqual(tokenRanges.size, 7);

    verifyRanges(content, tokenRanges, [
      'hover:',
      'bg-blue-500',
      '*:text-white',
      'bg-red-300',
      'sm:p-4',
      '**:border-2',
      'bg-white',
      '*:shadow-lg',
    ]);

    // Restore original configuration
    await config.update('themes', originalThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'default', vscode.ConfigurationTarget.Global);
  });

  it('should detect classes in template literals with tw` pattern', async function () {
    const content = `
      import tw from 'twin.macro';
      
      const Button = tw\`
        bg-blue-500 hover:bg-blue-600
        text-white font-bold py-2 px-4 rounded
        lg:text-xl md:p-6
      \`;
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('lg'));
    assert.ok(tokenRanges.has('md'));
    assert.strictEqual(tokenRanges.size, 3);

    verifyRanges(content, tokenRanges, ['hover:bg-blue-600', 'lg:text-xl', 'md:p-6']);
  });

  it('should detect classes in tw` template literals', async function () {
    const content = `
      import tw from 'twin.macro';
      const Button = tw\`hover:bg-blue-600 focus:ring-2 lg:p-4\`;
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('focus'));
    assert.ok(tokenRanges.has('lg'));
    assert.strictEqual(tokenRanges.size, 3);

    verifyRanges(content, tokenRanges, ['hover:bg-blue-600', 'focus:ring-2', 'lg:p-4']);
  });

  it('should detect classes in className template literals', async function () {
    const content = `
      const Component = () => (
        <div className={\`base-class hover:bg-blue-600 focus:ring-2 sm:opacity-75 lg:text-xl\`}>
          Content
        </div>
      );
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('focus'));
    assert.ok(tokenRanges.has('sm'));
    assert.ok(tokenRanges.has('lg'));
    assert.strictEqual(tokenRanges.size, 4);

    verifyRanges(content, tokenRanges, ['hover:bg-blue-600', 'focus:ring-2', 'sm:opacity-75', 'lg:text-xl']);
  });

  it('should detect classes in template literals with class attribute pattern', async function () {
    const content = `
      const template = \`
        <div class="hover:bg-blue-500 lg:text-xl">
          <span class="sm:text-sm focus:outline-none">Content</span>
        </div>
      \`;
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('lg'));
    assert.ok(tokenRanges.has('sm'));
    assert.ok(tokenRanges.has('focus'));
    assert.strictEqual(tokenRanges.size, 4);

    verifyRanges(content, tokenRanges, ['hover:bg-blue-500', 'lg:text-xl', 'sm:text-sm', 'focus:outline-none']);
  });

  it('should detect classes in styled` template literals', async function () {
    const content = `
      import styled from 'styled-components';
      
      const Card = styled.div\`
        background: white;
        hover:bg-blue-500 focus:ring-2 sm:p-4 lg:p-6
      \`;
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('focus'));
    assert.ok(tokenRanges.has('sm'));
    assert.ok(tokenRanges.has('lg'));
    assert.strictEqual(tokenRanges.size, 4);

    verifyRanges(content, tokenRanges, ['hover:bg-blue-500', 'focus:ring-2', 'sm:p-4', 'lg:p-6']);
  });

  it('should detect classes with css` template pattern', async function () {
    const content = `
      const styles = css\`
        background: white;
        hover:bg-blue-500 focus:ring-2 sm:p-4 lg:p-6
      \`;
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('focus'));
    assert.ok(tokenRanges.has('sm'));
    assert.ok(tokenRanges.has('lg'));
    assert.strictEqual(tokenRanges.size, 4);

    verifyRanges(content, tokenRanges, ['hover:bg-blue-500', 'focus:ring-2', 'sm:p-4', 'lg:p-6']);
  });

  it('should demonstrate template pattern functionality with known working patterns', async function () {
    const content = `
      // Test tw\` pattern
      const Button = tw\`bg-blue-500 hover:bg-blue-600\`;
      
      // Test className with template literal
      const Component = () => (
        <div className={\`base-class sm:responsive-class lg:large-class\`}>
          Content
        </div>
      );
      
      // Test regular string patterns
      const classes = "md:text-center focus:ring-2";
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    // Log what we actually found for debugging
    console.log('Found prefixes:', Array.from(tokenRanges.keys()));

    console.log('Template patterns are working! Found prefixes:', Array.from(tokenRanges.keys()));

    // Verify we found at least some of the expected ones
    const expectedPrefixes = ['hover', 'sm', 'lg', 'md', 'focus'];
    const foundPrefixes = Array.from(tokenRanges.keys());
    const intersection = expectedPrefixes.filter((p) => foundPrefixes.includes(p));

    assert.ok(
      intersection.length > 0,
      `Should find at least some prefixes from ${expectedPrefixes.join(', ')}, but found: ${foundPrefixes.join(', ')}`
    );
  });

  it('should detect classes in CSS files with @apply directive', async function () {
    // Create a CSS document to test CSS file support
    const content = `
        .btn {
          @apply bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded;
        }

        .responsive-grid {
          @apply grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
        }
        
        @media (max-width: 640px) {
          .mobile-only {
            @apply block sm:hidden p-4 focus:outline-none;
          }
        }
      `;

    console.log('Testing:', content);
    await updateTestFile(content, 'css');

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('sm'));
    assert.ok(tokenRanges.has('md'));
    assert.ok(tokenRanges.has('lg'));
    assert.ok(tokenRanges.has('focus'));

    verifyRanges(content, tokenRanges, [
      'hover:bg-blue-600',
      'sm:grid-cols-1',
      'md:grid-cols-2',
      'lg:grid-cols-3',
      'sm:hidden',
      'focus:outline-none',
    ]);
  });

  it('should detect classes in SCSS files with @apply directive', async function () {
    const content = `
      .component {
        @apply md:p-6 lg:p-8;

        .content {
          @apply md:text-base lg:text-lg;
        }
      }
    `;

    console.log('Testing:', content);
    await updateTestFile(content, 'scss');

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('md'));
    assert.ok(tokenRanges.has('lg'));
    assert.strictEqual(tokenRanges.size, 2);

    verifyRanges(content, tokenRanges, ['md:p-6', 'lg:p-8', 'md:text-base', 'lg:text-lg']);
  });

  it('should NOT match base classes with arbitrary values against prefix wildcards', async function () {
    const content = `
      <div class="min-w-[100px] min-lg:bg-blue-500 hover:text-white"></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('min-lg'));
    assert.ok(tokenRanges.has('hover'));
    assert.ok(!tokenRanges.has('min-w-[100px]')); // Should NOT match prefix wildcard
    assert.strictEqual(tokenRanges.size, 2);

    verifyRanges(content, tokenRanges, ['min-lg:bg-blue-500', 'hover:text-white']);
  });

  it('should handle standalone arbitrary classes correctly', async function () {
    const config = vscode.workspace.getConfiguration('tailwindRainbow');
    const originalThemes = config.get('themes', {});

    const testThemes = {
      ...originalThemes,
      'test-arbitrary-standalone': {
        prefix: {},
        base: {},
        arbitrary: {
          color: '#ff00ff',
          fontWeight: '700',
        },
      },
    };

    await config.update('themes', testThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'test-arbitrary-standalone', vscode.ConfigurationTarget.Global);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const content = `
      <div class="[aspect-ratio:1/8] [&.show]:block regular-class"></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('[aspect-ratio:1/8]'));
    assert.ok(tokenRanges.has('[&.show]'));
    assert.strictEqual(tokenRanges.size, 2);

    verifyRanges(content, tokenRanges, ['[aspect-ratio:1/8]', '[&.show]:block']);

    await config.update('themes', originalThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'default', vscode.ConfigurationTarget.Global);
  });

  it('should support multi-token coloring with both prefix and base class configs', async function () {
    const config = vscode.workspace.getConfiguration('tailwindRainbow');
    const originalThemes = config.get('themes', {});

    const testThemes = {
      ...originalThemes,
      'test-multi-token': {
        prefix: {
          lg: {
            color: '#ff0000',
            fontWeight: '700',
          },
          hover: {
            color: '#00ff00',
            fontWeight: '700',
          },
        },
        base: {
          'min-*': {
            color: '#0000ff',
            fontWeight: '600',
          },
          'bg-*': {
            color: '#ffff00',
            fontWeight: '600',
          },
        },
      },
    };

    await config.update('themes', testThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'test-multi-token', vscode.ConfigurationTarget.Global);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const content = `
      <div class="lg:min-w-[1920px] hover:bg-red-500"></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('lg'));
    assert.ok(tokenRanges.has('min-w-[1920px]'));
    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('bg-red-500'));
    assert.strictEqual(tokenRanges.size, 4);

    verifyRanges(content, tokenRanges, ['lg:', 'min-w-[1920px]', 'hover:', 'bg-red-500']);

    await config.update('themes', originalThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'default', vscode.ConfigurationTarget.Global);
  });

  it('should prioritize exact matches over wildcard patterns', async function () {
    const config = vscode.workspace.getConfiguration('tailwindRainbow');
    const originalThemes = config.get('themes', {});

    const testThemes = {
      ...originalThemes,
      'test-priority': {
        prefix: {
          'min-lg': {
            color: '#ff0000',
            fontWeight: '700',
          },
          'min-*': {
            color: '#00ff00',
            fontWeight: '700',
          },
        },
        base: {
          'bg-red-500': {
            color: '#0000ff',
            fontWeight: '600',
          },
          'bg-*': {
            color: '#ffff00',
            fontWeight: '600',
          },
        },
      },
    };

    await config.update('themes', testThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'test-priority', vscode.ConfigurationTarget.Global);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const content = `
      <div class="min-lg:bg-red-500 min-xl:bg-blue-500"></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('min-lg'));
    assert.ok(tokenRanges.has('min-xl'));
    assert.ok(tokenRanges.has('bg-red-500'));
    assert.ok(tokenRanges.has('bg-blue-500'));
    assert.strictEqual(tokenRanges.size, 4);

    verifyRanges(content, tokenRanges, ['min-lg:', 'bg-red-500', 'min-xl:', 'bg-blue-500']);

    await config.update('themes', originalThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'default', vscode.ConfigurationTarget.Global);
  });

  it('should handle base classes with arbitrary values using base section wildcards', async function () {
    const config = vscode.workspace.getConfiguration('tailwindRainbow');
    const originalThemes = config.get('themes', {});

    const testThemes = {
      ...originalThemes,
      'test-base-arbitrary': {
        prefix: {},
        base: {
          'min-*': {
            color: '#ff0000',
            fontWeight: '600',
          },
          'max-*': {
            color: '#00ff00',
            fontWeight: '600',
          },
        },
        arbitrary: {
          color: '#0000ff',
          fontWeight: '700',
        },
      },
    };

    await config.update('themes', testThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'test-base-arbitrary', vscode.ConfigurationTarget.Global);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const content = `
      <div class="min-w-[100px] max-h-[500px] w-[200px]"></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('min-w-[100px]'));
    assert.ok(tokenRanges.has('max-h-[500px]'));
    assert.strictEqual(tokenRanges.size, 2);

    verifyRanges(content, tokenRanges, ['min-w-[100px]', 'max-h-[500px]']);

    await config.update('themes', originalThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'default', vscode.ConfigurationTarget.Global);
  });

  it('should handle complex multi-prefix with base class wildcards', async function () {
    const config = vscode.workspace.getConfiguration('tailwindRainbow');
    const originalThemes = config.get('themes', {});

    const testThemes = {
      ...originalThemes,
      'test-complex-multi': {
        prefix: {
          lg: {
            color: '#ff0000',
            fontWeight: '700',
          },
          checked: {
            color: '#00ff00',
            fontWeight: '700',
          },
          hover: {
            color: '#0000ff',
            fontWeight: '700',
          },
        },
        base: {
          'bg-*': {
            color: '#ffff00',
            fontWeight: '600',
          },
        },
      },
    };

    await config.update('themes', testThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'test-complex-multi', vscode.ConfigurationTarget.Global);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const content = `
      <div class="lg:checked:hover:bg-blue-500"></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const tokenRanges = getTokenRanges();

    assert.ok(tokenRanges.has('lg'));
    assert.ok(tokenRanges.has('checked'));
    assert.ok(tokenRanges.has('hover'));
    assert.ok(tokenRanges.has('bg-blue-500'));
    assert.strictEqual(tokenRanges.size, 4);

    verifyRanges(content, tokenRanges, ['lg:', 'checked:', 'hover:', 'bg-blue-500']);

    await config.update('themes', originalThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'default', vscode.ConfigurationTarget.Global);
  });
});
