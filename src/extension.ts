import * as vscode from 'vscode';

import { ExtensionService } from './services/extension';

/**
 * Public API interface for the extension
 * Allows external extensions to register themes and access theme registry
 */
export interface TailwindRainbowAPI {
  /** Registers a new theme or updates an existing one */
  registerTheme: (name: string, theme: Theme) => void;
  /** Gets all registered themes */
  getThemes: () => Map<string, Theme>;
  /** Clears all registered themes */
  clearThemes: () => void;
  /** Gets the prefix ranges for a given editor */
  getTokenRanges: (editor: vscode.TextEditor) => Map<string, vscode.Range[]>;
}

let extensionService: ExtensionService | undefined;

export async function activate(context: vscode.ExtensionContext) {
  extensionService = new ExtensionService();
  extensionService.initialize();
  extensionService.registerEventHandlers(context);

  // Trigger theme extensions to load
  await vscode.commands.executeCommand('tailwind-rainbow.loadThemes');

  const themeService = extensionService.getThemeService();

  return {
    registerTheme: (name: string, theme: Theme) => {
      themeService.registerTheme(name, theme);
      extensionService?.updateAfterThemeRegistration();
    },
    getThemes: () => themeService.getThemes(),
    clearThemes: () => themeService.clearThemes(),
    getTokenRanges: (editor: vscode.TextEditor) => {
      return extensionService?.getTokenRanges(editor);
    },
  };
}

export function deactivate() {
  extensionService?.dispose();
}
