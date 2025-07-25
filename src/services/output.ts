import * as vscode from 'vscode';

import { ConfigurationManager } from './config';

/**
 * Singleton service for centralized logging
 * Provides consistent output channel management across the extension
 */
export class OutputService {
  private static instance: OutputService;
  private channel: vscode.OutputChannel;
  private configManager: ConfigurationManager;

  /**
   * Private constructor to enforce singleton pattern
   * Creates a dedicated output channel for the extension
   */
  private constructor() {
    this.channel = vscode.window.createOutputChannel('Tailwind Rainbow');
    this.configManager = ConfigurationManager.getInstance();
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
   * Logs a debug message to the output channel
   * @param message The message to log
   */
  debug(message: string) {
    if (this.configManager.getDebugEnabled()) {
      const timestamp = new Date().toISOString();
      this.channel.appendLine(`[${timestamp}] [DEBUG] ${message}`);
    }
  }

  /**
   * Logs an error message to the output channel
   * Automatically prefixes the message with "Error: "
   * @param message The error message or Error object to log
   */
  error(message: string | Error) {
    const errorMessage = message instanceof Error ? message.message : message;
    this.channel.appendLine(`[ERROR] ${errorMessage}`);
  }
}
