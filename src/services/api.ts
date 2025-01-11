export interface TailwindRainbowAPI {
  registerTheme: (name: string, theme: Record<string, PrefixConfig>) => void;
  getThemes: () => Map<string, Record<string, PrefixConfig>>;
  clearThemes: () => void;
}

class TailwindRainbowExtension implements TailwindRainbowAPI {
  private themeRegistry = new Map<string, Record<string, PrefixConfig>>();

  registerTheme(name: string, theme: Record<string, PrefixConfig>) {
    this.themeRegistry.set(name, theme);
  }

  getThemes() {
    return this.themeRegistry;
  }

  clearThemes() {
    this.themeRegistry.clear();
  }
}

export const api = new TailwindRainbowExtension(); 