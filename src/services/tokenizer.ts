import * as vscode from 'vscode';

import { getThemeConfigForPrefix } from './utils';

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
  private classIdentifiers: string[] = [];
  private classFunctions: string[] = [];
  private templatePatterns: string[] = [];
  private contextPatterns: string[] = [];

  constructor() {
    this.loadConfiguration();
  }

  /**
   * Loads configuration from VS Code workspace settings
   */
  private loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration('tailwindRainbow');

    this.classIdentifiers = config.get<string[]>('classIdentifiers', [
      'class',
      'className',
      'class:',
      'className:',
      'classlist',
      'classes',
      'css',
      'style',
    ]);

    this.classFunctions = config.get<string[]>('classFunctions', [
      'cn',
      'clsx',
      'cva',
      'classNames',
      'classList',
      'classnames',
      'twMerge',
      'tw',
      'cls',
      'cc',
      'cx',
      'classname',
      'styled',
      'css',
      'theme',
      'variants',
    ]);

    this.templatePatterns = config.get<string[]>('templatePatterns', ['class', '${', 'tw`', 'css`', 'styled']);

    this.contextPatterns = config.get<string[]>('contextPatterns', ['variants', 'cva', 'class', 'css', 'style']);
  }

  /**
   * Reloads configuration when workspace settings change
   */
  public reloadConfiguration(): void {
    this.loadConfiguration();
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
   * Checks if a string token is likely to contain class names
   * @param text Document text
   * @param token String token to check
   * @returns True if the token is likely to contain class names
   */
  private isClassContext(text: string, token: Token): boolean {
    const beforeToken = text.slice(Math.max(0, token.start - 100), token.start);
    const afterToken = text.slice(token.end, Math.min(text.length, token.end + 50));

    // Process template literals as they commonly contain dynamic class expressions
    if (token.type === 'template') {
      return true;
    }

    // Check for prefix patterns using fast string methods
    if (token.content.includes(':')) {
      // Identify prefix patterns by detecting colons within class names
      const colonIndex = token.content.indexOf(':');
      if (colonIndex > 0 && colonIndex < token.content.length - 1) {
        return true;
      }
    }

    // Check for dash-separated patterns common in Tailwind CSS
    if (token.content.includes('-')) {
      return true;
    }

    // Check for class attributes using configurable identifiers
    const beforeLower = beforeToken.toLowerCase();

    for (const identifier of this.classIdentifiers) {
      if (
        beforeLower.includes(identifier.toLowerCase() + '=') ||
        beforeLower.includes(identifier.toLowerCase() + ':')
      ) {
        return true;
      }
    }

    // Check for class utility functions using configurable list
    for (const func of this.classFunctions) {
      if (beforeToken.includes(func + '(')) {
        return true;
      }
    }

    // Check for template literals using configurable patterns
    if (token.quote === '`') {
      for (const pattern of this.templatePatterns) {
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
      const extendedBefore = text.slice(Math.max(0, token.start - 300), token.start);

      // Detect utility function calls
      for (const func of this.classFunctions) {
        if (extendedBefore.includes(func + '(')) {
          return true;
        }
      }

      // Match context patterns using configurable identifiers
      for (const pattern of this.contextPatterns) {
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

      // Detect comments using helper method
      if (char === '/' && i + 1 < length) {
        const nextChar = text[i + 1];
        if (nextChar === '/') {
          // C-style line comment - find end of line
          let endPos = i + 2;
          while (endPos < length && text[endPos] !== '\n' && text[endPos] !== '\r') {
            endPos++;
          }
          tokens.push({
            type: 'comment',
            content: text.slice(i, endPos),
            start: i,
            end: endPos,
          });
          i = endPos;
          continue;
        } else if (nextChar === '*') {
          // C-style block comment
          const result = this.parseComment(text, i, '/*', '*/');
          tokens.push(result.token);
          i = result.endPos;
          continue;
        }
      } else if (char === '#') {
        // Shell-style line comment - find end of line
        let endPos = i + 1;
        while (endPos < length && text[endPos] !== '\n' && text[endPos] !== '\r') {
          endPos++;
        }
        tokens.push({
          type: 'comment',
          content: text.slice(i, endPos),
          start: i,
          end: endPos,
        });
        i = endPos;
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
          i++;

          // Find closing quote, handling escapes
          while (i < length) {
            if (text[i] === '\\' && i + 1 < length) {
              i += 2; // Skip escaped character
            } else if (text[i] === quote) {
              i++;
              break;
            } else {
              i++;
            }
          }

          const content = text.slice(start + 1, i - 1);
          tokens.push({
            type: 'template',
            content,
            start: start + 1,
            end: i - 1,
            quote,
          });
          continue;
        }

        // Analyze context for regular string literals
        const beforeQuote = text.slice(Math.max(0, i - 100), i).trim();
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
          i++;

          // Find closing quote, handling escapes
          while (i < length) {
            if (text[i] === '\\' && i + 1 < length) {
              i += 2; // Skip escaped character
            } else if (text[i] === quote) {
              i++;
              break;
            } else {
              i++;
            }
          }

          const content = text.slice(start + 1, i - 1);
          tokens.push({
            type: 'string',
            content,
            start: start + 1,
            end: i - 1,
            quote,
          });
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
   * Checks if a word looks like a valid Tailwind class candidate
   * @param word The word to check
   * @returns True if it could be a valid class
   */
  private isValidClassCandidate(word: string): boolean {
    // Avoid HTML fragments and other non-class content
    if (word.length === 0 || word.length > 200) {
      return false;
    }

    // For arbitrary values, be very permissive
    if (word.includes('[') && word.includes(']')) {
      return !word.includes(' ') && !word.includes('\t') && !word.includes('\n');
    }

    // Reject obvious non-class content
    if (
      word.startsWith('//') ||
      word.startsWith('/*') ||
      word.includes('*/') ||
      word.includes('-->') ||
      word.includes('<') ||
      word.includes('>')
    ) {
      return false;
    }

    // For regular classes, use stricter validation
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const code = char.charCodeAt(0);

      if (
        !(
          (code >= 48 && code <= 57) ||
          (code >= 65 && code <= 90) ||
          (code >= 97 && code <= 122) ||
          char === '-' ||
          char === '_' ||
          char === ':' ||
          char === '/' ||
          char === '.' ||
          char === '#' ||
          char === '!' ||
          char === '%' ||
          char === '*'
        )
      ) {
        return false;
      }
    }

    // Don't allow quotes in regular classes
    return !word.includes('"') && !word.includes("'");
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
    if (content.length > 5000) {
      return classTokens;
    }

    // If no colons, do a quick validation to avoid processing non-class content
    if (!content.includes(':')) {
      if (content.length > 100 && !content.includes('-') && !content.includes('[')) {
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

        if (word && this.isValidClassCandidate(word)) {
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

    // Generate class attribute patterns from configuration
    const classPatterns = this.classIdentifiers.map((id) => id.toLowerCase() + '=');

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
          const valueStart = quoteStart + 1;

          // Find the closing quote
          let valueEnd = valueStart;
          while (valueEnd < content.length && content[valueEnd] !== quote) {
            if (content[valueEnd] === '\\' && valueEnd + 1 < content.length) {
              valueEnd += 2;
            } else {
              valueEnd++;
            }
          }

          if (valueEnd < content.length) {
            const classValue = content.slice(valueStart, valueEnd);
            const nestedTokens = this.processClassContent(classValue, startOffset + valueStart, activeTheme);
            classTokens.push(...nestedTokens);
          }
        }

        searchIndex = patternIndex + 1;
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

      // Try wildcard pattern for bracket prefixes
      if (!prefixConfig && prefix.includes('[') && prefix.includes(']')) {
        // Extract the base prefix
        const basePrefix = prefix.split('-')[0];
        const wildcardKey = `${basePrefix}-*`;
        prefixConfig = getThemeConfigForPrefix(activeTheme, wildcardKey);
        if (prefixConfig) {
          themeKey = wildcardKey;
        }
      }
    }

    return { config: prefixConfig, themeKey };
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
      const afterImportant = classPart.slice(1);
      if (afterImportant.startsWith(':') || afterImportant.endsWith(':')) {
        return tokens;
      }

      const config = getThemeConfigForPrefix(activeTheme, 'important');

      if (config && config.enabled !== false) {
        tokens.push({
          type: 'important',
          content: '!',
          start: startOffset,
          end: startOffset + 1,
          themeKey: 'important',
          rangeKey: 'important',
          config: config,
        });
      }
      currentPos = 1;
    }

    const remainingClass = classPart.slice(currentPos);

    // Split by colons to get prefixes and main class
    const parts = this.splitClassByColons(remainingClass);

    const fullClass = classPart.slice(currentPos);

    if (parts.length === 1) {
      // No prefixes
      const className = parts[0];
      let themeKey: string;
      let rangeKey: string;

      if (className.includes('[') && className.includes(']')) {
        themeKey = 'arbitrary';
        rangeKey = className;
      } else {
        themeKey = className;
        rangeKey = className;
      }

      // For standalone classes, check base and arbitrary sections
      let config: ClassConfig | null = null;

      if (className.includes('[') && className.includes(']')) {
        config = activeTheme.arbitrary || null;
        themeKey = 'arbitrary';
      } else {
        // Regular class - check for exact match first
        config = activeTheme.base?.[className] || null;

        // Check for base wildcard patterns
        if (!config && activeTheme.base) {
          for (const [pattern, patternConfig] of Object.entries(activeTheme.base)) {
            if (pattern.endsWith('-*')) {
              const basePattern = pattern.slice(0, -2);
              if (className.startsWith(basePattern + '-')) {
                config = patternConfig;
                break;
              }
            }
          }
        }
      }

      if (config && config.enabled !== false) {
        tokens.push({
          type: 'class',
          content: fullClass,
          start: startOffset + currentPos,
          end: startOffset + classPart.length,
          themeKey: themeKey,
          rangeKey: rangeKey,
          config: config,
        });
      }
    } else {
      // Has prefixes
      const prefixes = parts.slice(0, -1);
      const baseClass = parts[parts.length - 1];

      // Determine if this is a true multi-prefix case or a single prefix with arbitrary value
      // Multi-prefix: dark:sm:hover:text-blue-500 (multiple semantic prefixes)
      // Single prefix + arbitrary: before:content-['test'] (one prefix + base class with arbitrary value)

      const hasArbitraryValue = baseClass.includes('[') && baseClass.includes(']');
      const isMultiPrefix = prefixes.length > 1 && !hasArbitraryValue;

      if (isMultiPrefix) {
        // Multi-prefix case: color each prefix individually
        let currentPrefixStart = currentPos;

        for (let i = 0; i < prefixes.length; i++) {
          const prefix = prefixes[i];
          const prefixResult = this.getPrefixConfig(activeTheme, prefix);
          const prefixConfig = prefixResult.config;
          const actualThemeKey = prefixResult.themeKey;

          if (prefixConfig && prefixConfig.enabled !== false) {
            // For multi-prefix case, include the colon after each prefix
            // For the last prefix, include the base class as well
            let prefixEnd: number;
            if (i === prefixes.length - 1) {
              // Last prefix: include the base class
              prefixEnd = currentPos + classPart.length;
            } else {
              // Intermediate prefix: include just the prefix and colon
              prefixEnd = currentPrefixStart + prefix.length + 1;
            }

            tokens.push({
              type: 'class',
              content: fullClass,
              start: startOffset + currentPrefixStart,
              end: startOffset + prefixEnd,
              themeKey: actualThemeKey,
              rangeKey: prefix,
              config: prefixConfig,
            });
          }

          // Move to next prefix position (add 1 for the colon)
          currentPrefixStart += prefix.length + 1;
        }
      } else {
        // Single prefix case: color the entire class with the prefix color
        for (const prefix of prefixes) {
          const prefixResult = this.getPrefixConfig(activeTheme, prefix);
          const prefixConfig = prefixResult.config;
          const actualThemeKey = prefixResult.themeKey;

          if (prefixConfig && prefixConfig.enabled !== false) {
            tokens.push({
              type: 'class',
              content: fullClass,
              start: startOffset + currentPos,
              end: startOffset + classPart.length,
              themeKey: actualThemeKey,
              rangeKey: prefix,
              config: prefixConfig,
            });
          }
        }
      }

      // Try base class if no valid prefixes found
      if (tokens.length === 0) {
        const baseConfig = getThemeConfigForPrefix(activeTheme, baseClass);
        if (baseConfig && baseConfig.enabled !== false) {
          tokens.push({
            type: 'class',
            content: fullClass,
            start: startOffset + currentPos,
            end: startOffset + classPart.length,
            themeKey: baseClass,
            rangeKey: baseClass,
            config: baseConfig,
          });
        }
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
      let contentStart = applyIndex + 6; // '@apply'.length
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

      searchStart = contentEnd + 1;
    }

    return classTokens;
  }

  /**
   * Main method to find all class tokens in a document
   * @param editor VS Code text editor
   * @param activeTheme Current theme configuration
   * @returns Map of theme keys to their ranges
   */
  findClassRanges(editor: vscode.TextEditor, activeTheme: Theme): Map<string, vscode.Range[]> {
    const text = editor.document.getText();

    // Early termination for very large files
    const config = vscode.workspace.getConfiguration('tailwindRainbow');
    const maxFileSize = config.get<number>('maxFileSize', 1_000_000);

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

    // Sort tokens by start position
    allClassTokens.sort((a, b) => a.start - b.start);

    // Group tokens by range key and convert to VS Code ranges
    const rangeMap = new Map<string, vscode.Range[]>();

    for (const classToken of allClassTokens) {
      if (classToken.rangeKey && classToken.config) {
        const mapKey = classToken.rangeKey;
        if (!rangeMap.has(mapKey)) {
          rangeMap.set(mapKey, []);
        }

        const startPos = editor.document.positionAt(classToken.start);
        const endPos = editor.document.positionAt(classToken.end);
        const newRange = new vscode.Range(startPos, endPos);

        const existingRanges = rangeMap.get(mapKey)!;

        const hasOverlap = existingRanges.some((existingRange) => newRange.intersection(existingRange) !== undefined);

        if (!hasOverlap) {
          existingRanges.push(newRange);
        }
      }
    }

    return rangeMap;
  }
}
