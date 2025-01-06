// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { defaultTheme, TailwindPrefix } from './defaultTheme';

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
				
				// Only process if it starts with a valid prefix from our theme
				if (parts.length > 1 && defaultTheme[parts[0] as TailwindPrefix]) {
					const prefixes = parts.slice(0, -1);
					let currentPos = 0;
					
					prefixes.forEach((prefix, index) => {
						const color = defaultTheme[prefix as TailwindPrefix];
						if (color) {
							const prefixStart = className.indexOf(prefix, currentPos);
							currentPos = prefixStart + prefix.length + 1;
							
							let range: vscode.Range;
							if (index === prefixes.length - 1) {
								// Last prefix: color from prefix to end of utility
								const startPos = editor.document.positionAt(
									matchStart + matchText.indexOf(className) + prefixStart
								);
								const endPos = editor.document.positionAt(
									matchStart + matchText.indexOf(className) + className.length
								);
								range = new vscode.Range(startPos, endPos);
							} else {
								// Other prefixes: color only the prefix
								const startPos = editor.document.positionAt(
									matchStart + matchText.indexOf(className) + prefixStart
								);
								const endPos = editor.document.positionAt(
									matchStart + matchText.indexOf(className) + prefixStart + prefix.length + 1
								);
								range = new vscode.Range(startPos, endPos);
							}
							
							// Add range to prefix's collection
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
			const color = defaultTheme[prefix as TailwindPrefix];
			if (color) {
				const decorationType = getDecorationForPrefix(prefix, color);
				editor.setDecorations(decorationType, ranges);
			}
		});
	}
	
	function getDecorationForPrefix(prefix: string, color: string): vscode.TextEditorDecorationType {
		if (!decorationTypes.has(prefix)) {
			decorationTypes.set(
				prefix,
				vscode.window.createTextEditorDecorationType({
					color: color
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
