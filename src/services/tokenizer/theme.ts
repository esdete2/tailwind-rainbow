import { type CollectionMatcher, defaultCollections } from './collections';

interface ThemeMatch {
  config: ClassConfig | null;
  themeKey: string;
  rangeKey?: string;
}

function removeIgnoredModifiers(prefix: string, modifiers: readonly string[]): string {
  let cleaned = prefix;
  // Modifiers are ordered regular-expression fragments, evaluated only when normalization is needed.
  for (const modifier of modifiers) cleaned = cleaned.replace(new RegExp(`^${modifier}-`), '');
  return cleaned;
}

/**
 * Priority: special sections, exact prefix, normalized prefix, named group, arbitrary selector,
 * then a wildcard built from the literal prefix's first component. Disabled matches still win.
 */
export function lookupPrefix(theme: Theme, prefix: string, ignoredModifiers: readonly string[]): ClassConfig | null {
  if (prefix === 'arbitrary' && theme.arbitrary) return theme.arbitrary;
  if (prefix === 'important' && theme.important) return theme.important;
  if (theme.prefix?.[prefix]) return theme.prefix[prefix];

  const cleaned = removeIgnoredModifiers(prefix, ignoredModifiers);
  if (cleaned !== prefix && theme.prefix?.[cleaned]) return theme.prefix[cleaned];
  if (cleaned.includes('/')) {
    const base = cleaned.split('/')[0];
    if (theme.prefix?.[base]) return theme.prefix[base];
  }
  if (/^\[.+\]$/.test(prefix) && theme.arbitrary) return theme.arbitrary;

  const parts = prefix.split('-');
  if (parts.length > 1 && theme.prefix) {
    const wildcard = `${parts[0]}-*`;
    if (theme.prefix[wildcard]) return theme.prefix[wildcard];
  }
  return null;
}

/** Base rules use their own namespace: special arbitrary, exact, arbitrary value, then first-component wildcard. */
function lookupBaseRule(theme: Theme, className: string): ClassConfig | null {
  if (className === 'arbitrary' && theme.arbitrary) return theme.arbitrary;
  if (theme.base && Object.hasOwn(theme.base, className) && theme.base[className]) return theme.base[className];
  if (className.startsWith('[') && className.endsWith(']') && theme.arbitrary) return theme.arbitrary;
  if (theme.base) {
    const parts = className.split('-');
    if (parts.length > 1) {
      const wildcard = `${parts[0]}-*`;
      if (theme.base[wildcard]) return theme.base[wildcard];
    }
  }
  return null;
}

/** Explicit base rules precede collections; disabled matches remain authoritative. */
export function lookupBaseClass(
  theme: Theme,
  className: string,
  collections: CollectionMatcher = defaultCollections
): ClassConfig | null {
  return (
    lookupBaseRule(theme, className) ??
    (theme.collections ? (collections.lookup(className, theme.collections)?.config ?? null) : null)
  );
}

/** Fragment resolution maps bracketed syntax to the arbitrary rule before raw exact lookup. */
export function resolvePrefix(theme: Theme, prefix: string, ignoredModifiers: readonly string[]): ThemeMatch {
  if (prefix.startsWith('[') && prefix.endsWith(']')) {
    const config = lookupPrefix(theme, 'arbitrary', ignoredModifiers);
    return config && config.enabled !== false ? { config, themeKey: 'arbitrary' } : { config: null, themeKey: prefix };
  }
  return { config: lookupPrefix(theme, prefix, ignoredModifiers), themeKey: prefix };
}

export function resolveBaseClass(
  theme: Theme,
  className: string,
  collections: CollectionMatcher = defaultCollections
): ThemeMatch {
  if (className.startsWith('[') && className.endsWith(']')) {
    const config = lookupBaseRule(theme, 'arbitrary');
    return config && config.enabled !== false
      ? { config, themeKey: 'arbitrary' }
      : { config: null, themeKey: className };
  }
  const config = lookupBaseRule(theme, className);
  if (config || !theme.collections) return { config, themeKey: className };
  const match = collections.lookup(className, theme.collections);
  return match
    ? { config: match.config, themeKey: `collection:${match.name}`, rangeKey: `collection:${match.name}` }
    : { config: null, themeKey: className };
}
