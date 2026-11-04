import { type CollectionMatcher, defaultCollections } from './collections';
import { GroupState, readClassSyntax } from './syntax';
import { lookupPrefix, resolveBaseClass, resolvePrefix } from './theme';
import type { ClassToken } from './types';

const MAX_CONTENT_LENGTH = 5_000;
const CONTENT_VALIDATION_THRESHOLD = 100;

interface ClassOptions {
  mode?: HighlightMode;
  collections?: CollectionMatcher;
}

/** Parse themed fragments with document-relative UTF-16 offsets and explicit modifier settings. */
export function parseClassContent(
  content: string,
  startOffset: number,
  activeTheme: Theme,
  ignoredModifiers: readonly string[],
  options: ClassOptions = {}
): ClassToken[] {
  const classTokens: ClassToken[] = [];
  if (content.length > MAX_CONTENT_LENGTH) {
    return classTokens;
  }
  if (!content.includes(':')) {
    if (
      content.length > CONTENT_VALIDATION_THRESHOLD &&
      !content.includes('-') &&
      !content.includes('[') &&
      !Object.keys(activeTheme.collections ?? {}).length
    ) {
      return classTokens;
    }
  }
  // Raw whitespace separates class names even inside incomplete grouped input.
  const words = /[^ \t\r\n]+/g;
  let match;
  while ((match = words.exec(content))) {
    const raw = match[0];
    let start = 0;
    let end = raw.length;
    let stop = false;
    if (/[<>{}]/.test(raw)) {
      const groups = new GroupState();
      let wordStarted = false;
      for (let i = 0; i < raw.length; i++) {
        const char = raw[i];
        const markup = !groups.advance(char) && (char === '<' || char === '>' || char === '{' || char === '}');
        if (markup) {
          if (wordStarted) {
            end = i;
            stop = true;
            break;
          }
          start = i + 1;
        } else wordStarted = true;
      }
    }
    if (start < end) {
      classTokens.push(
        ...parseClass(raw.slice(start, end), startOffset + match.index + start, activeTheme, ignoredModifiers, options)
      );
    }
    if (stop) break;
  }

  return classTokens;
}

/** Resolve source spans separately from marker-free utility and variant lookup. */
function parseClass(
  classPart: string,
  startOffset: number,
  activeTheme: Theme,
  ignoredModifiers: readonly string[],
  options: ClassOptions
): ClassToken[] {
  const syntax = readClassSyntax(classPart);
  if (!syntax) return [];
  const { parts, marker } = syntax;
  const base = parts[parts.length - 1];
  const baseStart = base.start + (marker === base.start ? 1 : 0);
  const baseEnd = base.end - (marker === base.end - 1 ? 1 : 0);
  if (baseStart >= baseEnd) return [];

  const tokens: ClassToken[] = [];
  const content = marker === undefined ? classPart : classPart.slice(0, marker) + classPart.slice(marker + 1);
  if (marker !== undefined) {
    const config = lookupPrefix(activeTheme, 'important', ignoredModifiers);
    if (config && config.enabled !== false) {
      tokens.push({
        type: 'important',
        content: '!',
        start: startOffset + marker,
        end: startOffset + marker + 1,
        themeKey: 'important',
        rangeKey: 'important',
        config,
      });
    }
  }

  const emit = (start: number, end: number, rangeKey: string, themeKey: string, config: ClassConfig): void => {
    const append = (from: number, to: number): void => {
      if (from < to)
        tokens.push({
          type: 'class',
          content,
          start: startOffset + from,
          end: startOffset + to,
          themeKey,
          rangeKey,
          config,
        });
    };
    // A fallback can span the utility; leave the marker outside every class decoration.
    if (marker !== undefined && marker >= start && marker < end) {
      append(start, marker);
      append(marker + 1, end);
    } else append(start, end);
  };

  const baseClass = classPart.slice(baseStart, baseEnd);
  const baseResult = resolveBaseClass(activeTheme, baseClass, options.collections ?? defaultCollections);
  const styledBase = baseResult.config && baseResult.config.enabled !== false;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const start = part.start + (marker === part.start ? 1 : 0);
    const prefix = classPart.slice(start, part.end);
    const result = resolvePrefix(activeTheme, prefix, ignoredModifiers);
    if (result.config && result.config.enabled !== false) {
      const end = options.mode === 'prefix' || i < parts.length - 2 || styledBase ? part.end + 1 : baseEnd;
      emit(start, end, prefix, result.themeKey, result.config);
    }
  }
  if (styledBase && baseResult.config)
    emit(baseStart, baseEnd, baseResult.rangeKey ?? baseClass, baseResult.themeKey, baseResult.config);
  return tokens;
}
