# Tailwind Rainbow 🌈

A VS Code extension that colorizes Tailwind CSS prefixes for better readability.

## Features

- 🎨 Colorizes Tailwind prefixes (hover, focus, sm, lg, etc.)
- 🎯 Multiple built-in color themes
- ⚙️ Fully customizable themes and patterns
- 🔌 API for other extensions to register themes
- 🖥️ Web app to easily create your own themes (coming soon)

## Usage

The extension automatically colorizes Tailwind prefixes in supported file types:

- HTML (.html, .htm)
- JavaScript/TypeScript (.js, .jsx, .ts, .tsx)
- Vue (.vue)
- Svelte (.svelte)
- Astro (.astro)
- PHP (.php)
- MDX (.mdx)

### Switching Themes

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "Tailwind Rainbow: Select Theme"
3. Choose from available themes

## Configuration

### Custom File Extensions

Add support for additional file extensions or disable existing ones:

```json
{
  "tailwindRainbow.fileExtensions": [
    "mustache", // Include .mustache files
    "twig", // Include .twig files
    "!astro" // Exclude .astro files
  ]
}
```

### Custom Themes

Create or override themes:

```json
{
  "tailwindRainbow.themes": {
    "custom": {
      "hover": {
        "color": "#ff0000",
        "fontWeight": "bold"
      }
    },
    "default": {
      "before": {
        "enabled": false
      }
    }
  }
}
```

### Custom Patterns

Configure how class names are detected. By default, the extension will detect class names in all kinds of strings (single quotes, double quotes, template literals) to maximize compatibility across different coding styles and frameworks.

```json
{
  "tailwindRainbow.patterns": {
    "default": {
      "regex": "(['\"`])((?:(?!\\1).)*?)\\1",
      "enabled": true
    }
  }
}
```

## Extension API

Other extensions can register custom themes:

Wait for Tailwind Rainbow to be activated:

```json
// package.json
{
  "activationEvents": ["onCommand:tailwind-rainbow.loadThemes"]
}
```

Register your theme:

```ts
// extension.ts
import * as vscode from "vscode";

export async function activate(context: vscode.ExtensionContext) {
  const tailwindRainbow = vscode.extensions.getExtension<any>(
    "esdete2.tailwind-rainbow"
  );

  if (tailwindRainbow) {
    tailwindRainbow.exports.registerTheme("myCustomTheme", {
      xs: { color: "#ff00ff", fontWeight: "bold" },
      // ...
    });
  }
}
```

## License

MIT License - see the [LICENSE](LICENSE) file for details
