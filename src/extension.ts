import * as vscode from 'vscode';
import { PrefixConfig, ThemeType, themes, TailwindPrefix } from './defaultTheme';
import { api } from './api';

function getActiveTheme(): Record<string, PrefixConfig> {
	const config = vscode.workspace.getConfiguration('tailwindRainbow');
	const selectedTheme = config.get<string>('theme', 'default');
	const userPrefixes = config.get<Record<string, Partial<PrefixConfig>>>('prefixes', {});
	const customThemes = config.get<Record<string, Record<string, PrefixConfig>>>('themes', {});

	// Apply custom themes to API registry
	Object.entries(customThemes).forEach(([name, theme]) => {
		api.registerTheme(name, theme);
	});

	// Get theme (either built-in or custom)
	const baseTheme = { ...api.getThemes().get(selectedTheme)! };

	// Apply user prefix overrides
	for (const [prefix, customConfig] of Object.entries(userPrefixes)) {
		if (baseTheme[prefix]) {
			baseTheme[prefix] = {
				...baseTheme[prefix],
				...customConfig
			};
		}
	}

	return baseTheme;
}

export async function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel('Tailwind Rainbow');
	outputChannel.appendLine('Tailwind Rainbow is now active');

	const decorationTypes = new Map<string, vscode.TextEditorDecorationType>();
	let activeTheme = getActiveTheme();

	// Clear all existing decorations
	function clearDecorations() {
		decorationTypes.forEach(type => type.dispose());
		decorationTypes.clear();
	}

	function updateDecorations(editor: vscode.TextEditor) {
		outputChannel.appendLine(`Updating decorations for ${editor.document.fileName}`);
		const text = editor.document.getText();
		// Handle both regular quotes and template literals
		const classRegex = /class(?:Name)?=(?:(['"`])((?:(?!\1).)*)\1|\{`([^`]+)`\})/g;

		decorationTypes.forEach(type => editor.setDecorations(type, []));
		const prefixRanges = new Map<string, vscode.Range[]>();

		let match: RegExpExecArray | null;
		while ((match = classRegex.exec(text)) !== null) {
			// match[2] is content from quotes, match[3] is content from template literals
			const classContent = match[2] || match[3];
			outputChannel.appendLine(`Found class: ${classContent}`);
			const matchStart = match.index;
			const matchText = match[0];
			const classNames = classContent.split(' ');

			for (const className of classNames) {
				// Skip classes with double colons or ending with colon
				if (className.includes('::') || className.endsWith(':')) {
					continue;
				}

				const parts = className.split(':');

				// Only process if it has at least one prefix
				if (parts.length > 1) {
					const prefixes = parts.slice(0, -1);
					let currentPos = 0;

					prefixes.forEach((prefix, index) => {
						const config = activeTheme[prefix as TailwindPrefix];
						if (config && config.enabled !== false) {
							const prefixStart = className.indexOf(prefix, currentPos);
							currentPos = prefixStart + prefix.length + 1;

							// Find end position - either next enabled prefix or end of class
							let endPos;
							let nextEnabledPrefix = prefixes.slice(index + 1).find(p =>
								activeTheme[p as TailwindPrefix]?.enabled
							);

							if (nextEnabledPrefix) {
								// Color until next enabled prefix
								endPos = editor.document.positionAt(
									matchStart + matchText.indexOf(className) +
									className.indexOf(nextEnabledPrefix, currentPos)
								);
							} else {
								// Color until end of class
								endPos = editor.document.positionAt(
									matchStart + matchText.indexOf(className) + className.length
								);
							}

							const startPos = editor.document.positionAt(
								matchStart + matchText.indexOf(className) + prefixStart
							);

							const range = new vscode.Range(startPos, endPos);

							if (!prefixRanges.has(prefix)) {
								prefixRanges.set(prefix, []);
							}
							prefixRanges.get(prefix)!.push(range);
						}
					});
				}
			}
		}

		// Apply all decorations at once
		prefixRanges.forEach((ranges, prefix) => {
			const config = activeTheme[prefix as TailwindPrefix];
			if (config && config.enabled !== false) {
				const decorationType = getDecorationForPrefix(prefix, config);
				editor.setDecorations(decorationType, ranges);
			}
		});
	}

	function getDecorationForPrefix(prefix: string, config: PrefixConfig): vscode.TextEditorDecorationType {
		if (!decorationTypes.has(prefix)) {
			decorationTypes.set(
				prefix,
				vscode.window.createTextEditorDecorationType({
					color: config.color,
					fontWeight: config.fontWeight
				})
			);
		}
		return decorationTypes.get(prefix)!;
	}

	// Add theme switching command
	context.subscriptions.push(
		vscode.commands.registerCommand('tailwind-rainbow.selectTheme', async () => {
			// Get all registered themes from the API
			const themeNames = Array.from(api.getThemes().keys());

			// Store original theme to restore if cancelled
			const originalTheme = getActiveTheme();

			const quickPick = vscode.window.createQuickPick();
			quickPick.items = themeNames.map(theme => ({ label: theme }));
			quickPick.placeholder = 'Select a theme';

			// Preview theme as user navigates
			quickPick.onDidChangeActive(items => {
				const selected = items[0]?.label;
				if (selected) {
					clearDecorations();
					activeTheme = { ...api.getThemes().get(selected)! };
					const editor = vscode.window.activeTextEditor;
					if (editor) {
						updateDecorations(editor);
					}
				}
			});

			// Handle selection or cancellation
			quickPick.onDidAccept(async () => {
				const selected = quickPick.activeItems[0]?.label;
				if (selected) {
					await vscode.workspace.getConfiguration('tailwindRainbow').update('theme', selected, true);
				}
				quickPick.dispose();
			});

			quickPick.onDidHide(() => {
				// Restore original theme if cancelled
				if (!quickPick.selectedItems.length) {
					clearDecorations();
					activeTheme = originalTheme;
					const editor = vscode.window.activeTextEditor;
					if (editor) {
						updateDecorations(editor);
					}
				}
				quickPick.dispose();
			});

			quickPick.show();
		})
	);

	// Watch for configuration changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration('tailwindRainbow')) {
				clearDecorations();
				activeTheme = getActiveTheme();
				const editor = vscode.window.activeTextEditor;
				if (editor) {
					updateDecorations(editor);
				}
			}
		})
	);

	// Register event handlers
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				updateDecorations(editor);
			}
		}),

		vscode.workspace.onDidChangeTextDocument(event => {
			const editor = vscode.window.activeTextEditor;
			if (editor && event.document === editor.document) {
				updateDecorations(editor);
			}
		})
	);

	// Initial decoration
	if (vscode.window.activeTextEditor) {
		updateDecorations(vscode.window.activeTextEditor);
	}

	// Register built-in themes
	api.registerTheme('default', themes.default);
	api.registerTheme('neon', themes.neon);

	// Register theme loading command
	context.subscriptions.push(
		vscode.commands.registerCommand('tailwind-rainbow.loadThemes', () => {
			// This command exists just for activation purposes
			outputChannel.appendLine('Theme loading triggered');
		})
	);

	// Trigger theme extensions to load
	await vscode.commands.executeCommand('tailwind-rainbow.loadThemes');

	// Expose API
	return api;
}

// This method is called when your extension is deactivated
export function deactivate() {
	// Cleanup will be handled by VS Code
}

// Add type declaration for the extension API
export interface ExtensionAPI {
	registerTheme: (name: string, theme: Record<string, PrefixConfig>) => void;
}
