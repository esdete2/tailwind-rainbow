import * as vscode from 'vscode';

import { DecorationService } from './decoration';
import { OutputService } from './output';
import { ThemeService } from './theme';
import { TokenizerService } from './tokenizer';

/**
 * Main service that coordinates all extension functionality
 * Manages initialization, event handling, and service coordination
 */
export class ExtensionService {
  private decorationService: DecorationService;
  private tokenizerService: TokenizerService;
  private themeService: ThemeService;
  private activeTheme: Theme;
  private outputService = OutputService.getInstance();
  private updateTimeout: NodeJS.Timeout | undefined;
  private updateDelay = 300; // Increased delay for better performance
  private isProcessing = false; // Prevent concurrent processing

  /**
   * Gets the prefix ranges for a given editor
   * @param editor The VS Code text editor
   * @returns Map of prefixes to their ranges
   */
  public getPrefixRanges(editor: vscode.TextEditor): Map<string, vscode.Range[]> {
    return this.tokenizerService.findClassRanges(editor, this.activeTheme);
  }

  /**
   * Initializes all required services and logs activation
   */
  constructor() {
    this.decorationService = new DecorationService();
    this.tokenizerService = new TokenizerService();
    this.themeService = new ThemeService();
    this.activeTheme = this.themeService.getActiveTheme();
    this.outputService.debug('Tailwind Rainbow is now active');
  }

  /**
   * Updates decorations after theme registration
   */
  updateAfterThemeRegistration() {
    this.activeTheme = this.themeService.getActiveTheme();
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this.updateDecorations(editor);
    }
  }

  /**
   * Updates decorations for the current editor
   * Handles file extension filtering and pattern matching
   * @param editor The VS Code text editor to update
   */
  private updateDecorations(editor: vscode.TextEditor) {
    if (
      !editor ||
      editor.document.uri.scheme === 'output' ||
      editor.document.uri.scheme === 'debug' ||
      editor.document.isUntitled
    ) {
      return;
    }

    // Clear any pending update
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    // Debounce update with concurrency protection
    this.updateTimeout = setTimeout(() => {
      if (this.isProcessing) {
        return; // Skip if already processing
      }

      this.isProcessing = true;

      try {
        const config = vscode.workspace.getConfiguration('tailwindRainbow');
        const supportedLanguages = config.get<string[]>('languages') ?? [];
        const languageId = editor.document.languageId;

        if (!supportedLanguages.includes(languageId)) {
          this.outputService.log(
            `Language '${languageId}' not supported. Add to 'tailwindRainbow.languages' setting to enable.`
          );
          this.decorationService.clearDecorations();
          return;
        }

        const prefixRanges = this.tokenizerService.findClassRanges(editor, this.activeTheme);
        this.decorationService.updateDecorations(editor, prefixRanges, this.activeTheme);
      } catch (error) {
        this.outputService.error(error instanceof Error ? error : String(error));
      } finally {
        this.isProcessing = false;
      }
    }, this.updateDelay);
  }

  /**
   * Registers all event handlers for the extension
   * Includes theme switching, configuration changes, and editor events
   * @param context The VS Code extension context
   */
  registerEventHandlers(context: vscode.ExtensionContext) {
    // Theme switching command
    context.subscriptions.push(
      vscode.commands.registerCommand('tailwind-rainbow.selectTheme', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          await this.themeService.selectTheme(editor, () => {
            this.decorationService.clearDecorations();
            this.activeTheme = this.themeService.getCurrentTheme();
            this.updateDecorations(editor);
          });
        }
      })
    );

    // Configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('tailwindRainbow')) {
          this.decorationService.clearDecorations();
          this.themeService.updateActiveTheme();
          this.activeTheme = this.themeService.getCurrentTheme();

          // Reload tokenizer configuration for pattern changes
          this.tokenizerService.reloadConfiguration();

          const editor = vscode.window.activeTextEditor;
          if (editor) {
            this.updateDecorations(editor);
          }
        }
      })
    );

    // Editor events
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.updateDecorations(editor);
        }
      }),

      vscode.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
          this.updateDecorations(editor);
        }
      })
    );

    // Theme loading command
    context.subscriptions.push(
      vscode.commands.registerCommand('tailwind-rainbow.loadThemes', () => {
        this.outputService.debug('Theme loading triggered');
        return this.themeService;
      })
    );
  }

  /**
   * Gets the theme service instance
   * Used by the extension API for theme registration
   * @returns The ThemeService instance
   */
  getThemeService() {
    return this.themeService;
  }

  /**
   * Initializes the extension with the current editor
   * Called after extension activation
   */
  initialize() {
    // Initial decoration
    if (vscode.window.activeTextEditor) {
      // Ensure we have the latest theme
      this.activeTheme = this.themeService.getActiveTheme();
      this.updateDecorations(vscode.window.activeTextEditor);
    }
  }

  /**
   * Clears any pending updates
   */
  dispose() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
  }
}
