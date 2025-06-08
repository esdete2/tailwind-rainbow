import { ConfigurationManager } from './config';

/**
 * Removes ignored modifiers from the prefix
 * @param prefix The prefix to process
 * @returns The prefix with ignored modifiers removed
 */
const removeIgnoredModifiers = (prefix: string) => {
  const configManager = ConfigurationManager.getInstance();
  const ignoredPrefixModifiers = configManager.getIgnoredPrefixModifiers();
  let cleanedPrefix = prefix;
  if (ignoredPrefixModifiers.length > 0) {
    for (const ignoredModifier of ignoredPrefixModifiers) {
      cleanedPrefix = cleanedPrefix.replace(new RegExp(`^${ignoredModifier}-`), '');
    }
  }

  return cleanedPrefix;
};

/**
 * Gets the theme configuration for a prefix (used with colons)
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

  // Check for prefix without ignored modifiers (only for prefixes)
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

  // Check for matching wildcard in prefix section only
  const parts = prefix.split('-');
  if (parts.length > 1 && activeTheme.prefix) {
    const basePrefix = parts[0];
    const wildcardKey = `${basePrefix}-*`;
    if (activeTheme.prefix[wildcardKey]) {
      return activeTheme.prefix[wildcardKey];
    }
  }

  return null;
};

/**
 * Gets the theme configuration for a base class (standalone class without colon)
 * @param activeTheme The active theme configuration
 * @param className The class name to search for
 * @returns The theme configuration for the class
 */
export const getThemeConfigForBaseClass = (activeTheme: Theme, className: string) => {
  // Handle special cases first
  if (className === 'arbitrary' && activeTheme.arbitrary) {
    return activeTheme.arbitrary;
  }

  // Check for exact match in base section
  if (activeTheme.base?.[className]) {
    return activeTheme.base[className];
  }

  // Check for arbitrary class (starts and ends with brackets)
  if (className.startsWith('[') && className.endsWith(']') && activeTheme.arbitrary) {
    return activeTheme.arbitrary;
  }

  // Check for matching wildcard in base section only
  if (activeTheme.base) {
    const parts = className.split('-');
    if (parts.length > 1 && activeTheme.base) {
      const basePrefix = parts[0];
      const wildcardKey = `${basePrefix}-*`;
      if (activeTheme.base[wildcardKey]) {
        return activeTheme.base[wildcardKey];
      }
    }
  }

  return null;
};
