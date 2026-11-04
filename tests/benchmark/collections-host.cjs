const vscode = require('vscode');

exports.run = async () => {
  const { benchmarkCollections } = await import('./collections.mjs');
  await benchmarkCollections({
    api: vscode,
    runner: 'vscode-extension-host',
    directory: process.env.RAINBOW_COLLECTION_OUTPUT,
    async createEditor(content, language) {
      const document = await vscode.workspace.openTextDocument({ content, language });
      return vscode.window.showTextDocument(document);
    },
  });
};
