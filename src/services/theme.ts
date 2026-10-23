import * as vscode from 'vscode';

import themes from '../themes';
import { OutputService } from './output';

/**
 * Manages themes for the extension, including:
 * - Loading and registering built-in themes
 * - Handling custom theme configurations
 * - Theme selection and switching
 */
export class ThemeService {
  private activeTheme: Theme;
  private outputService = OutputService.getInstance();
  private themeRegistry = new Map<string, Theme>();
  private registeredThemes = new Map<string, Theme>();

  /**
   * Initializes the theme service by registering built-in themes
   */
  constructor() {
    Object.entries(themes).forEach(([name, theme]) => {
      this.registerTheme(name, theme);
    });
    this.activeTheme = this.getActiveTheme();
  }

  /**
   * Gets the active theme configuration, merging custom themes if defined
   * @returns The active theme configuration
   */
  getActiveTheme(): Theme {
    const config = vscode.workspace.getConfiguration('tailwindRainbow');
    const selectedTheme = config.get<string>('theme', 'default');
    const customThemes = config.get<Record<string, Theme>>('themes', {});

    // Settings overlay stable registrations; rebuilding makes removed overrides disappear.
    this.themeRegistry.clear();
    for (const [name, theme] of this.registeredThemes) this.themeRegistry.set(name, theme);
    Object.entries(customThemes).forEach(([name, theme]) => {
      // Get base theme if it exists (built-in or previously registered)
      const baseTheme = this.themeRegistry.get(name) || {};

      // Create new theme by merging custom config over base theme
      const mergedTheme: Theme = {
        arbitrary: { ...baseTheme.arbitrary, ...theme.arbitrary },
        important: { ...baseTheme.important, ...theme.important },
        prefix: { ...baseTheme.prefix, ...theme.prefix },
        base: { ...baseTheme.base, ...theme.base },
      };

      this.themeRegistry.set(name, mergedTheme);
    });

    // Get theme
    const theme = this.themeRegistry.get(selectedTheme);
    if (!theme) {
      this.outputService.error(
        `Theme '${selectedTheme}' not found. Available themes: ${Array.from(this.themeRegistry.keys()).join(', ')}`
      );
      return { arbitrary: undefined, important: undefined, prefix: {}, base: {} };
    }
    return { ...theme };
  }

  /**
   * Resolve the selected theme from registrations and current settings.
   */
  updateActiveTheme() {
    this.activeTheme = this.getActiveTheme();
  }

  /**
   * Gets the currently active theme configuration
   * @returns The current theme configuration
   */
  getCurrentTheme(): Theme {
    return this.activeTheme;
  }

  /**
   * Opens a quick pick menu for theme selection
   * @param editor The active text editor
   * @param onThemeChange Callback to execute when theme changes
   */
  async selectTheme(editor: vscode.TextEditor, onThemeChange: () => void) {
    const themeNames = Array.from(this.themeRegistry.keys());
    const originalTheme = this.activeTheme;

    const quickPick = vscode.window.createQuickPick();
    quickPick.items = themeNames.map((theme) => ({ label: theme }));
    quickPick.placeholder = 'Select a theme';

    quickPick.onDidChangeActive((items) => {
      const selected = items[0]?.label;
      if (selected) {
        this.activeTheme = { ...this.themeRegistry.get(selected)! };
        onThemeChange();
      }
    });

    quickPick.onDidAccept(async () => {
      const selected = quickPick.activeItems[0]?.label;
      if (selected) {
        await vscode.workspace.getConfiguration('tailwindRainbow').update('theme', selected, true);
      }
      quickPick.dispose();
    });

    quickPick.onDidHide(() => {
      if (!quickPick.selectedItems.length) {
        this.activeTheme = originalTheme;
        onThemeChange();
      }
      quickPick.dispose();
    });

    quickPick.show();
  }

  /**
   * Registers a new theme or updates an existing one
   * @param name The name of the theme
   * @param theme The theme configuration
   */
  registerTheme(name: string, theme: Theme) {
    this.registeredThemes.set(name, theme);
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
   */
  clearThemes() {
    this.registeredThemes.clear();
    this.themeRegistry.clear();
  }
}
