import { predefinedCollections } from '../../collections';

export type CollectionDefinitions = Readonly<Record<string, readonly string[]>>;

interface PatternIndex {
  exact: Map<string, string[]>;
  prefixes: Map<string, string[]>;
}

export interface CollectionMatch {
  name: string;
  config: ClassConfig;
}

function add(index: Map<string, string[]>, key: string, name: string): void {
  const names = index.get(key);
  if (names) {
    if (!names.includes(name)) names.push(name);
  } else index.set(key, [name]);
}

function buildIndex(definitions: CollectionDefinitions): PatternIndex {
  const index: PatternIndex = { exact: new Map(), prefixes: new Map() };
  for (const [name, patterns] of Object.entries(definitions)) {
    for (const pattern of patterns) {
      if (!pattern || /\s/.test(pattern)) continue;
      if (!pattern.includes('*')) add(index.exact, pattern, name);
      else if (pattern.endsWith('-*') && pattern.indexOf('*') === pattern.length - 1)
        add(index.prefixes, pattern.slice(0, -1), name);
    }
  }
  return index;
}

const predefinedIndex = buildIndex(predefinedCollections);

/**
 * Predefined categories use exact spellings, then the longest literal family.
 * This keeps border-collapse in Tables and text-shadow-* in Effects even when only
 * the broader Borders or Typography collection is styled.
 */
export function predefinedCollection(className: string): string | undefined {
  const exact = predefinedIndex.exact.get(className);
  if (exact) return exact[0];
  let name: string | undefined;
  for (let i = 0; i < className.length; i++) {
    if (className[i] === '-') name = predefinedIndex.prefixes.get(className.slice(0, i + 1))?.[0] ?? name;
  }
  return name;
}

/** Compiled definitions are immutable snapshots; only explicit overrides participate in custom ordering. */
export class CollectionMatcher {
  private index: PatternIndex;
  private ranks: Map<string, number>;

  constructor(definitions: CollectionDefinitions = {}) {
    this.index = buildIndex(definitions);
    this.ranks = new Map(Object.keys(definitions).map((name, rank) => [name, rank]));
  }

  lookup(className: string, styles: Readonly<Record<string, ClassConfig>>): CollectionMatch | null {
    let match: CollectionMatch | null = null;
    let rank = Infinity;
    const consider = (names?: readonly string[]): void => {
      for (const name of names ?? []) {
        const candidateRank = this.ranks.get(name)!;
        if (candidateRank < rank && Object.hasOwn(styles, name) && styles[name]) {
          rank = candidateRank;
          match = { name, config: styles[name] };
        }
      }
    };
    consider(this.index.exact.get(className));
    for (let i = 0; i < className.length; i++) {
      if (className[i] === '-') consider(this.index.prefixes.get(className.slice(0, i + 1)));
    }
    if (match) return match;
    const name = predefinedCollection(className);
    return name && !this.ranks.has(name) && Object.hasOwn(styles, name) && styles[name]
      ? { name, config: styles[name] }
      : null;
  }
}

export const defaultCollections = new CollectionMatcher();
