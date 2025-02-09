import * as vscode from 'vscode';

import { ExtensionService } from './services/extension';

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
  /** Gets the prefix ranges for a given editor */
  getPrefixRanges: (editor: vscode.TextEditor) => Map<string, vscode.Range[]>;
}

export async function activate(context: vscode.ExtensionContext) {
  const extensionService = new ExtensionService();
  extensionService.initialize();
  extensionService.registerEventHandlers(context);

  // Trigger theme extensions to load
  await vscode.commands.executeCommand('tailwind-rainbow.loadThemes');

  const themeService = extensionService.getThemeService();

  return {
    registerTheme: (name: string, theme: Record<string, PrefixConfig>) => {
      themeService.registerTheme(name, theme);
      extensionService.updateAfterThemeRegistration();
    },
    getThemes: () => themeService.getThemes(),
    clearThemes: () => themeService.clearThemes(),
    getPrefixRanges: (editor: vscode.TextEditor) => {
      return extensionService.getPrefixRanges(editor);
    },
  };
}

export function deactivate() {
  // Cleanup will be handled by VS Code
}
