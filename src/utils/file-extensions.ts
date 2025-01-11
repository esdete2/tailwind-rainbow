const DEFAULT_EXTENSIONS = [
  "htm",
  "html",
  "js",
  "jsx",
  "ts",
  "tsx",
  "mdx",
  "vue",
  "svelte",
  "astro",
  "php"
] as const;

export function mergeFileExtensions(userExtensions: string[]): string[] {
  const negated = new Set(
    userExtensions
      .filter(ext => ext.startsWith('!'))
      .map(ext => ext.slice(1))
  );

  return [
    ...DEFAULT_EXTENSIONS.map(ext => `*.${ext}`),
    ...userExtensions
      .filter(ext => !ext.startsWith('!'))
      .map(ext => `*.${ext}`)
  ].filter(ext => !negated.has(ext.replace(/^\*\./, '')));
} 