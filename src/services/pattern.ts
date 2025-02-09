import * as vscode from 'vscode';

import { OutputService } from './output';

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
    activeTheme: Record<string, PrefixConfig>
  ): Map<string, vscode.Range[]> {
    // Return empty Map if no editor, since we can't find any prefix ranges without an editor
    if (!editor) {
      return new Map();
    }

    const text = editor.document.getText();
    const prefixRanges = new Map<string, vscode.Range[]>();

    const getPrefixConfig = (prefix: string) => {
      if (activeTheme[prefix]) {
        return activeTheme[prefix];
      }

      if (prefix.includes('/')) {
        const basePrefix = prefix.split('/')[0];
        this.outputService.debug(`Trying without arbitrary value: ${basePrefix}`);

        // Use the base prefix for storing the range if we found a match
        if (activeTheme[basePrefix]) {
          return activeTheme[basePrefix];
        }
      }

      return null;
    };

    // Process each pattern
    Object.entries(patterns).forEach(([, pattern]) => {
      if (!pattern.enabled) {
        return;
      }

      const regex = new RegExp(pattern.regex, 'g');
      let match: RegExpExecArray | null;

      // Find all matches in the text
      while ((match = regex.exec(text)) !== null) {
        // console.log("[findPrefixRanges] match:", match); // Keep for debugging
        const stringContent = match[0];
        if (!stringContent) {
          continue;
        }

        // Split into individual class names
        const classNames = stringContent.split(' ');
        for (const className of classNames) {
          const matchStart = match.index;
          const matchText = match[0];

          // Skip classes starting or ending with a colon
          if (className.startsWith(':') || className.endsWith(':')) {
            continue;
          }

          const parts = className.split(':');
          if (parts.length > 1) {
            const prefixes = parts.slice(0, -1);
            let currentPos = 0;

            prefixes.forEach((prefix, index) => {
              const config = getPrefixConfig(prefix);

              this.outputService.debug(`Trying prefix: ${prefix}, config: ${config ? 'found' : 'not found'}`);

              if (config && config.enabled !== false) {
                const prefixStart = className.indexOf(prefix, currentPos);
                currentPos = prefixStart + prefix.length;

                // Find end position - either next enabled prefix or end of class
                let endPos;

                const nextEnabledPrefix = prefixes.slice(index + 1).find((p) => {
                  const config = getPrefixConfig(p);
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
    });

    return prefixRanges;
  }
}
