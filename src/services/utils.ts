export const getThemeConfigForPrefix = (activeTheme: Theme, prefix: string) => {
  if (activeTheme[prefix]) {
    return activeTheme[prefix];
  }

  // Check if prefix has a group name
  if (prefix.includes('/')) {
    const basePrefix = prefix.split('/')[0];

    if (activeTheme[basePrefix]) {
      return activeTheme[basePrefix];
    }
  }

  return null;
};
