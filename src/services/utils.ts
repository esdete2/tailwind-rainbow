import * as vscode from 'vscode';

/**
 * Removes ignored modifiers from the prefix
 * @param prefix The prefix to process
 * @returns The prefix with ignored modifiers removed
 */
const removeIgnoredModifiers = (prefix: string) => {
  const config = vscode.workspace.getConfiguration('tailwindRainbow');
  const ignoredPrefixModifiers = config.get<string[]>('ignoredPrefixModifiers', []);
  let cleanedPrefix = prefix;
  if (ignoredPrefixModifiers.length > 0) {
    for (const ignoredModifier of ignoredPrefixModifiers) {
      cleanedPrefix = cleanedPrefix.replace(new RegExp(`^${ignoredModifier}-`), '');
    }
  }

  return cleanedPrefix;
};

/**
 * Gets the theme configuration for a given prefix
 * @param activeTheme The active theme configuration
 * @param prefix The prefix to search for
 * @returns The theme configuration for the prefix
 */
export const getThemeConfigForPrefix = (activeTheme: Theme, prefix: string) => {
  // Handle special cases first
  if (prefix === 'arbitrary' && activeTheme.arbitrary) {
    return activeTheme.arbitrary;
  }

  if (prefix === 'important' && activeTheme.important) {
    return activeTheme.important;
  }

  // Check for exact match in prefix section
  if (activeTheme.prefix?.[prefix]) {
    return activeTheme.prefix[prefix];
  }

  // Check for prefix without ignored modifiers
  const cleanedPrefix = removeIgnoredModifiers(prefix);
  if (cleanedPrefix !== prefix && activeTheme.prefix?.[cleanedPrefix]) {
    return activeTheme.prefix[cleanedPrefix];
  }

  // Check for prefix without group name
  if (cleanedPrefix.includes('/')) {
    const basePrefix = cleanedPrefix.split('/')[0];
    if (activeTheme.prefix?.[basePrefix]) {
      return activeTheme.prefix[basePrefix];
    }
  }

  // Check for arbitrary prefix (starts and ends with brackets)
  if (/^\[.+\]$/.test(prefix) && activeTheme.arbitrary) {
    return activeTheme.arbitrary;
  }

  // Check for matching wildcard in prefix section
  const parts = prefix.split('-');
  if (parts.length > 1 && parts[1]) {
    const basePrefix = parts[0];
    const wildcardKey = `${basePrefix}-*`;
    if (activeTheme.prefix?.[wildcardKey]) {
      return activeTheme.prefix[wildcardKey];
    }
  }

  // Check for base class match
  if (activeTheme.base?.[prefix]) {
    return activeTheme.base[prefix];
  }

  // Check for base class without ignored modifiers
  if (cleanedPrefix !== prefix && activeTheme.base?.[cleanedPrefix]) {
    return activeTheme.base[cleanedPrefix];
  }

  // Check for matching wildcard in base section
  if (activeTheme.base) {
    for (const [pattern, config] of Object.entries(activeTheme.base)) {
      if (pattern.endsWith('-*')) {
        const basePattern = pattern.slice(0, -1); // Remove '*'
        if (prefix.startsWith(basePattern)) {
          return config;
        }
        // Also check cleaned prefix
        if (cleanedPrefix !== prefix && cleanedPrefix.startsWith(basePattern)) {
          return config;
        }
      }
    }
  }

  return null;
};
