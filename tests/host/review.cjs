const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { setTimeout: delay } = require('node:timers/promises');
const vscode = require('vscode');
const { TokenizerService } = require('../../out/services/tokenizer.js');
const { ExtensionService } = require('../../out/services/extension.js');
const { ThemeService } = require('../../out/services/theme.js');
const { defaultTheme } = require('../../out/themes/default.js');
const { ConfigurationManager } = require('../../out/services/config.js');

exports.run = async () => {
  const results = [];
  const config = vscode.workspace.getConfiguration('tailwindRainbow');
  const originals = Object.fromEntries(
    ['enabled', 'theme', 'themes', 'mode', 'collections'].map((key) => [key, config.inspect(key)?.globalValue])
  );
  const update = (key, value) => config.update(key, value, vscode.ConfigurationTarget.Global);
  const tokenizer = new TokenizerService();
  let service;
  try {
    await update('enabled', true);
    await update('theme', 'default');
    await update('themes', {});
    await update('mode', 'class');
    await update('collections', {});
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

    const collectionTheme = {
      ...defaultTheme,
      collections: {
        spacing: { color: '#112233' },
        buttons: { color: '#445566' },
        layout: { color: '#778899' },
        effects: { color: '#AABBCC' },
      },
    };
    for (const [name, mode, definitions, value, activeTheme, expected] of [
      [
        'prefix mode',
        'prefix',
        {},
        'sm:hover:!p-4',
        defaultTheme,
        [
          ['sm', 'sm:', 0, 3],
          ['hover', 'hover:', 3, 9],
          ['important', '!', 9, 10],
        ],
      ],
      [
        'prefix collection styling',
        'prefix',
        {},
        'hover:p-(--gap)!',
        collectionTheme,
        [
          ['hover', 'hover:', 0, 6],
          ['collection:spacing', 'p-(--gap)', 6, 15],
          ['important', '!', 15, 16],
        ],
      ],
      [
        'v3 important collection styling',
        'prefix',
        {},
        'hover:!p-4',
        collectionTheme,
        [
          ['hover', 'hover:', 0, 6],
          ['important', '!', 6, 7],
          ['collection:spacing', 'p-4', 7, 10],
        ],
      ],
      [
        'custom collection',
        'prefix',
        { buttons: ['btn', 'btn-*'] },
        'hover:btn-primary',
        collectionTheme,
        [
          ['hover', 'hover:', 0, 6],
          ['collection:buttons', 'btn-primary', 6, 17],
        ],
      ],
      [
        'collection replacement',
        'prefix',
        { spacing: ['px-*'] },
        'p-4 px-2',
        collectionTheme,
        [['collection:spacing', 'px-2', 4, 8]],
      ],
      ['empty collection', 'prefix', { spacing: [] }, 'p-4', collectionTheme, []],
      ['default display category', 'prefix', {}, 'flex', collectionTheme, [['collection:layout', 'flex', 0, 4]]],
      [
        'predefined category boundary',
        'prefix',
        {},
        'text-shadow-sm',
        collectionTheme,
        [['collection:effects', 'text-shadow-sm', 0, 14]],
      ],
      [
        'explicit base priority',
        'prefix',
        {},
        'p-4',
        { ...collectionTheme, base: { 'p-*': { color: '#123456' } } },
        [['p-4', 'p-4', 0, 3]],
      ],
      ['restored class mode', 'class', {}, 'hover:p-4', defaultTheme, [['hover', 'hover:p-4', 0, 9]]],
    ]) {
      await update('mode', mode);
      await update('collections', definitions);
      ConfigurationManager.getInstance().reloadConfiguration();
      const source = `😀\r\n<div class='${value}'></div>`;
      const offset = source.indexOf(value);
      const document = await vscode.workspace.openTextDocument({ content: source, language: 'html' });
      const editor = await vscode.window.showTextDocument(document);
      const actual = [...tokenizer.findClassRanges(editor, activeTheme)]
        .flatMap(([key, entry]) =>
          entry.ranges.map((range) => [
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
    await update('mode', 'class');
    await update('collections', {});
    ConfigurationManager.getInstance().reloadConfiguration();

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
    const registered = { prefix: { hover: { color: '#112233' } }, collections: { spacing: { color: '#112233' } } };
    themes.registerTheme('review-external', registered);
    await update('theme', 'review-external');
    await update('themes', {
      'review-external': { prefix: { hover: { color: '#445566' } }, collections: { spacing: { color: '#445566' } } },
    });
    themes.updateActiveTheme();
    assert.equal(themes.getCurrentTheme().prefix.hover.color, '#445566');
    assert.equal(themes.getCurrentTheme().collections.spacing.color, '#445566');
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
