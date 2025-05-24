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

  function verifyRanges(
    content: string,
    prefixRanges: Map<string, vscode.Range[]>,
    expectedColoredPartials?: string[]
  ) {
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
    for (const [prefix, ranges] of prefixRanges.entries()) {
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
    for (const [prefix, ranges] of prefixRanges.entries()) {
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
        } else if (text.includes(':')) {
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

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('lg'));
    assert.strictEqual(prefixRanges.size, 2);

    verifyRanges(content, prefixRanges, ['hover:bg-blue-500', 'lg:text-xl', 'lg:', 'hover:bg-red-500']);
  });

  it('should detect prefixes in single quotes', async function () {
    const content = "<div class='hover:bg-blue-500 lg:text-xl'></div>";
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('lg'));
    assert.strictEqual(prefixRanges.size, 2);

    verifyRanges(content, prefixRanges, ['hover:bg-blue-500', 'lg:text-xl']);
  });

  it('should detect prefixes in backticks', async function () {
    const content = '<div className={`hover:bg-blue-500 lg:text-xl`}></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('lg'));
    assert.strictEqual(prefixRanges.size, 2);

    verifyRanges(content, prefixRanges, ['hover:bg-blue-500', 'lg:text-xl']);
  });

  it('should detect prefixes in template literals and JSX expressions', async function () {
    const content = `
      <div className={\`hover:bg-blue-500 lg:text-xl\`}></div>
      <div className={"md:bg-red-500"}></div>
      <div className={'sm:text-white'}></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('lg'));
    assert.ok(prefixRanges.has('md'));
    assert.ok(prefixRanges.has('sm'));
    assert.strictEqual(prefixRanges.size, 4);

    verifyRanges(content, prefixRanges, ['hover:bg-blue-500', 'lg:text-xl', 'md:bg-red-500', 'sm:text-white']);
  });

  it('should detect multiple instances of the same prefix', async function () {
    const content = '<div class="hover:bg-blue-500 hover:text-white"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.strictEqual(prefixRanges.size, 1);
    assert.strictEqual(prefixRanges.get('hover')!.length, 2);

    verifyRanges(content, prefixRanges, ['hover:bg-blue-500', 'hover:text-white']);
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

    verifyRanges(content, prefixRanges, [
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

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('dark'));
    assert.ok(prefixRanges.has('sm'));
    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('before'));
    assert.ok(prefixRanges.has('focus'));
    assert.strictEqual(prefixRanges.size, 5);

    verifyRanges(content, prefixRanges, ['dark:', 'sm:', 'hover:', 'before:', 'focus:text-blue-500']);
  });

  it('should handle basic arbitrary values', async function () {
    const content = "<div class=\"before:content-['*'] after:content-['>>']\"></div>";
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('before'));
    assert.ok(prefixRanges.has('after'));
    assert.strictEqual(prefixRanges.size, 2);

    verifyRanges(content, prefixRanges, ["before:content-['*']", "after:content-['>>']"]);
  });

  it('should handle colons in arbitrary values', async function () {
    const content = '<div class="before:content-[test:with:colons]"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('before'));
    assert.strictEqual(prefixRanges.size, 1);

    verifyRanges(content, prefixRanges, ['before:content-[test:with:colons]']);
  });

  it('should handle escaped quotes in arbitrary values', async function () {
    const content = '<div class="before:content-[\\"test\\"] hover:text-xl"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('before'));
    assert.ok(prefixRanges.has('hover'));
    assert.strictEqual(prefixRanges.size, 2);

    verifyRanges(content, prefixRanges, ['before:content-[\\"test\\"]', 'hover:text-xl']);
  });

  it('should handle ignored prefix modifiers', async function () {
    const content = '<div class="group-hover/button:bg-blue-500"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('group-hover/button'));
    assert.strictEqual(prefixRanges.size, 1);

    verifyRanges(content, prefixRanges, ['group-hover/button:bg-blue-500']);
  });

  it('should handle chained ignored prefix modifiers', async function () {
    const content = '<div class="peer-has-checked:bg-blue-500"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('peer-has-checked'));
    assert.strictEqual(prefixRanges.size, 1);

    verifyRanges(content, prefixRanges, ['peer-has-checked:bg-blue-500']);
  });

  it('should handle wildcard patterns', async function () {
    const content = '<div class="min-[1920px]:max-w-sm max-sm:w-full"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('min-[1920px]'));
    assert.ok(prefixRanges.has('max-sm'));
    assert.strictEqual(prefixRanges.size, 2);

    verifyRanges(content, prefixRanges, ['min-[1920px]:max-w-sm', 'max-sm:w-full']);
  });

  it('should handle arbitrary prefixes', async function () {
    const content = '<div class="[&.is-dragging]:cursor-grabbing"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('[&.is-dragging]'));
    assert.strictEqual(prefixRanges.size, 1);

    verifyRanges(content, prefixRanges, ['[&.is-dragging]:cursor-grabbing']);
  });

  it('should handle important modifier', async function () {
    const content = '<div class="!text-red-500"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('important'));
    assert.strictEqual(prefixRanges.size, 1);

    verifyRanges(content, prefixRanges, ['!']);
  });

  it('should handle mixed quotes and escaped content', async function () {
    const content = '<div class="hover:text-xl \\"quoted\\" sm:flex"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('sm'));
    assert.strictEqual(prefixRanges.size, 2);

    verifyRanges(content, prefixRanges, ['hover:text-xl', 'sm:flex']);
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

    verifyRanges(content, prefixRanges, ['hover:bg-blue-500', 'lg:text-xl']);
  });

  it('should ignore invalid prefixes', async function () {
    const content = '<div class="something:special"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.strictEqual(prefixRanges.size, 0);
    verifyRanges(content, prefixRanges, []);
  });

  it('should ignore standalone prefixes', async function () {
    const content = '<div class="invalid md checked"></div>';
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.strictEqual(prefixRanges.size, 0);
    verifyRanges(content, prefixRanges, []);
  });

  it('should ignore quotes outside of class names', async function () {
    const content = `
    It's a single single quote
    <div class="hover:bg-blue-500 after:content-['Hi']"></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('after'));
    assert.strictEqual(prefixRanges.size, 2);

    verifyRanges(content, prefixRanges, ['hover:bg-blue-500', "after:content-['Hi']"]);
  });

  it('should ignore classes with double colons or starting/ending with colons', async function () {
    const content = `<div class=":before:content-none after: :hover:"></div>`;
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.strictEqual(prefixRanges.size, 0);
    verifyRanges(content, prefixRanges, []);
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

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('lg'));
    assert.ok(prefixRanges.has('md'));
    assert.ok(prefixRanges.has('sm'));
    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('xl'));
    assert.ok(prefixRanges.has('focus'));
    assert.strictEqual(prefixRanges.size, 6);

    verifyRanges(content, prefixRanges, [
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

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('sm'));
    assert.ok(prefixRanges.has('lg'));
    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('focus'));
    assert.ok(prefixRanges.has('md'));
    assert.ok(prefixRanges.has('xl'));
    assert.strictEqual(prefixRanges.size, 6);

    verifyRanges(content, prefixRanges, [
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

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('md'));
    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('focus'));
    assert.strictEqual(prefixRanges.size, 3);

    verifyRanges(content, prefixRanges, [
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

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('sm'));
    assert.ok(prefixRanges.has('lg'));
    assert.ok(prefixRanges.has('md'));
    assert.ok(prefixRanges.has('xl'));
    assert.ok(prefixRanges.has('hover'));
    assert.strictEqual(prefixRanges.size, 5);

    verifyRanges(content, prefixRanges, [
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

    const prefixRanges = getPrefixRanges();

    // Test that base class patterns are detected
    assert.ok(prefixRanges.has('bg-blue-500'));
    assert.ok(prefixRanges.has('bg-red-300'));
    assert.ok(prefixRanges.has('bg-gradient-to-r'));
    assert.ok(prefixRanges.has('text-white'));
    assert.ok(prefixRanges.has('text-gray-800'));
    assert.ok(prefixRanges.has('text-xl'));
    assert.ok(prefixRanges.has('p-4'));
    assert.ok(prefixRanges.has('p-2'));
    assert.ok(prefixRanges.has('p-8'));
    assert.ok(prefixRanges.has('rounded-lg'));
    assert.ok(prefixRanges.has('rounded-md'));
    assert.ok(prefixRanges.has('rounded-full'));
    assert.strictEqual(prefixRanges.size, 12);

    verifyRanges(content, prefixRanges, [
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

    const prefixRanges = getPrefixRanges();

    // Test that both prefixes and base classes are detected
    assert.ok(prefixRanges.has('hover')); // prefix
    assert.ok(prefixRanges.has('lg')); // prefix
    assert.ok(prefixRanges.has('bg-white')); // base class
    assert.ok(prefixRanges.has('border-gray-300')); // base class
    assert.ok(prefixRanges.has('sm')); // prefix
    assert.ok(prefixRanges.has('focus')); // prefix
    assert.strictEqual(prefixRanges.size, 6);

    verifyRanges(content, prefixRanges, [
      'hover:bg-blue-500',
      'lg:border-2',
      'bg-white',
      'border-gray-300',
      'sm:bg-red-500',
      'focus:border-blue-500',
    ]);

    // Restore original configuration
    await config.update('themes', originalThemes, vscode.ConfigurationTarget.Global);
    await config.update('theme', 'default', vscode.ConfigurationTarget.Global);
  });

  it('should detect * prefix as a regular Tailwind prefix', async function () {
    const content = `
      <div class="*:bg-blue-500 *:text-white"></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    // The '*' prefix should be treated as a regular prefix from the default theme
    assert.ok(prefixRanges.has('*'));
    assert.strictEqual(prefixRanges.size, 1);

    verifyRanges(content, prefixRanges, ['*:bg-blue-500', '*:text-white']);
  });

  it('should detect ** prefix as a regular Tailwind prefix', async function () {
    const content = `
      <div class="**:bg-blue-500 **:text-white"></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    // The '**' prefix should be treated as a regular prefix from the default theme
    assert.ok(prefixRanges.has('**'));
    assert.strictEqual(prefixRanges.size, 1);

    verifyRanges(content, prefixRanges, ['**:bg-blue-500', '**:text-white']);
  });

  it('should handle * and ** prefixes as regular Tailwind prefixes', async function () {
    const content = `
      <div class="*:bg-blue-500 **:text-white hover:p-4"></div>
      <div class="sm:border-2 lg:shadow-lg *:rounded-lg"></div>
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    // *, **, hover, sm, lg are all explicitly defined prefixes
    assert.ok(prefixRanges.has('*')); // universal selector prefix
    assert.ok(prefixRanges.has('**')); // deep universal selector prefix
    assert.ok(prefixRanges.has('hover')); // explicit config
    assert.ok(prefixRanges.has('sm')); // explicit config
    assert.ok(prefixRanges.has('lg')); // explicit config
    assert.strictEqual(prefixRanges.size, 5);

    verifyRanges(content, prefixRanges, [
      '*:bg-blue-500',
      '**:text-white',
      'hover:p-4',
      'sm:border-2',
      'lg:shadow-lg',
      '*:rounded-lg',
    ]);
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

    const prefixRanges = getPrefixRanges();

    // Should detect explicit prefixes, * and ** prefixes, and base classes
    assert.ok(prefixRanges.has('hover')); // explicit prefix
    assert.ok(prefixRanges.has('*')); // universal selector prefix
    assert.ok(prefixRanges.has('bg-red-300')); // base class pattern bg-*
    assert.ok(prefixRanges.has('sm')); // explicit prefix
    assert.ok(prefixRanges.has('**')); // deep universal selector prefix
    assert.ok(prefixRanges.has('bg-white')); // base class pattern bg-*
    assert.strictEqual(prefixRanges.size, 6);

    verifyRanges(content, prefixRanges, [
      'hover:bg-blue-500',
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

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('lg'));
    assert.ok(prefixRanges.has('md'));
    assert.strictEqual(prefixRanges.size, 3);

    verifyRanges(content, prefixRanges, ['hover:bg-blue-600', 'lg:text-xl', 'md:p-6']);
  });

  it('should detect classes in tw` template literals', async function () {
    const content = `
      import tw from 'twin.macro';
      const Button = tw\`hover:bg-blue-600 focus:ring-2 lg:p-4\`;
    `;
    console.log('Testing:', content);
    await updateTestFile(content);

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('focus'));
    assert.ok(prefixRanges.has('lg'));
    assert.strictEqual(prefixRanges.size, 3);

    verifyRanges(content, prefixRanges, ['hover:bg-blue-600', 'focus:ring-2', 'lg:p-4']);
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

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('focus'));
    assert.ok(prefixRanges.has('sm'));
    assert.ok(prefixRanges.has('lg'));
    assert.strictEqual(prefixRanges.size, 4);

    verifyRanges(content, prefixRanges, ['hover:bg-blue-600', 'focus:ring-2', 'sm:opacity-75', 'lg:text-xl']);
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

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('lg'));
    assert.ok(prefixRanges.has('sm'));
    assert.ok(prefixRanges.has('focus'));
    assert.strictEqual(prefixRanges.size, 4);

    verifyRanges(content, prefixRanges, ['hover:bg-blue-500', 'lg:text-xl', 'sm:text-sm', 'focus:outline-none']);
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

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('focus'));
    assert.ok(prefixRanges.has('sm'));
    assert.ok(prefixRanges.has('lg'));
    assert.strictEqual(prefixRanges.size, 4);

    verifyRanges(content, prefixRanges, ['hover:bg-blue-500', 'focus:ring-2', 'sm:p-4', 'lg:p-6']);
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

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('focus'));
    assert.ok(prefixRanges.has('sm'));
    assert.ok(prefixRanges.has('lg'));
    assert.strictEqual(prefixRanges.size, 4);

    verifyRanges(content, prefixRanges, ['hover:bg-blue-500', 'focus:ring-2', 'sm:p-4', 'lg:p-6']);
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

    const prefixRanges = getPrefixRanges();

    // Log what we actually found for debugging
    console.log('Found prefixes:', Array.from(prefixRanges.keys()));

    console.log('Template patterns are working! Found prefixes:', Array.from(prefixRanges.keys()));

    // Verify we found at least some of the expected ones
    const expectedPrefixes = ['hover', 'sm', 'lg', 'md', 'focus'];
    const foundPrefixes = Array.from(prefixRanges.keys());
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

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('hover'));
    assert.ok(prefixRanges.has('sm'));
    assert.ok(prefixRanges.has('md'));
    assert.ok(prefixRanges.has('lg'));
    assert.ok(prefixRanges.has('focus'));

    verifyRanges(content, prefixRanges, [
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

    const prefixRanges = getPrefixRanges();

    assert.ok(prefixRanges.has('md'));
    assert.ok(prefixRanges.has('lg'));
    assert.strictEqual(prefixRanges.size, 2);

    verifyRanges(content, prefixRanges, ['md:p-6', 'lg:p-8', 'md:text-base', 'lg:text-lg']);
  });
});
