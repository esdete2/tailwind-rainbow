export const defaultTheme = {
    // Responsive prefixes
    'xs': '#f979c8',    // Pink
    'sm': '#e879f9',    // Purple
    'md': '#c084fc',    // Purple/Violet
    'lg': '#a78bfa',    // Violet
    'xl': '#818cf8',    // Indigo
    '2xl': '#60a5fa',   // Blue

    // Pseudo-elements
    'before': '#fb7185', // Rose/Red
    'after': '#fb923c',  // Orange

    // States
    'hover': '#4ade80',  // Green
    'focus': '#a3e635',  // Lime
} as const;

export type TailwindPrefix = keyof typeof defaultTheme;