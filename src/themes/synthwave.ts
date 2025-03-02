export const synthwaveTheme: Record<string, PrefixConfig> = {
  // responsive
  sm: {
    color: '#ff71ce',
    fontWeight: '700',
  },
  md: {
    color: '#ff2fb9',
    fontWeight: '700',
  },
  lg: {
    color: '#ff00a4',
    fontWeight: '700',
  },
  xl: {
    color: '#df008f',
    fontWeight: '700',
  },
  '2xl': {
    color: '#bf007a',
    fontWeight: '700',
  },

  'max-sm': {
    color: '#ff71ce',
    fontWeight: '700',
  },
  'max-md': {
    color: '#ff2fb9',
    fontWeight: '700',
  },
  'max-lg': {
    color: '#ff00a4',
    fontWeight: '700',
  },
  'max-xl': {
    color: '#df008f',
    fontWeight: '700',
  },
  'max-2xl': {
    color: '#bf007a',
    fontWeight: '700',
  },

  // pseudo
  before: {
    color: '#ff9e4f',
    fontWeight: '700',
  },
  after: {
    color: '#ff6b21',
    fontWeight: '700',
  },

  // interactive
  hover: {
    color: '#b967ff',
    fontWeight: '700',
  },
  focus: {
    color: '#a742ff',
    fontWeight: '700',
  },
  active: {
    color: '#951dff',
    fontWeight: '700',
  },

  // modes
  dark: {
    color: '#5d6ca7',
    fontWeight: '700',
  },

  // form
  placeholder: {
    color: '#ff2182',
    fontWeight: '700',
  },
  checked: {
    color: '#ff1e69',
    fontWeight: '700',
  },
  valid: {
    color: '#ff1a50',
    fontWeight: '700',
  },
  invalid: {
    color: '#ff1737',
    fontWeight: '700',
  },
  disabled: {
    color: '#ff141e',
    fontWeight: '700',
  },
  required: {
    color: '#ff1105',
    fontWeight: '700',
  },

  // selection
  first: {
    color: '#00ffff',
    fontWeight: '700',
  },
  last: {
    color: '#00e5ff',
    fontWeight: '700',
  },
  only: {
    color: '#00ccff',
    fontWeight: '700',
  },
  odd: {
    color: '#00b2ff',
    fontWeight: '700',
  },
  even: {
    color: '#0099ff',
    fontWeight: '700',
  },
} as const;
