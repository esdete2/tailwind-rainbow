export const cases = [
  { name: 'html-small', size: 10000, language: 'html' },
  { name: 'html-medium', size: 100000, language: 'html' },
  { name: 'tsx-medium', size: 100000, language: 'typescriptreact' },
  { name: 'css-medium', size: 100000, language: 'css' },
  { name: 'html-large', size: 950000, language: 'html' },
  { name: 'repeated-variants', size: 100000, language: 'html', stress: true },
];

export function corpus({ size, language, stress }) {
  const classes = stress
    ? Array(12).fill('hover:bg-red-500').join(' ')
    : "sm:flex md:grid lg:hover:bg-red-500 dark:text-white group-hover/item:block before:content-['x']";
  const row =
    language === 'css'
      ? `.item { @apply ${classes}; }\n`
      : language === 'typescriptreact'
        ? `const element = <div className="${classes}">日本語 😀</div>;\n`
        : `<div class="${classes}">日本語 😀</div>\n`;
  return row.repeat(Math.floor(size / row.length)).padEnd(size, ' ');
}
