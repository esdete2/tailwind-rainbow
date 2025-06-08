import * as vscode from 'vscode';

import { ConfigurationManager } from './config';
import { getThemeConfigForBaseClass, getThemeConfigForPrefix } from './utils';

// =============================================================================
// CONSTANTS
// =============================================================================

const PERFORMANCE_CONSTANTS = {
  MAX_FILE_SIZE: 1_000_000,
  MAX_CONTENT_LENGTH: 5_000,
  CONTENT_VALIDATION_THRESHOLD: 100,
  CONTEXT_WINDOW_SIZE: 100,
  AFTER_TOKEN_CONTEXT_SIZE: 50,
  EXTENDED_CONTEXT_SIZE: 300,
  APPLY_DIRECTIVE_LENGTH: 6, // '@apply'.length
  COMMENT_SKIP_LENGTH: 2, // for '//' and similar
  SINGLE_CHAR_SKIP: 1,
  ESCAPE_CHAR_SKIP: 2, // for '\' + next char
} as const;

/**
 * Represents a token found during document parsing
 */
export interface Token {
  type: 'string' | 'template' | 'comment' | 'other';
  content: string;
  start: number;
  end: number;
  quote?: string; // For string tokens: ', ", `
}

/**
 * Represents a processed class token with theme information
 */
export interface ClassToken {
  type: 'prefix' | 'class' | 'important';
  content: string;
  start: number;
  end: number;
  themeKey?: string;
  rangeKey?: string; // Key used for range mapping (may differ from themeKey)
  config?: ClassConfig;
}

/**
 * High-performance tokenizer service for parsing documents and finding Tailwind CSS classes
 * Uses string-based parsing for optimal performance and configurable pattern matching
 */
export class TokenizerService {
  private configManager: ConfigurationManager;

  constructor() {
    this.configManager = ConfigurationManager.getInstance();
  }

  /**
   * Helper method to parse comment blocks
   * @param text Document text
   * @param start Start position
   * @param startPattern Pattern that starts the comment
   * @param endPattern Pattern that ends the comment
   * @returns Object with end position and token
   */
  private parseComment(
    text: string,
    start: number,
    startPattern: string,
    endPattern: string
  ): { endPos: number; token: Token } {
    let i = start + startPattern.length;
    const endIndex = text.indexOf(endPattern, i);

    if (endIndex !== -1) {
      i = endIndex + endPattern.length;
    } else {
      i = text.length;
    }

    return {
      endPos: i,
      token: {
        type: 'comment',
        content: text.slice(start, i),
        start,
        end: i,
      },
    };
  }

  /**
   * Helper method to parse line comments (// or #)
   * @param text Document text
   * @param start Start position
   * @returns Object with end position and token
   */
  private parseLineComment(text: string, start: number): { endPos: number; token: Token } {
    let endPos = start + PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP;
    while (endPos < text.length && text[endPos] !== '\n' && text[endPos] !== '\r') {
      endPos++;
    }

    return {
      endPos,
      token: {
        type: 'comment',
        content: text.slice(start, endPos),
        start,
        end: endPos,
      },
    };
  }

  /**
   * Helper method to parse string literals with quote handling
   * @param text Document text
   * @param start Start position
   * @param quote Quote character
   * @returns Object with end position and content
   */
  private parseStringLiteral(text: string, start: number, quote: string): { endPos: number; content: string } {
    let i = start + PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP;

    while (i < text.length) {
      if (text[i] === '\\' && i + PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP < text.length) {
        i += PERFORMANCE_CONSTANTS.ESCAPE_CHAR_SKIP; // Skip escaped character
      } else if (text[i] === quote) {
        i++;
        break;
      } else {
        i++;
      }
    }

    const content = text.slice(
      start + PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP,
      i - PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP
    );

    return { endPos: i, content };
  }

  /**
   * Checks if a string token is likely to contain class names
   * @param text Document text
   * @param token String token to check
   * @returns True if the token is likely to contain class names
   */
  private isClassContext(text: string, token: Token): boolean {
    const beforeToken = text.slice(Math.max(0, token.start - PERFORMANCE_CONSTANTS.CONTEXT_WINDOW_SIZE), token.start);
    const afterToken = text.slice(
      token.end,
      Math.min(text.length, token.end + PERFORMANCE_CONSTANTS.AFTER_TOKEN_CONTEXT_SIZE)
    );

    // Process template literals as they commonly contain dynamic class expressions
    if (token.type === 'template') {
      return true;
    }

    // Check for prefix patterns using fast string methods
    if (token.content.includes(':')) {
      // Identify prefix patterns by detecting colons within class names
      const colonIndex = token.content.indexOf(':');
      if (colonIndex > 0 && colonIndex < token.content.length - PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP) {
        return true;
      }
    }

    // Check for dash-separated patterns common in Tailwind CSS
    if (token.content.includes('-')) {
      return true;
    }

    // Check for class attributes using configurable identifiers
    const beforeLower = beforeToken.toLowerCase();
    const lowerCaseIdentifiers = this.configManager.getLowerCaseClassIdentifiers();

    for (const identifier of lowerCaseIdentifiers) {
      if (beforeLower.includes(identifier + '=') || beforeLower.includes(identifier + ':')) {
        return true;
      }
    }

    // Check for class utility functions using cached set for fast lookup
    const classFunctionsSet = this.configManager.getClassFunctionsSet();
    // Extract function names from beforeToken and check against set
    const functionMatches = beforeToken.match(/\b(\w+)\s*\(/g);
    if (functionMatches) {
      for (const match of functionMatches) {
        const funcName = match.slice(0, -1).trim(); // Remove '(' and whitespace
        if (classFunctionsSet.has(funcName)) {
          return true;
        }
      }
    }

    // Check for template literals using cached patterns
    if (token.quote === '`') {
      const templatePatterns = this.configManager.getTemplatePatterns();
      for (const pattern of templatePatterns) {
        if (beforeToken.includes(pattern)) {
          return true;
        }
      }
    }

    // Check for array/object contexts using string methods
    const trimmedBefore = beforeToken.trim();
    if (
      trimmedBefore.endsWith('[') ||
      trimmedBefore.endsWith('{') ||
      trimmedBefore.endsWith(',') ||
      trimmedBefore.endsWith(':')
    ) {
      // Check for class-related context patterns in extended scope
      const extendedBefore = text.slice(
        Math.max(0, token.start - PERFORMANCE_CONSTANTS.EXTENDED_CONTEXT_SIZE),
        token.start
      );

      // Detect utility function calls using cached set
      const classFunctionsSet = this.configManager.getClassFunctionsSet();
      const functionMatches = extendedBefore.match(/\b(\w+)\s*\(/g);
      if (functionMatches) {
        for (const match of functionMatches) {
          const funcName = match.slice(0, -1).trim();
          if (classFunctionsSet.has(funcName)) {
            return true;
          }
        }
      }

      // Match context patterns using cached identifiers
      const contextPatterns = this.configManager.getContextPatterns();
      for (const pattern of contextPatterns) {
        if (extendedBefore.includes(pattern)) {
          return true;
        }
      }
    }

    // Detect malformed HTML class attributes
    const combinedContext = beforeToken + token.content + afterToken;
    if (combinedContext.includes('class=') && (combinedContext.includes('"') || combinedContext.includes("'"))) {
      return true;
    }

    return false;
  }

  /**
   * Tokenizes a document to find all potential class locations
   * @param text Document text to parse
   * @returns Array of tokens containing potential classes
   */
  tokenizeDocument(text: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const length = text.length;

    while (i < length) {
      const char = text[i];

      // Detect comments using helper methods
      if (char === '/' && i + PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP < length) {
        const nextChar = text[i + PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP];
        if (nextChar === '/') {
          // C-style line comment
          const result = this.parseLineComment(text, i);
          tokens.push(result.token);
          i = result.endPos;
          continue;
        } else if (nextChar === '*') {
          // C-style block comment
          const result = this.parseComment(text, i, '/*', '*/');
          tokens.push(result.token);
          i = result.endPos;
          continue;
        }
      } else if (char === '#') {
        // Shell-style line comment
        const result = this.parseLineComment(text, i);
        tokens.push(result.token);
        i = result.endPos;
        continue;
      } else if (char === '<' && text.startsWith('<!--', i)) {
        // HTML comment block
        const result = this.parseComment(text, i, '<!--', '-->');
        tokens.push(result.token);
        i = result.endPos;
        continue;
      } else if (char === '{' && text.startsWith('{/*', i)) {
        // JSX comment block
        const result = this.parseComment(text, i, '{/*', '*/}');
        tokens.push(result.token);
        i = result.endPos;
        continue;
      }

      // Handle string literals with all quote types
      if (char === '"' || char === "'" || char === '`') {
        const quote = char;
        const start = i;

        // Process template literals for dynamic class expressions
        if (quote === '`') {
          const parseResult = this.parseStringLiteral(text, start, quote);
          tokens.push({
            type: 'template',
            content: parseResult.content,
            start: start + PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP,
            end: parseResult.endPos - PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP,
            quote,
          });
          i = parseResult.endPos;
          continue;
        }

        // Analyze context for regular string literals
        const beforeQuote = text.slice(Math.max(0, i - PERFORMANCE_CONSTANTS.CONTEXT_WINDOW_SIZE), i).trim();
        const hasAttributeContext =
          beforeQuote.endsWith('=') ||
          beforeQuote.endsWith('={') ||
          beforeQuote.endsWith('(') ||
          beforeQuote.endsWith(',') ||
          beforeQuote.endsWith('[') ||
          beforeQuote.endsWith('{') ||
          beforeQuote.endsWith(':');

        // Only process strings in attribute or function contexts
        if (hasAttributeContext) {
          const parseResult = this.parseStringLiteral(text, start, quote);
          tokens.push({
            type: 'string',
            content: parseResult.content,
            start: start + PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP,
            end: parseResult.endPos - PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP,
            quote,
          });
          i = parseResult.endPos;
          continue;
        } else {
          i++;
          continue;
        }
      }

      i++;
    }

    return tokens;
  }

  /**
   * Processes class tokens from string/template content (optimized)
   * @param content String content to process
   * @param startOffset Offset in the document
   * @param activeTheme Current theme configuration
   * @returns Array of class tokens with theme information
   */
  processClassContent(content: string, startOffset: number, activeTheme: Theme): ClassToken[] {
    const classTokens: ClassToken[] = [];

    // Early return for very large content
    if (content.length > PERFORMANCE_CONSTANTS.MAX_CONTENT_LENGTH) {
      return classTokens;
    }

    // If no colons, do a quick validation to avoid processing non-class content
    if (!content.includes(':')) {
      if (
        content.length > PERFORMANCE_CONSTANTS.CONTENT_VALIDATION_THRESHOLD &&
        !content.includes('-') &&
        !content.includes('[')
      ) {
        return classTokens;
      }
    }

    // Track positions and handle HTML content
    let wordStart = -1;
    let bracketDepth = 0;

    for (let i = 0; i <= content.length; i++) {
      const char = content[i];

      if (char === '[') {
        bracketDepth++;
      } else if (char === ']') {
        bracketDepth--;
      }

      const isWhitespace = !char || char === ' ' || char === '\t' || char === '\n' || char === '\r';
      const isHtmlChar = char && bracketDepth === 0 && (char === '<' || char === '>' || char === '{' || char === '}');

      if (!isWhitespace && !isHtmlChar && wordStart === -1) {
        wordStart = i;
      } else if ((isWhitespace || isHtmlChar) && wordStart !== -1) {
        const word = content.slice(wordStart, i).trim();

        if (word && word.length > 0) {
          const partTokens = this.processClassPart(word, startOffset + wordStart, activeTheme);
          classTokens.push(...partTokens);
        }
        wordStart = -1;

        if (isHtmlChar) {
          break;
        }
      }
    }

    return classTokens;
  }

  /**
   * Processes template literal content to find class attributes within HTML
   * @param content Template literal content
   * @param startOffset Starting offset in document
   * @param activeTheme Current theme configuration
   * @returns Array of class tokens
   */
  private processTemplateContent(content: string, startOffset: number, activeTheme: Theme): ClassToken[] {
    const classTokens: ClassToken[] = [];

    // Look for class attributes using configurable patterns
    const lowerContent = content.toLowerCase();

    // Generate class attribute patterns from cached configuration
    const lowerCaseIdentifiers = this.configManager.getLowerCaseClassIdentifiers();
    const classPatterns = lowerCaseIdentifiers.map((id) => id + '=');

    for (const pattern of classPatterns) {
      let searchIndex = 0;
      while (true) {
        const patternIndex = lowerContent.indexOf(pattern, searchIndex);
        if (patternIndex === -1) break;

        // Find the opening quote
        let quoteStart = patternIndex + pattern.length;
        while (
          quoteStart < content.length &&
          (content[quoteStart] === ' ' ||
            content[quoteStart] === '\t' ||
            content[quoteStart] === '\n' ||
            content[quoteStart] === '\r')
        ) {
          quoteStart++;
        }

        if (quoteStart < content.length && (content[quoteStart] === '"' || content[quoteStart] === "'")) {
          const quote = content[quoteStart];
          const valueStart = quoteStart + PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP;

          // Find the closing quote using helper method
          const parseResult = this.parseStringLiteral(content, quoteStart, quote);
          const valueEnd = parseResult.endPos - PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP;

          if (valueEnd >= valueStart) {
            const nestedTokens = this.processClassContent(parseResult.content, startOffset + valueStart, activeTheme);
            classTokens.push(...nestedTokens);
          }
        }

        searchIndex = patternIndex + PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP;
      }
    }

    // If no class attributes found, but content looks like it might be just class names
    // (common in template literals like `hover:bg-blue-500 lg:text-xl`)
    if (classTokens.length === 0 && !content.includes('<')) {
      const directTokens = this.processClassContent(content, startOffset, activeTheme);
      classTokens.push(...directTokens);
    }

    return classTokens;
  }

  /**
   * Gets the appropriate configuration for a prefix
   * @param activeTheme Current theme configuration
   * @param prefix The prefix to get config for
   * @returns Object containing config and theme key
   */
  private getPrefixConfig(activeTheme: Theme, prefix: string): { config: ClassConfig | null; themeKey: string } {
    let prefixConfig: ClassConfig | null = null;
    let themeKey = prefix;

    // Check if this is an arbitrary prefix
    if (prefix.startsWith('[') && prefix.endsWith(']')) {
      const arbitraryConfig = getThemeConfigForPrefix(activeTheme, 'arbitrary');
      if (arbitraryConfig && arbitraryConfig.enabled !== false) {
        prefixConfig = arbitraryConfig;
        themeKey = 'arbitrary';
      }
    } else {
      // Regular prefix or wildcard prefix
      prefixConfig = getThemeConfigForPrefix(activeTheme, prefix);
    }

    return { config: prefixConfig, themeKey };
  }

  /**
   * Gets the appropriate configuration for a base class
   * @param activeTheme Current theme configuration
   * @param prefix The base class to get config for
   * @returns Object containing config and theme key
   */
  private getBaseClassConfig(activeTheme: Theme, baseClass: string): { config: ClassConfig | null; themeKey: string } {
    let baseClassConfig: ClassConfig | null = null;
    let themeKey = baseClass;

    // Check if this is an arbitrary base class
    if (baseClass.startsWith('[') && baseClass.endsWith(']')) {
      const arbitraryConfig = getThemeConfigForBaseClass(activeTheme, 'arbitrary');
      if (arbitraryConfig && arbitraryConfig.enabled !== false) {
        baseClassConfig = arbitraryConfig;
        themeKey = 'arbitrary';
      }
    } else {
      // Regular or wildcard base class
      baseClassConfig = getThemeConfigForBaseClass(activeTheme, baseClass);
    }

    return { config: baseClassConfig, themeKey };
  }

  /**
   * Splits a class string by colons while respecting brackets
   * @param classString The class string to split
   * @returns Array of parts split by colons (respecting brackets)
   */
  private splitClassByColons(classString: string): string[] {
    const parts: string[] = [];
    let currentPart = '';
    let bracketDepth = 0;

    for (let i = 0; i < classString.length; i++) {
      const char = classString[i];

      if (char === '[') {
        bracketDepth++;
        currentPart += char;
      } else if (char === ']') {
        bracketDepth--;
        currentPart += char;
      } else if (char === ':' && bracketDepth === 0) {
        parts.push(currentPart);
        currentPart = '';
      } else {
        currentPart += char;
      }
    }

    if (currentPart) {
      parts.push(currentPart);
    }

    return parts;
  }

  /**
   * Processes a single class part (e.g., "!sm:hover:w-full")
   * @param classPart Class string to process
   * @param startOffset Starting position in document
   * @param activeTheme Current theme configuration
   * @returns Array of class tokens
   */
  private processClassPart(classPart: string, startOffset: number, activeTheme: Theme): ClassToken[] {
    const tokens: ClassToken[] = [];
    let currentPos = 0;

    // Skip classes that start or end with colons
    if (classPart.startsWith(':') || classPart.endsWith(':')) {
      return tokens;
    }

    // Handle important flag
    if (classPart.startsWith('!')) {
      const afterImportant = classPart.slice(PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP);
      if (afterImportant.startsWith(':') || afterImportant.endsWith(':')) {
        return tokens;
      }

      const config = getThemeConfigForPrefix(activeTheme, 'important');

      if (config && config.enabled !== false) {
        tokens.push({
          type: 'important',
          content: '!',
          start: startOffset,
          end: startOffset + PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP,
          themeKey: 'important',
          rangeKey: 'important',
          config: config,
        });
      }
      currentPos = PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP;
    }

    const remainingClass = classPart.slice(currentPos);

    // Split by colons to get prefixes and main class
    const parts = this.splitClassByColons(remainingClass);

    if (parts.length === 1) {
      // For standalone classes, check base section only
      const baseClassResult = this.getBaseClassConfig(activeTheme, remainingClass);
      const baseClassConfig = baseClassResult.config;
      const baseClassThemeKey = baseClassResult.themeKey;

      if (baseClassConfig && baseClassConfig.enabled !== false) {
        tokens.push({
          type: 'class',
          content: remainingClass,
          start: startOffset + currentPos,
          end: startOffset + classPart.length,
          themeKey: baseClassThemeKey,
          rangeKey: remainingClass,
          config: baseClassConfig,
        });
      }
    } else {
      // Has prefixes
      const prefixes = parts.slice(0, -1);
      const baseClass = parts[parts.length - 1];

      let currentPrefixStart = currentPos;

      const baseClassResult = this.getBaseClassConfig(activeTheme, baseClass);
      const baseClassConfig = baseClassResult.config;
      const baseClassThemeKey = baseClassResult.themeKey;

      for (let i = 0; i < prefixes.length; i++) {
        const prefix = prefixes[i];
        const prefixResult = this.getPrefixConfig(activeTheme, prefix);
        const prefixConfig = prefixResult.config;
        const prefixThemeKey = prefixResult.themeKey;

        if (prefixConfig && prefixConfig.enabled !== false) {
          let prefixEnd: number;

          if (i < prefixes.length - 1 || (baseClassConfig && baseClassConfig.enabled !== false)) {
            // Intermediate prefix: include just the prefix and colon
            prefixEnd = currentPrefixStart + prefix.length + PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP;
          } else {
            // Last prefix and no base class config: include the base class
            prefixEnd = currentPos + classPart.length;
          }

          tokens.push({
            type: 'class',
            content: remainingClass,
            start: startOffset + currentPrefixStart,
            end: startOffset + prefixEnd,
            themeKey: prefixThemeKey,
            rangeKey: prefix,
            config: prefixConfig,
          });
        }

        // Move to next prefix position (add 1 for the colon)
        currentPrefixStart += prefix.length + PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP;
      }

      if (baseClassConfig && baseClassConfig.enabled !== false) {
        // Find where the base class starts in the full class
        let baseClassStart = currentPos;
        for (const prefix of prefixes) {
          baseClassStart += prefix.length + PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP; // +1 for colon
        }

        tokens.push({
          type: 'class',
          content: remainingClass,
          start: startOffset + baseClassStart,
          end: startOffset + classPart.length,
          themeKey: baseClassThemeKey,
          rangeKey: baseClass,
          config: baseClassConfig,
        });
      }
    }

    return tokens;
  }

  /**
   * Processes @apply directives in CSS-like content using fast string operations
   * @param text Document text
   * @param activeTheme Current theme configuration
   * @returns Array of class tokens from @apply directives
   */
  private processApplyDirectives(text: string, activeTheme: Theme): ClassToken[] {
    const classTokens: ClassToken[] = [];
    let searchStart = 0;

    while (true) {
      const applyIndex = text.indexOf('@apply', searchStart);
      if (applyIndex === -1) break;

      // Find the start of class content (skip whitespace after @apply)
      let contentStart = applyIndex + PERFORMANCE_CONSTANTS.APPLY_DIRECTIVE_LENGTH;
      while (contentStart < text.length && /\s/.test(text[contentStart])) {
        contentStart++;
      }

      // Find the end of the directive (semicolon, closing brace, or newline)
      let contentEnd = contentStart;
      while (contentEnd < text.length) {
        const char = text[contentEnd];
        if (char === ';' || char === '}' || char === '\n' || char === '\r') {
          break;
        }
        contentEnd++;
      }

      const classesContent = text.slice(contentStart, contentEnd).trim();
      if (classesContent) {
        const tokens = this.processClassContent(classesContent, contentStart, activeTheme);
        classTokens.push(...tokens);
      }

      searchStart = contentEnd + PERFORMANCE_CONSTANTS.SINGLE_CHAR_SKIP;
    }

    return classTokens;
  }

  /**
   * Main method to find all class tokens in a document
   * @param editor VS Code text editor
   * @param activeTheme Current theme configuration
   * @returns Map of theme keys to their ranges and configs
   */
  findClassRanges(
    editor: vscode.TextEditor,
    activeTheme: Theme
  ): Map<string, { ranges: vscode.Range[]; config: ClassConfig }> {
    const text = editor.document.getText();

    // Early termination for very large files
    const maxFileSize = this.configManager.getMaxFileSize();

    if (text.length > maxFileSize) {
      console.warn(
        `Tailwind Rainbow: File too large (${text.length} bytes > ${maxFileSize} bytes), skipping tokenization to prevent performance issues`
      );
      return new Map();
    }

    const allClassTokens: ClassToken[] = [];

    // Check if this is a CSS-like file that might contain @apply directives
    const languageId = editor.document.languageId;
    const cssLikeLanguages = ['css', 'scss', 'sass', 'less', 'stylus', 'postcss'];

    if (cssLikeLanguages.includes(languageId)) {
      // For CSS-like files, also process @apply directives
      const applyTokens = this.processApplyDirectives(text, activeTheme);
      allClassTokens.push(...applyTokens);
    }

    const tokens = this.tokenizeDocument(text);

    for (const token of tokens) {
      if (token.type === 'string' || token.type === 'template') {
        if (this.isClassContext(text, token)) {
          if (token.type === 'template') {
            const classTokens = this.processTemplateContent(token.content, token.start, activeTheme);
            allClassTokens.push(...classTokens);
          } else {
            const classTokens = this.processClassContent(token.content, token.start, activeTheme);
            allClassTokens.push(...classTokens);
          }
        }
      }
    }

    // Group tokens by range key and convert to VS Code ranges with config
    const rangeMap = new Map<string, { ranges: vscode.Range[]; config: ClassConfig }>();

    for (const classToken of allClassTokens) {
      if (classToken.rangeKey && classToken.config) {
        const mapKey = classToken.rangeKey;
        if (!rangeMap.has(mapKey)) {
          rangeMap.set(mapKey, { ranges: [], config: classToken.config });
        }

        const startPos = editor.document.positionAt(classToken.start);
        const endPos = editor.document.positionAt(classToken.end);
        const newRange = new vscode.Range(startPos, endPos);

        const existingEntry = rangeMap.get(mapKey)!;

        const hasOverlap = existingEntry.ranges.some(
          (existingRange) => newRange.intersection(existingRange) !== undefined
        );

        if (!hasOverlap) {
          existingEntry.ranges.push(newRange);
        }
      }
    }

    return rangeMap;
  }
}
