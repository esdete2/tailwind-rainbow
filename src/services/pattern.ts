import * as vscode from 'vscode';
import { OutputService } from './output';

export class PatternService {
  findPrefixRanges(editor: vscode.TextEditor, patterns: Record<string, RegexPattern>, activeTheme: Record<string, PrefixConfig>): Map<string, vscode.Range[]> {
    // Return empty Map if no editor, since we can't find any prefix ranges without an editor
    if (!editor) { return new Map(); }

    const text = editor.document.getText();
    const prefixRanges = new Map<string, vscode.Range[]>();

    Object.entries(patterns).forEach(([name, pattern]) => {
      if (!pattern.enabled) { return; }

      const regex = new RegExp(pattern.regex, 'g');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const stringContent = match[2];
        if (!stringContent) { continue; }

        const classNames = stringContent.split(' ');
        for (const className of classNames) {
          const matchStart = match.index;
          const matchText = match[0];

          // Skip classes with double colons or ending with colon
          if (className.includes('::') || className.endsWith(':')) {
            continue;
          }

          const parts = className.split(':');
          if (parts.length > 1) {
            const prefixes = parts.slice(0, -1);
            let currentPos = 0;

            prefixes.forEach((prefix, index) => {
              const config = activeTheme[prefix];
              if (config && config.enabled !== false) {
                const prefixStart = className.indexOf(prefix, currentPos);
                currentPos = prefixStart + prefix.length + 1;

                // Find end position - either next enabled prefix or end of class
                let endPos;
                let nextEnabledPrefix = prefixes.slice(index + 1).find(p =>
                  activeTheme[p]?.enabled
                );

                if (nextEnabledPrefix) {
                  // Color until next enabled prefix
                  endPos = editor.document.positionAt(
                    matchStart + matchText.indexOf(className) +
                    className.indexOf(nextEnabledPrefix, currentPos)
                  );
                } else {
                  // Color until end of class
                  endPos = editor.document.positionAt(
                    matchStart + matchText.indexOf(className) + className.length
                  );
                }

                const startPos = editor.document.positionAt(
                  matchStart + matchText.indexOf(className) + prefixStart
                );

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