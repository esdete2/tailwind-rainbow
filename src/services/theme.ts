import * as vscode from 'vscode';
import { themes } from '../defaultTheme';
import { api } from './api';
import { OutputService } from './output';

export class ThemeService {
  private activeTheme: Record<string, PrefixConfig>;
  private outputService = OutputService.getInstance();

  constructor() {
    // Register built-in themes
    api.registerTheme('default', themes.default);
    api.registerTheme('neon', themes.neon);
    this.activeTheme = this.getActiveTheme();
  }

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

  updateActiveTheme() {
    // Clear all themes first
    api.clearThemes();
    
    // Re-register built-in themes
    api.registerTheme('default', themes.default);
    api.registerTheme('neon', themes.neon);
    this.activeTheme = this.getActiveTheme();
  }

  getCurrentTheme(): Record<string, PrefixConfig> {
    return this.activeTheme;
  }

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

  // Allow external extensions to register themes
  registerTheme(name: string, theme: Record<string, PrefixConfig>) {
    api.registerTheme(name, theme);
  }

  getThemes() {
    return api.getThemes();
  }
} 