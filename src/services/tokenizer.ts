import type * as vscode from 'vscode';

import { ConfigurationManager } from './config';
import { parseClassContent } from './tokenizer/classes';
import { findApplyRegions, findTemplateRegions, isClassContext } from './tokenizer/context';
import { scanDocument } from './tokenizer/document';
import { assembleRanges } from './tokenizer/ranges';
import type { ClassToken, Token } from './tokenizer/types';

export type { ClassToken, Token } from './tokenizer/types';

/** Coordinate configuration, lexical discovery, themed class parsing and editor range assembly. */
export class TokenizerService {
  private configManager: ConfigurationManager;

  constructor() {
    this.configManager = ConfigurationManager.getInstance();
  }

  /** Return lexical candidates with document-relative UTF-16 offsets. */
  tokenizeDocument(text: string): Token[] {
    return scanDocument(text);
  }

  processClassContent(content: string, startOffset: number, activeTheme: Theme): ClassToken[] {
    return parseClassContent(content, startOffset, activeTheme, this.configManager.getIgnoredPrefixModifiers());
  }

  private processTemplateContent(content: string, startOffset: number, activeTheme: Theme): ClassToken[] {
    const classTokens: ClassToken[] = [];
    const identifiers = this.configManager.getLowerCaseClassIdentifiers();
    for (const region of findTemplateRegions(content, startOffset, identifiers)) {
      classTokens.push(...this.processClassContent(region.content, region.start, activeTheme));
    }

    // Whole-template fallback depends on themed output, even when attribute regions were found.
    if (classTokens.length === 0 && !content.includes('<')) {
      classTokens.push(...this.processClassContent(content, startOffset, activeTheme));
    }
    return classTokens;
  }

  findClassRanges(
    editor: vscode.TextEditor,
    activeTheme: Theme
  ): Map<string, { ranges: vscode.Range[]; config: ClassConfig }> {
    const text = editor.document.getText();
    const maxFileSize = this.configManager.getMaxFileSize();
    if (text.length > maxFileSize) {
      console.warn(
        `Tailwind Rainbow: File too large (${text.length} bytes > ${maxFileSize} bytes), skipping tokenization to prevent performance issues`
      );
      return new Map();
    }

    const allClassTokens: ClassToken[] = [];
    for (const region of findApplyRegions(text, editor.document.languageId)) {
      allClassTokens.push(...this.processClassContent(region.content, region.start, activeTheme));
    }

    const tokens = this.tokenizeDocument(text);
    // Snapshot settings per document calculation; updates apply to the next calculation.
    const contextSettings = {
      classIdentifiers: this.configManager.getLowerCaseClassIdentifiers(),
      classFunctions: this.configManager.getClassFunctionsSet(),
      templatePatterns: this.configManager.getTemplatePatterns(),
      contextPatterns: this.configManager.getContextPatterns(),
    };

    for (const token of tokens) {
      if ((token.type === 'string' || token.type === 'template') && isClassContext(text, token, contextSettings)) {
        const classTokens =
          token.type === 'template'
            ? this.processTemplateContent(token.content, token.start, activeTheme)
            : this.processClassContent(token.content, token.start, activeTheme);
        allClassTokens.push(...classTokens);
      }
    }
    return assembleRanges(editor.document, allClassTokens);
  }
}
