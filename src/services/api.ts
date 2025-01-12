import * as vscode from 'vscode';

/**
 * Public API interface for the extension
 * Allows external extensions to register themes and access theme registry
 */
export interface TailwindRainbowAPI {
  /** Registers a new theme or updates an existing one */
  registerTheme: (name: string, theme: Record<string, PrefixConfig>) => void;
  /** Gets all registered themes */
  getThemes: () => Map<string, Record<string, PrefixConfig>>;
  /** Clears all registered themes */
  clearThemes: () => void;
}

/**
 * Implementation of the extension's API
 * Manages theme registration and access through a central registry
 */
class TailwindRainbowExtension implements TailwindRainbowAPI {
  /** Registry of all themes, keyed by theme name */
  private themeRegistry = new Map<string, Record<string, PrefixConfig>>();

  /**
   * Registers a new theme or updates an existing one
   * @param name The name of the theme
   * @param theme The theme configuration
   */
  registerTheme(name: string, theme: Record<string, PrefixConfig>) {
    this.themeRegistry.set(name, theme);
  }

  /**
   * Gets all registered themes
   * @returns Map of theme names to their configurations
   */
  getThemes() {
    return this.themeRegistry;
  }

  /**
   * Clears all registered themes from the registry
   * Used when reloading themes from settings
   */
  clearThemes() {
    this.themeRegistry.clear();
  }
}

/** Singleton instance of the extension API */
export const api = new TailwindRainbowExtension(); 