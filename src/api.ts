import { PrefixConfig } from './defaultTheme';

export interface TailwindRainbowAPI {
    registerTheme: (name: string, theme: Record<string, PrefixConfig>) => void;
    getThemes: () => Map<string, Record<string, PrefixConfig>>;
}

class TailwindRainbowExtension implements TailwindRainbowAPI {
    private themeRegistry = new Map<string, Record<string, PrefixConfig>>();

    constructor() {
        // Initialize with built-in themes later
    }

    registerTheme(name: string, theme: Record<string, PrefixConfig>) {
        this.themeRegistry.set(name, theme);
    }

    getThemes() {
        return this.themeRegistry;
    }
}

export const api = new TailwindRainbowExtension(); 