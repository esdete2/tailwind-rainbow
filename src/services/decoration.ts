import * as vscode from 'vscode';

import { getThemeConfigForPrefix } from './utils';

/**
 * Manages VS Code text decorations for Tailwind prefixes
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
   * Gets or creates a decoration type for a prefix
   * @param prefix The Tailwind prefix to create decoration for
   * @param config The styling configuration for the prefix
   * @returns TextEditorDecorationType for the prefix
   */
  getDecorationForPrefix(prefix: string, config: ClassConfig): vscode.TextEditorDecorationType {
    if (!this.decorationTypes.has(prefix)) {
      this.decorationTypes.set(
        prefix,
        vscode.window.createTextEditorDecorationType({
          color: config.color,
          fontWeight: config.fontWeight,
        })
      );
    }
    return this.decorationTypes.get(prefix)!;
  }

  /**
   * Updates decorations in the editor based on found prefix ranges
   * @param editor The VS Code text editor to update
   * @param prefixRanges Map of prefix to their ranges in the document
   * @param activeTheme Current theme configuration for prefix styling
   */
  updateDecorations(editor: vscode.TextEditor, prefixRanges: Map<string, vscode.Range[]>, activeTheme: Theme) {
    if (!editor) {
      return;
    }

    // Clear existing decorations
    this.decorationTypes.forEach((type) => editor.setDecorations(type, []));

    // Apply new decorations
    prefixRanges.forEach((ranges, prefix) => {
      const config = getThemeConfigForPrefix(activeTheme, prefix);
      // console.log('[updateDecorations] prefix:', prefix, 'config:', config, 'ranges:', ranges); // Keep for debugging
      if (config && config.enabled !== false) {
        const decorationType = this.getDecorationForPrefix(prefix, config);
        editor.setDecorations(decorationType, ranges);
      }
    });
  }
}
