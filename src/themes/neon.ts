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

