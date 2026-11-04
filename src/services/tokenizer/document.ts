import type { Token } from './types';

const STRING_CONTEXT_WINDOW = 100;

function readComment(text: string, start: number, opener: string, closer: string): { endPos: number; token: Token } {
  const closingIndex = text.indexOf(closer, start + opener.length);
  const endPos = closingIndex === -1 ? text.length : closingIndex + closer.length;
  return { endPos, token: { type: 'comment', content: text.slice(start, endPos), start, end: endPos } };
}

function readLineComment(text: string, start: number): { endPos: number; token: Token } {
  let endPos = start + 1;
  while (endPos < text.length && text[endPos] !== '\n' && text[endPos] !== '\r') endPos++;
  return { endPos, token: { type: 'comment', content: text.slice(start, endPos), start, end: endPos } };
}

/**
 * Start points at the opening quote; endPos follows the closer or points at EOF.
 * The payload reserves one delimiter code unit at each edge, including incomplete input.
 */
export function readQuotedString(text: string, start: number, quote: string): { endPos: number; content: string } {
  let endPos = start + 1;
  while (endPos < text.length) {
    if (text[endPos] === '\\' && endPos + 1 < text.length) endPos += 2;
    else if (text[endPos] === quote) {
      endPos++;
      break;
    } else endPos++;
  }
  return { endPos, content: text.slice(start + 1, endPos - 1) };
}

/**
 * Recognize lexical candidates, leaving class-context validation to the caller.
 * Templates are unconditional; regular quotes require a boundary in the bounded lookbehind.
 */
export function scanDocument(text: string): Token[] {
  const tokens: Token[] = [];
  const length = text.length;
  let i = 0;

  while (i < length) {
    const char = text[i];
    if (char === '/' && i + 1 < length) {
      const next = text[i + 1];
      if (next === '/' || next === '*') {
        const result = next === '/' ? readLineComment(text, i) : readComment(text, i, '/*', '*/');
        tokens.push(result.token);
        i = result.endPos;
        continue;
      }
    } else if (char === '#') {
      const result = readLineComment(text, i);
      tokens.push(result.token);
      i = result.endPos;
      continue;
    } else if (char === '<' && text.startsWith('<!--', i)) {
      const result = readComment(text, i, '<!--', '-->');
      tokens.push(result.token);
      i = result.endPos;
      continue;
    } else if (char === '{' && text.startsWith('{/*', i)) {
      const result = readComment(text, i, '{/*', '*/}');
      tokens.push(result.token);
      i = result.endPos;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      if (quote !== '`') {
        const before = text.slice(Math.max(0, i - STRING_CONTEXT_WINDOW), i).trim();
        const hasBoundary =
          before.endsWith('=') ||
          before.endsWith('={') ||
          before.endsWith('(') ||
          before.endsWith(',') ||
          before.endsWith('[') ||
          before.endsWith('{') ||
          before.endsWith('&&') ||
          before.endsWith('||') ||
          before.endsWith('?') ||
          before.endsWith(':');
        if (!hasBoundary) {
          i++;
          continue;
        }
      }

      const result = readQuotedString(text, i, quote);
      tokens.push({
        type: quote === '`' ? 'template' : 'string',
        content: result.content,
        start: i + 1,
        end: result.endPos - 1,
        quote,
      });
      i = result.endPos;
      continue;
    }

    i++;
  }
  return tokens;
}
