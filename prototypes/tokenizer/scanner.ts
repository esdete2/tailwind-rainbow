export const TokenKind = { variant: 1, utility: 2, arbitrary: 3, important: 4 } as const;

/**
 * Returns packed [start, end, kind] triples in UTF-16 code units.
 * Regions are trusted, disjoint [start, end] pairs containing class-list text.
 * This scanner recognizes syntax; it does not validate utilities or discover class contexts.
 */
export function scan(source: string, regions: Uint32Array): Uint32Array {
  const tokens: number[] = [];

  function emit(start: number, end: number, kind: number) {
    if (end > start) tokens.push(start, end, kind);
  }

  function utility(start: number, end: number, trailingImportant: boolean) {
    if (start < end && source.charCodeAt(start) === 33) {
      emit(start, start + 1, TokenKind.important);
      start++;
    }
    const important = end > start && trailingImportant;
    const valueEnd = important ? end - 1 : end;
    let segment = start;
    let depth = 0;
    let quote = 0;
    for (let i = start; i < valueEnd; i++) {
      const char = source.charCodeAt(i);
      if (char === 92) {
        i++;
      } else if (quote) {
        if (char === quote) quote = 0;
      } else if (depth && (char === 34 || char === 39 || char === 96)) {
        quote = char;
      } else if (char === 91) {
        if (depth++ === 0) {
          emit(segment, i, TokenKind.utility);
          segment = i;
        }
      } else if (char === 93 && depth > 0 && --depth === 0) {
        emit(segment, i + 1, TokenKind.arbitrary);
        segment = i + 1;
      }
    }
    emit(segment, valueEnd, depth ? TokenKind.arbitrary : TokenKind.utility);
    if (important) emit(valueEnd, end, TokenKind.important);
  }

  function className(start: number, end: number) {
    if (source.charCodeAt(start) === 33) {
      emit(start, start + 1, TokenKind.important);
      start++;
    }
    let segment = start;
    let brackets = 0;
    let parentheses = 0;
    let quote = 0;
    let trailingImportant = false;
    for (let i = start; i < end; i++) {
      const char = source.charCodeAt(i);
      if (char === 92) {
        i++;
      } else if (quote) {
        if (char === quote) quote = 0;
      } else if ((brackets || parentheses) && (char === 34 || char === 39 || char === 96)) {
        quote = char;
      } else if (char === 91) {
        brackets++;
      } else if (char === 93 && brackets > 0) {
        brackets--;
      } else if (char === 40) {
        parentheses++;
      } else if (char === 41 && parentheses > 0) {
        parentheses--;
      } else if (char === 58 && !brackets && !parentheses) {
        emit(segment, i + 1, TokenKind.variant);
        segment = i + 1;
      } else if (char === 33 && i === end - 1 && !brackets && !parentheses) {
        trailingImportant = true;
      }
    }
    utility(segment, end, trailingImportant);
  }

  for (let region = 0; region < regions.length; region += 2) {
    const start = regions[region];
    const end = regions[region + 1];
    let word = start;
    let brackets = 0;
    let parentheses = 0;
    let quote = 0;
    for (let i = start; i <= end; i++) {
      const char = source.charCodeAt(i);
      if (i === end || (!brackets && !parentheses && isWhitespace(char))) {
        if (i > word) className(word, i);
        word = i + 1;
      } else if (char === 92 && i + 1 < end) {
        i++;
      } else if (quote) {
        if (char === quote) quote = 0;
      } else if ((brackets || parentheses) && (char === 34 || char === 39 || char === 96)) {
        quote = char;
      } else if (char === 91) {
        brackets++;
      } else if (char === 93 && brackets > 0) {
        brackets--;
      } else if (char === 40) {
        parentheses++;
      } else if (char === 41 && parentheses > 0) {
        parentheses--;
      }
    }
  }
  return Uint32Array.from(tokens);
}

function isWhitespace(char: number): boolean {
  return char === 32 || (char >= 9 && char <= 13);
}
