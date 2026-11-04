const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { setTimeout: delay } = require('node:timers/promises');
const vscode = require('vscode');
const { TokenizerService } = require('../../out/services/tokenizer.js');
const { ExtensionService } = require('../../out/services/extension.js');
const { ThemeService } = require('../../out/services/theme.js');
const { defaultTheme } = require('../../out/themes/default.js');

exports.run = async () => {
  const results = [];
  const config = vscode.workspace.getConfiguration('tailwindRainbow');
  const originals = Object.fromEntries(
    ['enabled', 'theme', 'themes'].map((key) => [key, config.inspect(key)?.globalValue])
  );
  const update = (key, value) => config.update(key, value, vscode.ConfigurationTarget.Global);
  const tokenizer = new TokenizerService();
  let service;
  try {
    await update('enabled', true);
    await update('theme', 'default');
    await update('themes', {});
    for (const [name, content, language, expected] of [
      ['ordinary string', 'const message = "hover:hello-world";', 'typescript', []],
      ['ordinary template', 'const message = `hover:hello-world`;', 'typescript', []],
      ['CSS block comment', '/* @apply hover:flex; */', 'css', []],
      ['SCSS line comment', '// @apply hover:flex;', 'scss', []],
      ['leading important compatibility', '<div class="!hover:flex"></div>', 'html', ['!', 'hover:flex']],
      ['utility collection', 'const value = cn([condition && "hover:flex"]);', 'typescript', ['hover:flex']],
    ]) {
      const document = await vscode.workspace.openTextDocument({ content, language });
      const editor = await vscode.window.showTextDocument(document);
      const fragments = [...tokenizer.findClassRanges(editor, defaultTheme).values()]
        .flatMap(({ ranges }) => ranges)
        .sort((a, b) => document.offsetAt(a.start) - document.offsetAt(b.start))
        .map((range) => document.getText(range));
      assert.deepEqual(fragments, expected, name);
      results.push(name);
    }

    const styledBase = { ...defaultTheme, base: { flex: {}, 'text-*': {} } };
    for (const [name, value, theme, expected] of [
      [
        'v3 important placement',
        'hover:!flex',
        styledBase,
        [
          ['hover', 'hover:', 0, 6],
          ['important', '!', 6, 7],
          ['flex', 'flex', 7, 11],
        ],
      ],
      [
        'v4 important placement',
        'hover:flex!',
        styledBase,
        [
          ['hover', 'hover:', 0, 6],
          ['flex', 'flex', 6, 10],
          ['important', '!', 10, 11],
        ],
      ],
      [
        'v3 important fallback',
        'hover:!flex',
        defaultTheme,
        [
          ['hover', 'hover:', 0, 6],
          ['important', '!', 6, 7],
          ['hover', 'flex', 7, 11],
        ],
      ],
      [
        'v4 important fallback',
        'hover:flex!',
        defaultTheme,
        [
          ['hover', 'hover:flex', 0, 10],
          ['important', '!', 10, 11],
        ],
      ],
      [
        'typed variable value',
        'hover:text-(length:--size)!',
        styledBase,
        [
          ['hover', 'hover:', 0, 6],
          ['text-(length:--size)', 'text-(length:--size)', 6, 26],
          ['important', '!', 26, 27],
        ],
      ],
      [
        'protected literal important',
        '[content:"!"]!',
        defaultTheme,
        [
          ['[content:"!"]', '[content:"!"]', 0, 13],
          ['important', '!', 13, 14],
        ],
      ],
    ]) {
      const content = `😀\r\n<div class='${value}'></div>`;
      const offset = content.indexOf(value);
      const document = await vscode.workspace.openTextDocument({ content, language: 'html' });
      const editor = await vscode.window.showTextDocument(document);
      const actual = [...tokenizer.findClassRanges(editor, theme)]
        .flatMap(([key, { ranges }]) =>
          ranges.map((range) => [
            key,
            document.getText(range),
            document.offsetAt(range.start) - offset,
            document.offsetAt(range.end) - offset,
          ])
        )
        .sort((a, b) => a[2] - b[2] || a[3] - b[3]);
      assert.deepEqual(actual, expected, name);
      results.push(name);
    }

    const document = await vscode.workspace.openTextDocument({
      content: '<div class="hover:flex"></div>',
      language: 'html',
    });
    await vscode.window.showTextDocument(document);
    assert.equal(document.isUntitled, true);
    service = new ExtensionService();
    const decorations = service.decorationService;
    const apply = decorations.updateDecorations.bind(decorations);
    const clear = decorations.clearDecorations.bind(decorations);
    let count = 0;
    decorations.updateDecorations = (editor, map) => {
      count = [...map.values()].reduce((sum, value) => sum + value.ranges.length, 0);
      apply(editor, map);
    };
    decorations.clearDecorations = () => {
      count = 0;
      clear();
    };
    const awaitCount = async (predicate) => {
      const deadline = Date.now() + 2000;
      while (!predicate(count) && Date.now() < deadline) await delay(20);
      assert.ok(predicate(count), `Unexpected applied range count: ${count}`);
    };
    service.initialize();
    await awaitCount((value) => value > 0);
    results.push('untitled decorations');
    // Invoke the coordinator after actual settings changes; event wiring is covered by unit tests.
    await update('enabled', false);
    service.initialize();
    await awaitCount((value) => value === 0);
    results.push('disabled decorations');
    await update('enabled', true);
    service.initialize();
    await awaitCount((value) => value > 0);
    results.push('re-enabled decorations');

    const themes = new ThemeService();
    const registered = { prefix: { hover: { color: '#112233' } } };
    themes.registerTheme('review-external', registered);
    await update('theme', 'review-external');
    await update('themes', { 'review-external': { prefix: { hover: { color: '#445566' } } } });
    themes.updateActiveTheme();
    assert.equal(themes.getCurrentTheme().prefix.hover.color, '#445566');
    await update('themes', {});
    themes.updateActiveTheme();
    assert.deepEqual(themes.getCurrentTheme(), registered);
    results.push('registered theme and override removal');
    const report = { vscode: vscode.version, node: process.version, results, passed: results.length };
    await fs.writeFile(process.env.RAINBOW_REVIEW_OUTPUT, JSON.stringify(report, null, 2) + '\n');
    console.log(`Passed ${results.length} real-host correctness checks`);
  } finally {
    service?.dispose();
    service?.decorationService.clearDecorations();
    for (const [key, value] of Object.entries(originals)) await update(key, value);
  }
};
