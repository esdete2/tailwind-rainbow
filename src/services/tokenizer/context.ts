import { readQuotedString } from './document';
import type { ClassRegion, Token } from './types';

const LOOKBEHIND = 100;
const LOOKAHEAD = 50;
const EXTENDED_LOOKBEHIND = 300;
const APPLY_LENGTH = '@apply'.length;
const APPLY_LANGUAGES = new Set(['css', 'scss', 'sass', 'less', 'stylus', 'postcss', 'tailwindcss']);

export interface ContextSettings {
  /** Identifiers are lowercased by the caller; function names and patterns retain their configured case. */
  classIdentifiers: readonly string[];
  classFunctions: ReadonlySet<string>;
  templatePatterns: readonly string[];
  contextPatterns: readonly string[];
}

function hasUtilityCall(text: string, functions: ReadonlySet<string>): boolean {
  const matches = text.match(/\b(\w+)\s*\(/g);
  if (matches) {
    for (const match of matches) {
      if (functions.has(match.slice(0, -1).trim())) return true;
    }
  }
  return false;
}

/**
 * Apply eligibility heuristics to lexical candidates, without validating language syntax.
 * Templates and class-like payloads are accepted before surrounding context is inspected.
 */
export function isClassContext(text: string, token: Token, settings: ContextSettings): boolean {
  const before = text.slice(Math.max(0, token.start - LOOKBEHIND), token.start);
  const after = text.slice(token.end, Math.min(text.length, token.end + LOOKAHEAD));

  if (token.type === 'template') return true;
  const colonIndex = token.content.indexOf(':');
  if (colonIndex > 0 && colonIndex < token.content.length - 1) return true;
  if (token.content.includes('-')) return true;

  const lowerBefore = before.toLowerCase();
  for (const identifier of settings.classIdentifiers) {
    if (lowerBefore.includes(identifier + '=') || lowerBefore.includes(identifier + ':')) return true;
  }

  if (hasUtilityCall(before, settings.classFunctions)) return true;

  if (token.quote === '`') {
    for (const pattern of settings.templatePatterns) {
      if (before.includes(pattern)) return true;
    }
  }

  const trimmedBefore = before.trim();
  if (
    trimmedBefore.endsWith('[') ||
    trimmedBefore.endsWith('{') ||
    trimmedBefore.endsWith(',') ||
    trimmedBefore.endsWith(':')
  ) {
    const extendedBefore = text.slice(Math.max(0, token.start - EXTENDED_LOOKBEHIND), token.start);
    if (hasUtilityCall(extendedBefore, settings.classFunctions)) return true;
    for (const pattern of settings.contextPatterns) {
      if (extendedBefore.includes(pattern)) return true;
    }
  }

  const combined = before + token.content + after;
  return combined.includes('class=') && (combined.includes('"') || combined.includes("'"));
}

/**
 * Discover literal @apply content in CSS-like documents, in source order.
 * Raw text is searched without validating comments or keyword boundaries.
 */
export function findApplyRegions(text: string, languageId: string): ClassRegion[] {
  if (!APPLY_LANGUAGES.has(languageId)) return [];
  const regions: ClassRegion[] = [];
  let searchStart = 0;

  while (true) {
    const index = text.indexOf('@apply', searchStart);
    if (index === -1) break;
    let start = index + APPLY_LENGTH;
    while (start < text.length && /\s/.test(text[start])) start++;

    let end = start;
    while (end < text.length) {
      const char = text[end];
      if (char === ';' || char === '}' || char === '\n' || char === '\r') break;
      end++;
    }

    const content = text.slice(start, end).trim();
    if (content) regions.push({ content, start });
    searchStart = end + 1;
  }
  return regions;
}

/**
 * Discover quoted template attributes in configured identifier order, retaining repeated matches.
 * Identifiers are lowercased by the caller; payload whitespace and UTF-16 offsets are preserved.
 */
export function findTemplateRegions(
  content: string,
  startOffset: number,
  identifiers: readonly string[]
): ClassRegion[] {
  const regions: ClassRegion[] = [];
  const lowerContent = content.toLowerCase();
  for (const identifier of identifiers) {
    const pattern = identifier + '=';
    let searchIndex = 0;
    while (true) {
      const index = lowerContent.indexOf(pattern, searchIndex);
      if (index === -1) break;
      let quoteStart = index + pattern.length;
      while (
        quoteStart < content.length &&
        (content[quoteStart] === ' ' ||
          content[quoteStart] === '\t' ||
          content[quoteStart] === '\n' ||
          content[quoteStart] === '\r')
      )
        quoteStart++;

      if (quoteStart < content.length && (content[quoteStart] === '"' || content[quoteStart] === "'")) {
        const result = readQuotedString(content, quoteStart, content[quoteStart]);
        if (result.endPos - 1 >= quoteStart + 1) {
          regions.push({ content: result.content, start: startOffset + quoteStart + 1 });
        }
      }
      searchIndex = index + 1;
    }
  }
  return regions;
}
