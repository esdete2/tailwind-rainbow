import { readQuotedString } from './document';
import type { ClassRegion, Token } from './types';

export { findApplyRegions } from './directives';

const LOOKBEHIND = 300;
const ATTRIBUTE_LOOKBEHIND = 100;

export interface ContextSettings {
  /** Identifiers are lowercased by the caller; function names and patterns retain their configured case. */
  classIdentifiers: readonly string[];
  classFunctions: ReadonlySet<string>;
  templatePatterns: readonly string[];
  contextPatterns: readonly string[];
}

function isIdentifier(name: string, settings: ContextSettings): boolean {
  const lower = name.toLowerCase();
  return settings.classIdentifiers.includes(lower) || settings.classIdentifiers.includes(lower + ':');
}

function hasAttribute(before: string, settings: ContextSettings): boolean {
  const last = before.trimEnd().at(-1);
  if (last !== '=' && last !== ':' && last !== '{') return false;
  const match = /(?:^|[^\w$:-])(["']?)([\w$:-]+)\1\s*(?:=|:)\s*(?:\{\s*)?$/.exec(before);
  return !!match && isIdentifier(match[2], settings);
}

function hasTemplateTag(before: string, patterns: readonly string[]): boolean {
  const tag = /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)$/.exec(before.trimEnd());
  if (!tag) return false;
  return patterns.some((pattern) => {
    const name = pattern.replace(/`$/, '').trim();
    return !!name && (tag[1] === name || tag[1].startsWith(name + '.'));
  });
}

/** Track open calls and named collections; closed expressions cannot authorize later strings. */
function hasEnclosingContext(before: string, settings: ContextSettings): boolean {
  // Most non-class strings contain no possible configured call or collection opener.
  if (!/\(|[:=]\s*[\[{]/.test(before)) return false;
  const openers = /(?<![\w$])(["']?)([\w$]+)\1\s*(\(|[=:]\s*[\[{])/g;
  let candidate;
  let possible = false;
  while ((candidate = openers.exec(before))) {
    if (
      candidate[3] === '('
        ? settings.classFunctions.has(candidate[2])
        : isIdentifier(candidate[2], settings) || settings.contextPatterns.includes(candidate[2])
    ) {
      possible = true;
      break;
    }
  }
  if (!possible) return false;

  const stack: { closer: string; eligible: boolean }[] = [];
  let word = '';
  let namedValue = false;
  for (let i = 0; i < before.length; i++) {
    const char = before[i];
    if (/\s/.test(char)) continue;
    if (char === '/' && before[i + 1] === '*') {
      const end = before.indexOf('*/', i + 2);
      if (end === -1) return false;
      i = end + 1;
      continue;
    }
    if (char === '/' && before[i + 1] === '/') {
      const end = before.slice(i).search(/[\r\n]/);
      if (end === -1) return false;
      i += end;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      const result = readQuotedString(before, i, char);
      word = result.content;
      i = result.endPos - 1;
      namedValue = false;
      continue;
    }
    if (/[\w$]/.test(char)) {
      const start = i;
      while (i + 1 < before.length && /[\w$]/.test(before[i + 1])) i++;
      word = before.slice(start, i + 1);
      continue;
    }
    if (char === '=' || char === ':') {
      namedValue = isIdentifier(word, settings) || settings.contextPatterns.includes(word);
      word = '';
    } else if (char === '(' || char === '[' || char === '{') {
      stack.push({
        closer: char === '(' ? ')' : char === '[' ? ']' : '}',
        eligible: char === '(' ? settings.classFunctions.has(word) : namedValue,
      });
      word = '';
      namedValue = false;
    } else if (char === ')' || char === ']' || char === '}') {
      const frame = stack.pop();
      if (frame && frame.closer !== char) stack.length = 0;
      word = '';
      namedValue = false;
    } else if (char === ';') {
      stack.length = 0;
      word = '';
      namedValue = false;
    } else {
      word = '';
      namedValue = false;
    }
  }
  return stack.some((frame) => frame.eligible);
}

/**
 * Require surrounding class syntax, a configured tag/call, or literal markup attributes.
 * Lookbehind is bounded in UTF-16 code units; incomplete distant syntax is not a language parser.
 */
export function isClassContext(text: string, token: Token, settings: ContextSettings): boolean {
  let end = token.start;
  if (text[end - 1] === token.quote) end--;
  const before = text.slice(Math.max(0, end - LOOKBEHIND), end);
  if (hasAttribute(before.slice(-ATTRIBUTE_LOOKBEHIND), settings)) return true;
  if (token.type === 'template' || token.quote === '`') {
    if (hasTemplateTag(before, settings.templatePatterns)) return true;
    if (token.content.includes('<') && findTemplateRegions(token.content, 0, settings.classIdentifiers).length)
      return true;
  }
  return hasEnclosingContext(before, settings);
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
  for (const identifier of identifiers) {
    const pattern = identifier + '=';
    const matches = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    while (true) {
      const match = matches.exec(content);
      if (!match) break;
      const index = match.index;
      if (/[\w$:-]/.test(content[index - 1] ?? '')) continue;
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
      matches.lastIndex = index + 1;
    }
  }
  return regions;
}
