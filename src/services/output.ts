import * as vscode from 'vscode';

export class OutputService {
  private static instance: OutputService;
  private channel: vscode.OutputChannel;

  private constructor() {
    this.channel = vscode.window.createOutputChannel('Tailwind Rainbow');
  }

  static getInstance(): OutputService {
    if (!OutputService.instance) {
      OutputService.instance = new OutputService();
    }
    return OutputService.instance;
  }

  log(message: string) {
    this.channel.appendLine(message);
  }

  error(message: string | Error) {
    const errorMessage = message instanceof Error ? message.message : message;
    this.channel.appendLine(`Error: ${errorMessage}`);
  }
} 