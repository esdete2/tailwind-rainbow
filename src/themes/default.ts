export const defaultTheme: Record<string, PrefixConfig> = {
  // responsive
  'min-*': {
    color: '#d18bfa',
    fontWeight: '700',
  },
  sm: {
    color: '#d18bfa',
    fontWeight: '700',
  },
  md: {
    color: '#b88bfa',
    fontWeight: '700',
  },
  lg: {
    color: '#a78bfa',
    fontWeight: '700',
  },
  xl: {
    color: '#8b8bfa',
    fontWeight: '700',
  },
  '2xl': {
    color: '#8b9dfa',
    fontWeight: '700',
  },

  'max-*': {
    color: '#d18bfa',
    fontWeight: '700',
  },
  'max-sm': {
    color: '#d18bfa',
    fontWeight: '700',
  },
  'max-md': {
    color: '#b88bfa',
    fontWeight: '700',
  },
  'max-lg': {
    color: '#a78bfa',
    fontWeight: '700',
  },
  'max-xl': {
    color: '#8b8bfa',
    fontWeight: '700',
  },
  'max-2xl': {
    color: '#8b9dfa',
    fontWeight: '700',
  },

  // pseudo
  before: {
    color: '#ffa357',
    fontWeight: '700',
  },
  after: {
    color: '#f472b6',
    fontWeight: '700',
  },

  // interactive
  hover: {
    color: '#4ee585',
    fontWeight: '700',
  },
  focus: {
    color: '#4ee6b8',
    fontWeight: '700',
  },
  active: {
    color: '#49d5e0',
    fontWeight: '700',
  },

  // modes
  dark: {
    color: '#a5b6cd',
    fontWeight: '700',
  },

  // form
  placeholder: {
    color: '#ffe279',
    fontWeight: '700',
  },
  checked: {
    color: '#e3f582',
    fontWeight: '700',
  },
  valid: {
    color: '#c8f66c',
    fontWeight: '700',
  },
  invalid: {
    color: '#ff8d8d',
    fontWeight: '700',
  },
  disabled: {
    color: '#ff7777',
    fontWeight: '700',
  },
  required: {
    color: '#ff6969',
    fontWeight: '700',
  },

  // selection
  first: {
    color: '#7dd3fc',
    fontWeight: '700',
  },
  last: {
    color: '#4cc7fc',
    fontWeight: '700',
  },
  only: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  odd: {
    color: '#24b0f0',
    fontWeight: '700',
  },
  even: {
    color: '#0ea5e9',
    fontWeight: '700',
  },
} as const;
