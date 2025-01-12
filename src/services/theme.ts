import * as vscode from 'vscode';
import { api } from './api';
import { OutputService } from './output';
import themes from '../themes';

/**
 * Manages themes for the extension, including:
 * - Loading and registering built-in themes
 * - Handling custom theme configurations
 * - Theme selection and switching
 */
export class ThemeService {
  private activeTheme: Record<string, PrefixConfig>;
  private outputService = OutputService.getInstance();

  /**
   * Initializes the theme service by registering built-in themes
   */
  constructor() {
    Object.entries(themes).forEach(([name, theme]) => {
      api.registerTheme(name, theme);
    });
    this.activeTheme = this.getActiveTheme();
  }

  /**
   * Gets the active theme configuration, merging custom themes if defined
   * @returns The active theme configuration
   */
  getActiveTheme(): Record<string, PrefixConfig> {
    const config = vscode.workspace.getConfiguration('tailwindRainbow');
    const selectedTheme = config.get<string>('theme', 'default');
    const customThemes = config.get<Record<string, Record<string, PrefixConfig>>>('themes', {});

    // Apply custom themes to API registry
    Object.entries(customThemes).forEach(([name, theme]) => {
      // Get base theme if it exists (built-in or previously registered)
      const baseTheme = api.getThemes().get(name) || {};

      // Create new theme by merging custom config over base theme
      const mergedTheme = { ...baseTheme };
      Object.entries(theme).forEach(([prefix, config]) => {
        mergedTheme[prefix] = {
          ...baseTheme[prefix],
          ...config
        };
      });

      api.registerTheme(name, mergedTheme);
    });

    // Get theme
    const theme = api.getThemes().get(selectedTheme);
    if (!theme) {
      this.outputService.error(
        `Theme '${selectedTheme}' not found. Available themes: ${Array.from(api.getThemes().keys()).join(', ')}`
      );
      return {};
    }
    return { ...theme };
  }

  /**
   * Updates the active theme by clearing and re-registering all themes
   * This ensures custom themes are properly merged with the latest settings
   */
  updateActiveTheme() {
    // Clear all themes first
    api.clearThemes();

    // Re-register built-in themes
    api.registerTheme('default', themes.default);
    api.registerTheme('neon', themes.neon);
    this.activeTheme = this.getActiveTheme();
  }

  /**
   * Gets the currently active theme configuration
   * @returns The current theme configuration
   */
  getCurrentTheme(): Record<string, PrefixConfig> {
    return this.activeTheme;
  }

  /**
   * Opens a quick pick menu for theme selection
   * @param editor The active text editor
   * @param onThemeChange Callback to execute when theme changes
   */
  async selectTheme(editor: vscode.TextEditor, onThemeChange: () => void) {
    const themeNames = Array.from(api.getThemes().keys());
    const originalTheme = this.activeTheme;

    const quickPick = vscode.window.createQuickPick();
    quickPick.items = themeNames.map(theme => ({ label: theme }));
    quickPick.placeholder = 'Select a theme';

    quickPick.onDidChangeActive(items => {
      const selected = items[0]?.label;
      if (selected) {
        this.activeTheme = { ...api.getThemes().get(selected)! };
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
  registerTheme(name: string, theme: Record<string, PrefixConfig>) {
    api.registerTheme(name, theme);
  }

  /**
   * Gets all registered themes
   * @returns Map of theme names to their configurations
   */
  getThemes() {
    return api.getThemes();
  }
} 