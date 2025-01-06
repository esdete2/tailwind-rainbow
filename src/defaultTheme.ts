export interface PrefixConfig {
    color: string;
    enabled: boolean;
    fontWeight: 'normal' | 'bold';
}

export const defaultTheme: Record<string, PrefixConfig> = {
    // Responsive prefixes (Violet family)
    'xs': {
        color: '#fa8bfa',
        enabled: true,
        fontWeight: 'bold'
    },
    'sm': {
        color: '#d18bfa',
        enabled: true,
        fontWeight: 'bold'
    },
    'md': {
        color: '#b88bfa',
        enabled: true,
        fontWeight: 'bold'
    },
    'lg': {
        color: '#a78bfa',
        enabled: true,
        fontWeight: 'bold'
    },
    'xl': {
        color: '#8b8bfa',
        enabled: true,
        fontWeight: 'bold'
    },
    '2xl': {
        color: '#8b9dfa',
        enabled: true,
        fontWeight: 'bold'
    },

    // Pseudo-elements (Red family)
    'before': {
        color: '#fb7185',
        enabled: true,
        fontWeight: 'bold'
    },
    'after': {
        color: '#fb5c5c',
        enabled: true,
        fontWeight: 'bold'
    },
    'placeholder': {
        color: '#fb8a5c',
        enabled: true,
        fontWeight: 'bold'
    },
    'first-letter': {
        color: '#fb6d5c',
        enabled: true,
        fontWeight: 'bold'
    },
    'first-line': {
        color: '#fb5c7a',
        enabled: true,
        fontWeight: 'bold'
    },

    // Interactive states (Green family)
    'hover': {
        color: '#4ade80',
        enabled: true,
        fontWeight: 'bold'
    },
    'focus': {
        color: '#4ada95',
        enabled: true,
        fontWeight: 'bold'
    },
    'active': {
        color: '#4ad6aa',
        enabled: true,
        fontWeight: 'bold'
    },
    'visited': {
        color: '#4acdb8',
        enabled: true,
        fontWeight: 'bold'
    },
    'target': {
        color: '#4ac5c5',
        enabled: true,
        fontWeight: 'bold'
    },

    // Group/Peer states (Blue family)
    'group-hover': {
        color: '#5cb8fb',
        enabled: true,
        fontWeight: 'bold'
    },
    'group-focus': {
        color: '#5c9efb',
        enabled: true,
        fontWeight: 'bold'
    },
    'peer-hover': {
        color: '#5c85fb',
        enabled: true,
        fontWeight: 'bold'
    },
    'peer-focus': {
        color: '#5c6cfb',
        enabled: true,
        fontWeight: 'bold'
    },

    // Dark mode (Yellow/Orange family)
    'dark': {
        color: '#fbbf24',
        enabled: true,
        fontWeight: 'bold'
    },
    'light': {
        color: '#fbad24',
        enabled: true,
        fontWeight: 'bold'
    },

    // Form states (Purple family)
    'disabled': {
        color: '#c45cfb',
        enabled: true,
        fontWeight: 'bold'
    },
    'checked': {
        color: '#d65cfb',
        enabled: true,
        fontWeight: 'bold'
    },
    'required': {
        color: '#e85cfb',
        enabled: true,
        fontWeight: 'bold'
    },
    'valid': {
        color: '#fb5cf3',
        enabled: true,
        fontWeight: 'bold'
    },
    'invalid': {
        color: '#fb5cdc',
        enabled: true,
        fontWeight: 'bold'
    },

    // Print/Orientation (Gray family with slight hue)
    'print': {
        color: '#94a3b8',
        enabled: true,
        fontWeight: 'bold'
    },
    'landscape': {
        color: '#94b8b3',
        enabled: true,
        fontWeight: 'bold'
    },
    'portrait': {
        color: '#94b8a3',
        enabled: true,
        fontWeight: 'bold'
    },

    // Direction (Gold family)
    'rtl': {
        color: '#fbd45c',
        enabled: true,
        fontWeight: 'bold'
    },
    'ltr': {
        color: '#fbcc5c',
        enabled: true,
        fontWeight: 'bold'
    }
} as const;

export const neonTheme: Record<string, PrefixConfig> = {
    // Responsive prefixes (Neon Pink to Blue gradient)
    'xs': {
        color: '#ff00ff',
        enabled: true,
        fontWeight: 'bold'
    },
    'sm': {
        color: '#ff00d6',
        enabled: true,
        fontWeight: 'bold'
    },
    'md': {
        color: '#cc00ff',
        enabled: true,
        fontWeight: 'bold'
    },
    'lg': {
        color: '#9d00ff',
        enabled: true,
        fontWeight: 'bold'
    },
    'xl': {
        color: '#6e00ff',
        enabled: true,
        fontWeight: 'bold'
    },
    '2xl': {
        color: '#00ffff',
        enabled: true,
        fontWeight: 'bold'
    },

    // Pseudo-elements (Neon Red/Orange)
    'before': {
        color: '#ff0000',
        enabled: true,
        fontWeight: 'bold'
    },
    'after': {
        color: '#ff3300',
        enabled: true,
        fontWeight: 'bold'
    },
    'placeholder': {
        color: '#ff6600',
        enabled: true,
        fontWeight: 'bold'
    },
    'first-letter': {
        color: '#ff9900',
        enabled: true,
        fontWeight: 'bold'
    },
    'first-line': {
        color: '#ffcc00',
        enabled: true,
        fontWeight: 'bold'
    },

    // Interactive states (Neon Green)
    'hover': {
        color: '#00ff00',
        enabled: true,
        fontWeight: 'bold'
    },
    'focus': {
        color: '#00ff33',
        enabled: true,
        fontWeight: 'bold'
    },
    'active': {
        color: '#00ff66',
        enabled: true,
        fontWeight: 'bold'
    },
    'visited': {
        color: '#00ff99',
        enabled: true,
        fontWeight: 'bold'
    },
    'target': {
        color: '#00ffcc',
        enabled: true,
        fontWeight: 'bold'
    },

    // Group/Peer states (Electric Blue)
    'group-hover': {
        color: '#00ccff',
        enabled: true,
        fontWeight: 'bold'
    },
    'group-focus': {
        color: '#0099ff',
        enabled: true,
        fontWeight: 'bold'
    },
    'peer-hover': {
        color: '#0066ff',
        enabled: true,
        fontWeight: 'bold'
    },
    'peer-focus': {
        color: '#0033ff',
        enabled: true,
        fontWeight: 'bold'
    },

    // Dark mode (Neon Yellow)
    'dark': {
        color: '#ffff00',
        enabled: true,
        fontWeight: 'bold'
    },
    'light': {
        color: '#ffff33',
        enabled: true,
        fontWeight: 'bold'
    },

    // Form states (UV Purple)
    'disabled': {
        color: '#cc00cc',
        enabled: true,
        fontWeight: 'bold'
    },
    'checked': {
        color: '#9900cc',
        enabled: true,
        fontWeight: 'bold'
    },
    'required': {
        color: '#6600cc',
        enabled: true,
        fontWeight: 'bold'
    },
    'valid': {
        color: '#3300cc',
        enabled: true,
        fontWeight: 'bold'
    },
    'invalid': {
        color: '#0000cc',
        enabled: true,
        fontWeight: 'bold'
    },

    // Print/Orientation (Bright White)
    'print': {
        color: '#ffffff',
        enabled: true,
        fontWeight: 'bold'
    },
    'landscape': {
        color: '#f0f0f0',
        enabled: true,
        fontWeight: 'bold'
    },
    'portrait': {
        color: '#e0e0e0',
        enabled: true,
        fontWeight: 'bold'
    },

    // Direction (Neon Orange)
    'rtl': {
        color: '#ff6600',
        enabled: true,
        fontWeight: 'bold'
    },
    'ltr': {
        color: '#ff9900',
        enabled: true,
        fontWeight: 'bold'
    }
} as const;

export type ThemeType = 'default' | 'neon';
export const themes: Record<ThemeType, Record<string, PrefixConfig>> = {
    default: defaultTheme,
    neon: neonTheme
};

export type TailwindPrefix = keyof typeof defaultTheme;