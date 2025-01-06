// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { defaultTheme, PrefixConfig, TailwindPrefix } from './defaultTheme';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel('Tailwind Rainbow');
	outputChannel.appendLine('Tailwind Rainbow is now active');

	// Store decorations for each unique prefix
	const decorationTypes = new Map<string, vscode.TextEditorDecorationType>();

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
						const config = defaultTheme[prefix as TailwindPrefix];
						if (config?.enabled) {
							const prefixStart = className.indexOf(prefix, currentPos);
							currentPos = prefixStart + prefix.length + 1;

							// Find end position - either next enabled prefix or end of class
							let endPos;
							let nextEnabledPrefix = prefixes.slice(index + 1).find(p =>
								defaultTheme[p as TailwindPrefix]?.enabled
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
			const config = defaultTheme[prefix as TailwindPrefix];
			if (config?.enabled) {
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
}

// This method is called when your extension is deactivated
export function deactivate() {
	// Cleanup will be handled by VS Code
}
