import * as vscode from 'vscode';

import { OutputService } from './output';
import { getThemeConfigForPrefix } from './utils';

/**
 * Service for finding and matching Tailwind class patterns in text
 */
export class PatternService {
  private outputService = OutputService.getInstance();

  /**
   * Finds ranges for all Tailwind prefixes in the given editor content
   * @param editor The VS Code text editor to analyze
   * @param patterns Regex patterns to match class names
   * @param activeTheme Current theme configuration for prefix styling
   * @returns Map of prefix to their ranges in the document
   */
  findPrefixRanges(
    editor: vscode.TextEditor,
    patterns: Record<string, RegexPattern>,
    activeTheme: Theme
  ): Map<string, vscode.Range[]> {
    // Return empty Map if no editor, since we can't find any prefix ranges without an editor
    if (!editor) {
      return new Map();
    }

    const text = editor.document.getText();
    const prefixRanges = new Map<string, vscode.Range[]>();

    // Process each pattern
    Object.entries(patterns).forEach(([, pattern]) => {
      if (pattern.enabled) {
        this.findMatchesForPattern(text, pattern, activeTheme, prefixRanges, editor);
      }
    });

    return prefixRanges;
  }

  /**
   * Finds all matches for a given pattern in the text and processes them
   * @param text The text to search
   * @param pattern The regex pattern to match
   * @param activeTheme The active theme configuration
   * @param prefixRanges The map to store the found ranges
   * @param editor The VS Code text editor
   */
  private findMatchesForPattern(
    text: string,
    pattern: RegexPattern,
    activeTheme: Theme,
    prefixRanges: Map<string, vscode.Range[]>,
    editor: vscode.TextEditor
  ) {
    const regex = new RegExp(pattern.regex, 'g');
    let match: RegExpExecArray | null;

    // Find all matches in the text
    while ((match = regex.exec(text)) !== null) {
      const stringContent = match[0];
      if (stringContent) {
        this.processClassNames(stringContent, match.index, match[0], activeTheme, prefixRanges, editor);
      }
    }
  }

  /**
   * Processes the matched string by splitting it into individual class names
   * @param stringContent The matched string content
   * @param matchStart The starting index of the match
   * @param matchText The full matched text
   * @param activeTheme The active theme configuration
   * @param prefixRanges The map to store the found ranges
   * @param editor The VS Code text editor
   */
  private processClassNames(
    stringContent: string,
    matchStart: number,
    matchText: string,
    activeTheme: Theme,
    prefixRanges: Map<string, vscode.Range[]>,
    editor: vscode.TextEditor
  ) {
    // Split into individual class names
    const classNames = stringContent.split(' ');

    for (const className of classNames) {
      // Skip classes starting or ending with a colon
      if (!className.startsWith(':') && !className.endsWith(':')) {
        this.processPrefix(className, matchStart, matchText, activeTheme, prefixRanges, editor);
      }
    }
  }

  /**
   * Processes each individual prefix within a class name
   * @param className The full class name
   * @param matchStart The starting index of the match
   * @param matchText The full matched text
   * @param activeTheme The active theme configuration
   * @param prefixRanges The map to store the found ranges
   * @param editor The VS Code text editor
   */
  private processPrefix(
    className: string,
    matchStart: number,
    matchText: string,
    activeTheme: Theme,
    prefixRanges: Map<string, vscode.Range[]>,
    editor: vscode.TextEditor
  ) {
    const parts = className.split(':');
    if (parts.length > 1) {
      let prefixes = parts.slice(0, -1);
      let currentPos = 0;

      prefixes.forEach((prefix, index) => {
        const config = getThemeConfigForPrefix(activeTheme, prefix);

        this.outputService.debug(`Trying prefix: ${prefix}, config: ${config ? 'found' : 'not found'}`);

        if (config && config.enabled !== false) {
          const prefixStart = className.indexOf(prefix, currentPos);
          currentPos = prefixStart + prefix.length;

          // Find end position - either next enabled prefix or end of class
          let endPos;
          const nextEnabledPrefix = prefixes.slice(index + 1).find((p) => {
            const config = getThemeConfigForPrefix(activeTheme, p);
            return config !== null && config.enabled !== false;
          });

          if (nextEnabledPrefix) {
            // Color until next enabled prefix
            endPos = editor.document.positionAt(
              matchStart + matchText.indexOf(className) + className.indexOf(nextEnabledPrefix, prefixStart)
            );
          } else {
            // Color until end of class
            endPos = editor.document.positionAt(matchStart + matchText.indexOf(className) + className.length);
          }

          const startPos = editor.document.positionAt(matchStart + matchText.indexOf(className) + prefixStart);
          const range = new vscode.Range(startPos, endPos);

          if (!prefixRanges.has(prefix)) {
            prefixRanges.set(prefix, []);
          }
          prefixRanges.get(prefix)!.push(range);
        }
      });
    }
  }
}
