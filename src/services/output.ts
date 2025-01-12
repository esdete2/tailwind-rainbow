import * as vscode from 'vscode';

/**
 * Singleton service for centralized logging
 * Provides consistent output channel management across the extension
 */
export class OutputService {
  private static instance: OutputService;
  private channel: vscode.OutputChannel;

  /**
   * Private constructor to enforce singleton pattern
   * Creates a dedicated output channel for the extension
   */
  private constructor() {
    this.channel = vscode.window.createOutputChannel('Tailwind Rainbow');
  }

  /**
   * Gets the singleton instance of OutputService
   * Creates the instance if it doesn't exist
   * @returns The OutputService instance
   */
  static getInstance(): OutputService {
    if (!OutputService.instance) {
      OutputService.instance = new OutputService();
    }
    return OutputService.instance;
  }

  /**
   * Logs an informational message to the output channel
   * @param message The message to log
   */
  log(message: string) {
    this.channel.appendLine(message);
  }

  /**
   * Logs an error message to the output channel
   * Automatically prefixes the message with "Error: "
   * @param message The error message or Error object to log
   */
  error(message: string | Error) {
    const errorMessage = message instanceof Error ? message.message : message;
    this.channel.appendLine(`Error: ${errorMessage}`);
  }
} 