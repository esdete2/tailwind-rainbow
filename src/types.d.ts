interface PrefixConfig {
  color: string;
  enabled?: boolean;
  fontWeight?: 'normal' | 'bold' | 'lighter' | 'bolder' | 'thin' | 'extralight' | 'light' | 'medium' | 'semibold' | 'extrabold' | 'black' |
  '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
}

interface Theme {
  [key: string]: PrefixConfig;
}

interface RegexPattern {
  regex: string;
  enabled: boolean;
}

interface ExtensionAPI {
  registerTheme: (name: string, theme: Theme) => void;
}
