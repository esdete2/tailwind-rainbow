export interface PrefixConfig {
    color: string;
    enabled?: boolean;
    fontWeight?: 'normal' | 'bold' | 'lighter' | 'bolder' | 'thin' | 'extralight' | 'light' | 'medium' | 'semibold' | 'extrabold' | 'black' |
    '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
}

export const defaultTheme: Record<string, PrefixConfig> = {
    // Responsive prefixes (Violet family)
    'xs': {
        color: '#fa8bfa',
        fontWeight: 'bold'
    },
    'sm': {
        color: '#d18bfa',
        fontWeight: 'bold',
    },
    'md': {
        color: '#b88bfa',
        fontWeight: 'bold'
    },
    'lg': {
        color: '#a78bfa',
        fontWeight: 'bold'
    },
    'xl': {
        color: '#8b8bfa',
        fontWeight: 'bold'
    },
    '2xl': {
        color: '#8b9dfa',
        fontWeight: 'bold'
    },

    // Pseudo-elements (Red family)
    'before': {
        color: '#fb7185',
        fontWeight: 'bold'
    },
    'after': {
        color: '#fb5c5c',
        fontWeight: 'bold'
    },
    'placeholder': {
        color: '#fb8a5c',
        fontWeight: 'bold'
    },
    'first-letter': {
        color: '#fb6d5c',
        fontWeight: 'bold'
    },
    'first-line': {
        color: '#fb5c7a',
        fontWeight: 'bold'
    },

    // Interactive states (Green family)
    'hover': {
        color: '#4ade80',
        fontWeight: 'bold'
    },
    'focus': {
        color: '#4ada95',
        fontWeight: 'bold'
    },
    'active': {
        color: '#4ad6aa',
        fontWeight: 'bold'
    },
    'visited': {
        color: '#4acdb8',
        fontWeight: 'bold'
    },
    'target': {
        color: '#4ac5c5',
        fontWeight: 'bold'
    },

    // Group/Peer states (Blue family)
    'group-hover': {
        color: '#5cb8fb',
        fontWeight: 'bold'
    },
    'group-focus': {
        color: '#5c9efb',
        fontWeight: 'bold'
    },
    'peer-hover': {
        color: '#5c85fb',
        fontWeight: 'bold'
    },
    'peer-focus': {
        color: '#5c6cfb',
        fontWeight: 'bold'
    },

    // Dark mode (Yellow/Orange family)
    'dark': {
        color: '#fbbf24',
        fontWeight: 'bold'
    },
    'light': {
        color: '#fbad24',
        fontWeight: 'bold'
    },

    // Form states (Purple family)
    'disabled': {
        color: '#c45cfb',
        fontWeight: 'bold'
    },
    'checked': {
        color: '#d65cfb',
        fontWeight: 'bold'
    },
    'required': {
        color: '#e85cfb',
        fontWeight: 'bold'
    },
    'valid': {
        color: '#fb5cf3',
        fontWeight: 'bold'
    },
    'invalid': {
        color: '#fb5cdc',
        fontWeight: 'bold'
    },

    // Print/Orientation (Gray family with slight hue)
    'print': {
        color: '#94a3b8',
        fontWeight: 'bold'
    },
    'landscape': {
        color: '#94b8b3',
        fontWeight: 'bold'
    },
    'portrait': {
        color: '#94b8a3',
        fontWeight: 'bold'
    },

    // Direction (Gold family)
    'rtl': {
        color: '#fbd45c',
        fontWeight: 'bold'
    },
    'ltr': {
        color: '#fbcc5c',
        fontWeight: 'bold'
    }
} as const;

export const neonTheme: Record<string, PrefixConfig> = {
    // Responsive prefixes (Neon Pink to Blue gradient)
    'xs': {
        color: '#ff00ff',
        fontWeight: 'bold'
    },
    'sm': {
        color: '#ff00d6',
        fontWeight: 'bold'
    },
    'md': {
        color: '#cc00ff',
        fontWeight: 'bold'
    },
    'lg': {
        color: '#9d00ff',
        fontWeight: 'bold'
    },
    'xl': {
        color: '#6e00ff',
        fontWeight: 'bold'
    },
    '2xl': {
        color: '#00ffff',
        fontWeight: 'bold'
    },

    // Pseudo-elements (Neon Red/Orange)
    'before': {
        color: '#ff0000',
        fontWeight: 'bold'
    },
    'after': {
        color: '#ff3300',
        fontWeight: 'bold'
    },
    'placeholder': {
        color: '#ff6600',
        fontWeight: 'bold'
    },
    'first-letter': {
        color: '#ff9900',
        fontWeight: 'bold'
    },
    'first-line': {
        color: '#ffcc00',
        fontWeight: 'bold'
    },

    // Interactive states (Neon Green)
    'hover': {
        color: '#00ff00',
        fontWeight: 'bold'
    },
    'focus': {
        color: '#00ff33',
        fontWeight: 'bold'
    },
    'active': {
        color: '#00ff66',
        fontWeight: 'bold'
    },
    'visited': {
        color: '#00ff99',
        fontWeight: 'bold'
    },
    'target': {
        color: '#00ffcc',
        fontWeight: 'bold'
    },

    // Group/Peer states (Electric Blue)
    'group-hover': {
        color: '#00ccff',
        fontWeight: 'bold'
    },
    'group-focus': {
        color: '#0099ff',
        fontWeight: 'bold'
    },
    'peer-hover': {
        color: '#0066ff',
        fontWeight: 'bold'
    },
    'peer-focus': {
        color: '#0033ff',
        fontWeight: 'bold'
    },

    // Dark mode (Neon Yellow)
    'dark': {
        color: '#ffff00',
        fontWeight: 'bold'
    },
    'light': {
        color: '#ffff33',
        fontWeight: 'bold'
    },

    // Form states (UV Purple)
    'disabled': {
        color: '#cc00cc',
        fontWeight: 'bold'
    },
    'checked': {
        color: '#9900cc',
        fontWeight: 'bold'
    },
    'required': {
        color: '#6600cc',
        fontWeight: 'bold'
    },
    'valid': {
        color: '#3300cc',
        fontWeight: 'bold'
    },
    'invalid': {
        color: '#0000cc',
        fontWeight: 'bold'
    },

    // Print/Orientation (Bright White)
    'print': {
        color: '#ffffff',
        fontWeight: 'bold'
    },
    'landscape': {
        color: '#f0f0f0',
        fontWeight: 'bold'
    },
    'portrait': {
        color: '#e0e0e0',
        fontWeight: 'bold'
    },

    // Direction (Neon Orange)
    'rtl': {
        color: '#ff6600',
        fontWeight: 'bold'
    },
    'ltr': {
        color: '#ff9900',
        fontWeight: 'bold'
    }
} as const;

export type ThemeType = 'default' | 'neon';
export const themes: Record<ThemeType, Record<string, PrefixConfig>> = {
    default: defaultTheme,
    neon: neonTheme
};

export type TailwindPrefix = keyof typeof defaultTheme;