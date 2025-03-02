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
  const cleanedPrefix = removeIgnoredModifiers(prefix);

  if (activeTheme[cleanedPrefix]) {
    return activeTheme[cleanedPrefix];
  }

  // Check if prefix has a group name
  if (cleanedPrefix.includes('/')) {
    const basePrefix = cleanedPrefix.split('/')[0];

    if (activeTheme[basePrefix]) {
      return activeTheme[basePrefix];
    }
  }

  return null;
};
