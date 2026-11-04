import { ConfigurationManager } from './config';
import { lookupBaseClass, lookupPrefix } from './tokenizer/theme';

/** Configuration-aware adapter for callers that resolve prefix rules directly. */
export const getThemeConfigForPrefix = (activeTheme: Theme, prefix: string) =>
  lookupPrefix(activeTheme, prefix, ConfigurationManager.getInstance().getIgnoredPrefixModifiers());

export const getThemeConfigForBaseClass = (activeTheme: Theme, className: string) =>
  lookupBaseClass(activeTheme, className);
