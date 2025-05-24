# Tailwind Rainbow

A VS Code extension that provides syntax highlighting for Tailwind CSS classes with customizable coloring themes.

<p align="center">
  <img src="https://github.com/esdete2/tailwind-rainbow/blob/main/images/example.png?raw=true">
</p>

## Features

- 🟣 **Prefix-based coloring**: Colors Tailwind prefixes (hover, focus, sm, lg, etc.) individually
- 🔵 **Arbitrary values**: Highlights arbitrary prefix values ([&.show])
- 🟠 **Optional base class support**: Highlights base classes with wildcard patterns (bg-*, text-*, etc.)
- 🟡 **Smart detection**: Works in HTML, JSX, template literals, CSS @apply directives, and more
- 🟢 **Fully configurable**: Customize patterns, functions, and detection logic

## Supported File Types

- HTML, JavaScript, TypeScript
- React (JSX/TSX), Vue, Svelte, Astro
- PHP templates
- CSS, SCSS, Sass, Less, Stylus, PostCSS
- Template literals and CSS-in-JS

## Installation

1. Install from the VS Code marketplace
2. Open a file with Tailwind CSS classes
3. Classes will be automatically highlighted based on their prefixes

## Configuration

### Switching Themes

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "Tailwind Rainbow: Select Theme"
3. Choose from available themes: `default`, `synthwave`

### Supported Languages

Configure which file types to process:

```json
{
  "tailwindRainbow.languages": [
    "html",
    "javascript",
    "typescript",
    "javascriptreact",
    "typescriptreact",
    "vue",
    "svelte",
    "astro",
    "php",
    "css",
    "scss",
    "sass",
    "less",
    "stylus",
    "postcss"
  ]
}
```

### Custom Themes

Create or override themes with the following structure:

```json
{
  "tailwindRainbow.themes": {
    "myTheme": {
      "prefix": {
        "hover": { "color": "#ff0000", "fontWeight": "bold" },
        "focus": { "color": "#00ff00", "fontWeight": "normal" },
        "sm": { "color": "#0000ff" },
        "lg": { "color": "#ffff00" }
      },
      "base": {
        "bg-*": { "color": "#ff6600", "fontWeight": "semibold" },
        "text-*": { "color": "#6600ff" },
        "p-*": { "color": "#00ffff" }
      },
      "arbitrary": { "color": "#ff00ff", "fontWeight": "italic" },
      "important": { "color": "#ff0000", "fontWeight": "bold" }
    }
  },
  "tailwindRainbow.theme": "myTheme"
}
```

### Advanced Configuration

#### Class Detection Patterns

Customize how classes are detected in different contexts:

```json
{
  "tailwindRainbow.classIdentifiers": [
    "class",
    "className",
    "class:",
    "className:",
    "classlist",
    "classes",
    "css",
    "style"
  ],
  "tailwindRainbow.classFunctions": ["cn", "clsx", "cva", "classNames", "classList", "twMerge", "tw", "styled", "css"],
  "tailwindRainbow.templatePatterns": ["class", "${", "tw`", "css`", "styled"],
  "tailwindRainbow.contextPatterns": ["variants", "cva", "class", "css", "style", "@apply"]
}
```

#### Ignored Prefix Modifiers

Configure which prefix modifiers to ignore during parsing. For example, when using Tailwind's `group-hover` pattern the extension will ignore the `group` modifier and color the entire prefix with the `hover` color:

```json
{
  "tailwindRainbow.ignoredPrefixModifiers": ["group", "peer", "has", "in", "not"]
}
```

## Extension API

Other extensions can register custom themes:

```ts
// Wait for activation
const tailwindRainbow = vscode.extensions.getExtension('esdete.tailwind-rainbow');
if (tailwindRainbow && !tailwindRainbow.isActive) {
  await tailwindRainbow.activate();
}

// Register theme
const api = tailwindRainbow?.exports;
if (api) {
  api.registerTheme('myCustomTheme', {
    prefix: {
      hover: { color: '#ff0000', fontWeight: 'bold' },
      // ... more prefixes
    },
    base: {
      'bg-*': { color: '#00ff00' },
      // ... more base patterns
    },
    arbitrary: { color: '#0000ff' },
    important: { color: '#ff00ff' },
  });
}
```

## Contributing

You have an idea for a new feature or found a bug? Feel free to open an issue or submit a pull request!

- Report bugs or request features via [GitHub Issues](https://github.com/esdete2/tailwind-rainbow/issues)
- Submit pull requests with improvements
- Share your custom themes with the community

## License

Apache 2.0 License - see the [LICENSE](LICENSE) file for details
