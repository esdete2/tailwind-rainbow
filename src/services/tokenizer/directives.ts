import { readQuotedString } from './document';
import type { ClassRegion } from './types';

const LANGUAGES = new Set(['css', 'scss', 'sass', 'less', 'stylus', 'postcss', 'tailwindcss']);
const LINE_COMMENTS = new Set(['scss', 'sass', 'less', 'stylus']);

function commentEnd(text: string, start: number, lineComments: boolean): number | undefined {
  if (text[start] !== '/') return undefined;
  if (text[start + 1] === '*') {
    const close = text.indexOf('*/', start + 2);
    return close === -1 ? text.length : close + 2;
  }
  if (lineComments && text[start + 1] === '/') {
    let end = start + 2;
    while (end < text.length && text[end] !== '\r' && text[end] !== '\n') end++;
    return end;
  }
  return undefined;
}

/** Quotes and url() payloads can contain comment delimiters and directive-looking text. */
function literalEnd(text: string, start: number): number | undefined {
  const char = text[start];
  if (char === '"' || char === "'") return readQuotedString(text, start, char).endPos;
  if (char !== 'u' && char !== 'U') return undefined;
  if (text.slice(start, start + 4).toLowerCase() !== 'url(' || /[\w-]/.test(text[start - 1] ?? '')) return undefined;
  let end = start + 4;
  while (end < text.length) {
    if (text[end] === '\\') end += 2;
    else if (text[end] === '"' || text[end] === "'") end = readQuotedString(text, end, text[end]).endPos;
    else if (text[end++] === ')') break;
  }
  return Math.min(end, text.length);
}

function appendRegion(regions: ClassRegion[], text: string, start: number, end: number): void {
  while (start < end && /\s/.test(text[start])) start++;
  const content = text.slice(start, end).trimEnd();
  if (content) regions.push({ content, start });
}

/** Discover @apply payloads outside comments and literals, retaining source-relative UTF-16 offsets. */
export function findApplyRegions(text: string, languageId: string): ClassRegion[] {
  if (!LANGUAGES.has(languageId)) return [];
  const regions: ClassRegion[] = [];
  const lineComments = LINE_COMMENTS.has(languageId);
  let i = 0;
  while (i < text.length) {
    const skip = commentEnd(text, i, lineComments) ?? literalEnd(text, i);
    if (skip !== undefined) {
      i = skip;
      continue;
    }
    if (text[i] !== '@' || !text.startsWith('@apply', i) || !/\s/.test(text[i + 6] ?? '')) {
      i++;
      continue;
    }
    i += 6;
    while (i < text.length && /\s/.test(text[i])) i++;
    let start = i;
    while (i < text.length) {
      const char = text[i];
      if (char === ';' || char === '}' || char === '\n' || char === '\r') break;
      const end = commentEnd(text, i, lineComments);
      if (end !== undefined) {
        appendRegion(regions, text, start, i);
        const isLine = text[i + 1] === '/';
        i = end;
        start = i;
        if (isLine) break;
      } else {
        i = literalEnd(text, i) ?? i + 1;
      }
    }
    appendRegion(regions, text, start, i);
    i++;
  }
  return regions;
}
