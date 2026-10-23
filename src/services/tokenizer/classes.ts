import { lookupPrefix, resolveBaseClass, resolvePrefix } from './theme';
import type { ClassToken } from './types';

const MAX_CONTENT_LENGTH = 5_000;
const CONTENT_VALIDATION_THRESHOLD = 100;

/** Parse themed fragments with document-relative UTF-16 offsets and explicit modifier settings. */
export function parseClassContent(
  content: string,
  startOffset: number,
  activeTheme: Theme,
  ignoredModifiers: readonly string[]
): ClassToken[] {
  const classTokens: ClassToken[] = [];
  if (content.length > MAX_CONTENT_LENGTH) {
    return classTokens;
  }
  if (!content.includes(':')) {
    if (content.length > CONTENT_VALIDATION_THRESHOLD && !content.includes('-') && !content.includes('[')) {
      return classTokens;
    }
  }
  // Whitespace ends words; bracket depth protects markup delimiters and variant colons.
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
        const partTokens = parseClass(word, startOffset + wordStart, activeTheme, ignoredModifiers);
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

/** Colons inside square brackets belong to selectors or arbitrary values. */
function splitVariants(classString: string): string[] {
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

function parseClass(
  classPart: string,
  startOffset: number,
  activeTheme: Theme,
  ignoredModifiers: readonly string[]
): ClassToken[] {
  const tokens: ClassToken[] = [];
  let currentPos = 0;
  if (classPart.startsWith(':') || classPart.endsWith(':')) {
    return tokens;
  }
  if (classPart.startsWith('!')) {
    const afterImportant = classPart.slice(1);
    if (afterImportant.startsWith(':') || afterImportant.endsWith(':')) {
      return tokens;
    }

    const config = lookupPrefix(activeTheme, 'important', ignoredModifiers);

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
  const parts = splitVariants(remainingClass);

  if (parts.length === 1) {
    const baseClassResult = resolveBaseClass(activeTheme, remainingClass);
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
    const prefixes = parts.slice(0, -1);
    const baseClass = parts[parts.length - 1];

    let currentPrefixStart = currentPos;

    const baseClassResult = resolveBaseClass(activeTheme, baseClass);
    const baseClassConfig = baseClassResult.config;
    const baseClassThemeKey = baseClassResult.themeKey;

    for (let i = 0; i < prefixes.length; i++) {
      const prefix = prefixes[i];
      const prefixResult = resolvePrefix(activeTheme, prefix, ignoredModifiers);
      const prefixConfig = prefixResult.config;
      const prefixThemeKey = prefixResult.themeKey;

      if (prefixConfig && prefixConfig.enabled !== false) {
        let prefixEnd: number;

        if (i < prefixes.length - 1 || (baseClassConfig && baseClassConfig.enabled !== false)) {
          prefixEnd = currentPrefixStart + prefix.length + 1;
        } else {
          // Without a base rule, the final styled prefix owns the remaining class text.
          prefixEnd = classPart.length;
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
      currentPrefixStart += prefix.length + 1;
    }

    if (baseClassConfig && baseClassConfig.enabled !== false) {
      let baseClassStart = currentPos;
      for (const prefix of prefixes) {
        baseClassStart += prefix.length + 1;
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
