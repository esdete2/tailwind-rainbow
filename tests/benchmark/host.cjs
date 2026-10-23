const fs = require('node:fs/promises');
const vscode = require('vscode');

exports.run = async () => {
  const { benchmark } = await import('./measure.mjs');
  const report = await benchmark({
    api: vscode,
    runner: 'vscode-extension-host',
    async createEditor(content, language) {
      const document = await vscode.workspace.openTextDocument({ content, language });
      return vscode.window.showTextDocument(document);
    },
  });
  await fs.writeFile(process.env.RAINBOW_BENCHMARK_OUTPUT, JSON.stringify(report, null, 2) + '\n');
};
