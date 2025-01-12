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