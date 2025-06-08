import * as vscode from 'vscode';

/**
 * Configuration interface for the extension
 */
export interface TailwindRainbowConfig {
  classIdentifiers: string[];
  classFunctions: string[];
  templatePatterns: string[];
  contextPatterns: string[];
  maxFileSize: number;
  ignoredPrefixModifiers: string[];
  debug: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: TailwindRainbowConfig = {
  classIdentifiers: ['class', 'className', 'class:', 'className:', 'classlist', 'classes', 'css', 'style'],
  classFunctions: [
    'cn',
    'clsx',
    'cva',
    'classNames',
    'classList',
    'classnames',
    'twMerge',
    'tw',
    'cls',
    'cc',
    'cx',
    'classname',
    'styled',
    'css',
    'theme',
    'variants',
  ],
  templatePatterns: ['class', '${', 'tw`', 'css`', 'styled'],
  contextPatterns: ['variants', 'cva', 'class', 'css', 'style'],
  maxFileSize: 1_000_000,
  ignoredPrefixModifiers: ['/'],
  debug: false,
};

/**
 * Configuration change event handler type
 */
export type ConfigChangeHandler = (config: TailwindRainbowConfig) => void;

/**
 * Centralized configuration manager for the Tailwind Rainbow extension
 * Handles loading, caching, and change notifications for all configuration settings
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: TailwindRainbowConfig;
  private changeHandlers: Set<ConfigChangeHandler> = new Set();
  private disposables: vscode.Disposable[] = [];

  // Cached computed values for performance
  private cachedLowerCaseIdentifiers: string[] = [];
  private cachedClassFunctionsSet: Set<string> = new Set();
  private cachedTemplatePatterns: string[] = [];
  private cachedContextPatterns: string[] = [];

  private constructor() {
    this.config = this.loadConfiguration();
    this.updateCachedValues();
    this.setupConfigurationWatcher();
  }

  /**
   * Gets the singleton instance of the configuration manager
   */
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Gets the current configuration
   */
  public getConfig(): TailwindRainbowConfig {
    return { ...this.config };
  }

  /**
   * Gets a specific configuration value
   */
  public get<K extends keyof TailwindRainbowConfig>(key: K): TailwindRainbowConfig[K] {
    return this.config[key];
  }

  /**
   * Gets class identifiers for detecting class attributes
   */
  public getClassIdentifiers(): string[] {
    return [...this.config.classIdentifiers];
  }

  /**
   * Gets lowercase class identifiers (cached for performance)
   */
  public getLowerCaseClassIdentifiers(): string[] {
    return [...this.cachedLowerCaseIdentifiers];
  }

  /**
   * Gets class functions for detecting utility function calls
   */
  public getClassFunctions(): string[] {
    return [...this.config.classFunctions];
  }

  /**
   * Gets class functions as a Set for fast lookups (cached for performance)
   */
  public getClassFunctionsSet(): Set<string> {
    return new Set(this.cachedClassFunctionsSet);
  }

  /**
   * Checks if a function name is a class function (O(1) lookup)
   */
  public isClassFunction(functionName: string): boolean {
    return this.cachedClassFunctionsSet.has(functionName);
  }

  /**
   * Gets template patterns for detecting template literals
   */
  public getTemplatePatterns(): string[] {
    return [...this.config.templatePatterns];
  }

  /**
   * Gets context patterns for detecting class contexts
   */
  public getContextPatterns(): string[] {
    return [...this.config.contextPatterns];
  }

  /**
   * Gets the maximum file size for processing
   */
  public getMaxFileSize(): number {
    return this.config.maxFileSize;
  }

  /**
   * Gets ignored prefix modifiers
   */
  public getIgnoredPrefixModifiers(): string[] {
    return [...this.config.ignoredPrefixModifiers];
  }

  public getDebugEnabled(): boolean {
    return this.config.debug;
  }

  /**
   * Registers a handler for configuration changes
   */
  public onConfigChange(handler: ConfigChangeHandler): vscode.Disposable {
    this.changeHandlers.add(handler);

    return {
      dispose: () => {
        this.changeHandlers.delete(handler);
      },
    };
  }

  /**
   * Forces a reload of the configuration
   */
  public reloadConfiguration(): void {
    const oldConfig = this.config;
    this.config = this.loadConfiguration();

    // Update cached values
    this.updateCachedValues();

    // Notify handlers if configuration changed
    if (JSON.stringify(oldConfig) !== JSON.stringify(this.config)) {
      this.notifyConfigChange();
    }
  }

  /**
   * Loads configuration from VS Code workspace settings
   */
  private loadConfiguration(): TailwindRainbowConfig {
    const workspaceConfig = vscode.workspace.getConfiguration('tailwindRainbow');

    return {
      classIdentifiers: workspaceConfig.get<string[]>('classIdentifiers', DEFAULT_CONFIG.classIdentifiers),
      classFunctions: workspaceConfig.get<string[]>('classFunctions', DEFAULT_CONFIG.classFunctions),
      templatePatterns: workspaceConfig.get<string[]>('templatePatterns', DEFAULT_CONFIG.templatePatterns),
      contextPatterns: workspaceConfig.get<string[]>('contextPatterns', DEFAULT_CONFIG.contextPatterns),
      maxFileSize: workspaceConfig.get<number>('maxFileSize', DEFAULT_CONFIG.maxFileSize),
      ignoredPrefixModifiers: workspaceConfig.get<string[]>(
        'ignoredPrefixModifiers',
        DEFAULT_CONFIG.ignoredPrefixModifiers
      ),
      debug: workspaceConfig.get<boolean>('debug', DEFAULT_CONFIG.debug),
    };
  }

  /**
   * Sets up configuration change watcher
   */
  private setupConfigurationWatcher(): void {
    const disposable = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('tailwindRainbow')) {
        this.reloadConfiguration();
      }
    });

    this.disposables.push(disposable);
  }

  /**
   * Notifies all registered handlers of configuration changes
   */
  private notifyConfigChange(): void {
    const config = this.getConfig();
    this.changeHandlers.forEach((handler) => {
      try {
        handler(config);
      } catch (error) {
        console.error('Error in configuration change handler:', error);
      }
    });
  }

  /**
   * Updates cached computed values for performance
   */
  private updateCachedValues(): void {
    this.cachedLowerCaseIdentifiers = this.config.classIdentifiers.map((id) => id.toLowerCase());
    this.cachedClassFunctionsSet = new Set(this.config.classFunctions);
    this.cachedTemplatePatterns = [...this.config.templatePatterns];
    this.cachedContextPatterns = [...this.config.contextPatterns];
  }

  /**
   * Disposes of the configuration manager
   */
  public dispose(): void {
    this.disposables.forEach((disposable) => disposable.dispose());
    this.disposables = [];
    this.changeHandlers.clear();
    // Clear cached values
    this.cachedLowerCaseIdentifiers = [];
    this.cachedClassFunctionsSet.clear();
    this.cachedTemplatePatterns = [];
    this.cachedContextPatterns = [];
    ConfigurationManager.instance = undefined as any;
  }
}
