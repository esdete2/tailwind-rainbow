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
  // Check for exact match
  if (activeTheme[prefix]) {
    return activeTheme[prefix];
  }

  // Check for prefix without ignored modifiers
  const cleanedPrefix = removeIgnoredModifiers(prefix);
  if (cleanedPrefix !== prefix && activeTheme[cleanedPrefix]) {
    return activeTheme[cleanedPrefix];
  }

  // Check for prefix without group name
  if (cleanedPrefix.includes('/')) {
    const basePrefix = cleanedPrefix.split('/')[0];

    if (activeTheme[basePrefix]) {
      return activeTheme[basePrefix];
    }
  }

  // Check for arbitrary prefix
  if (activeTheme.ARBITRARY && /^\[.+\]$/.test(prefix)) {
    return activeTheme.ARBITRARY;
  }

  // Check for matching wildcard
  const parts = prefix.split('-');
  if (parts.length > 1 && parts[1]) {
    const basePrefix = parts[0];
    const wildcardKey = `${basePrefix}-*`;
    if (activeTheme[wildcardKey]) {
      return activeTheme[wildcardKey];
    }
  }

  return null;
};
