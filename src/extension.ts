import * as vscode from 'vscode';
import { ExtensionService } from './services/extension';


export async function activate(context: vscode.ExtensionContext) {
	const extensionService = new ExtensionService();
	extensionService.initialize();
	extensionService.registerEventHandlers(context);

	// Trigger theme extensions to load
	await vscode.commands.executeCommand('tailwind-rainbow.loadThemes');

	const themeService = extensionService.getThemeService();
	return {
		registerTheme: (name: string, theme: Record<string, PrefixConfig>) => themeService.registerTheme(name, theme),
		getThemes: () => themeService.getThemes()
	};
}

export function deactivate() {
	// Cleanup will be handled by VS Code
}
