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

export type TailwindPrefix = keyof typeof defaultTheme;