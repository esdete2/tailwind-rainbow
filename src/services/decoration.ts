import * as vscode from 'vscode';

export class DecorationService {
  private decorationTypes = new Map<string, vscode.TextEditorDecorationType>();

  clearDecorations() {
    this.decorationTypes.forEach(type => type.dispose());
    this.decorationTypes.clear();
  }

  private getDecorationForPrefix(prefix: string, config: PrefixConfig): vscode.TextEditorDecorationType {
    if (!this.decorationTypes.has(prefix)) {
      this.decorationTypes.set(
        prefix,
        vscode.window.createTextEditorDecorationType({
          color: config.color,
          fontWeight: config.fontWeight
        })
      );
    }
    return this.decorationTypes.get(prefix)!;
  }

  updateDecorations(editor: vscode.TextEditor, prefixRanges: Map<string, vscode.Range[]>, activeTheme: Record<string, PrefixConfig>) {
    if (!editor) { return; }

    // Clear existing decorations
    this.decorationTypes.forEach(type => editor.setDecorations(type, []));

    // Apply all decorations at once
    prefixRanges.forEach((ranges, prefix) => {
      const config = activeTheme[prefix];
      if (config && config.enabled !== false) {
        const decorationType = this.getDecorationForPrefix(prefix, config);
        editor.setDecorations(decorationType, ranges);
      }
    });
  }
} 