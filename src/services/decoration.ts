import * as vscode from 'vscode';

/**
 * Manages VS Code text decorations for Tailwind tokens (prefixes and base classes)
 * Handles creation, updating, and cleanup of decorations
 */
export class DecorationService {
  private decorationTypes = new Map<string, vscode.TextEditorDecorationType>();

  /**
   * Cleans up all existing decorations
   * Should be called when changing themes or closing files
   */
  clearDecorations() {
    this.decorationTypes.forEach((type) => type.dispose());
    this.decorationTypes.clear();
  }

  /**
   * Gets or creates a decoration type for a token
   * @param token The Tailwind token (prefix or base class) to create decoration for
   * @param config The styling configuration for the token
   * @returns TextEditorDecorationType for the token
   */
  getDecorationForToken(token: string, config: ClassConfig): vscode.TextEditorDecorationType {
    if (!this.decorationTypes.has(token)) {
      this.decorationTypes.set(
        token,
        vscode.window.createTextEditorDecorationType({
          color: config.color,
          fontWeight: config.fontWeight,
        })
      );
    }
    return this.decorationTypes.get(token)!;
  }

  /**
   * Updates decorations in the editor based on found token ranges
   * @param editor The VS Code text editor to update
   * @param tokenRangeMap Map of token to their ranges and configs in the document
   */
  updateDecorations(
    editor: vscode.TextEditor,
    tokenRangeMap: Map<string, { ranges: vscode.Range[]; config: ClassConfig }>
  ) {
    if (!editor) {
      return;
    }

    // Clear existing decorations
    this.decorationTypes.forEach((type) => editor.setDecorations(type, []));

    // Apply new decorations using the config from the tokenizer
    tokenRangeMap.forEach((rangeData, token) => {
      const { ranges, config } = rangeData;
      // console.log('[updateDecorations] token:', token, 'config:', config, 'ranges:', ranges); // Keep for debugging
      if (config && config.enabled !== false) {
        const decorationType = this.getDecorationForToken(token, config);
        editor.setDecorations(decorationType, ranges);
      }
    });
  }
}
