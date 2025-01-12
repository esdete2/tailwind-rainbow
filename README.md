# Tailwind Rainbow 🌈

A VS Code extension that colorizes Tailwind CSS prefixes for better readability.

## Features

- 🎨 Colorizes Tailwind prefixes (hover, focus, sm, lg, etc.)
- 🎯 Multiple built-in color themes
- ⚙️ Fully customizable themes and patterns
- 🔌 API for other extensions to register themes
- 🖥️ Web app to easily create your own themes (coming soon)

## Configuration

### Switching Themes

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "Tailwind Rainbow: Select Theme"
3. Choose from available themes

### Supported Languages

Configure which languages the extension should be active for. Default languages are:

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
  ]
}
```

The extension uses VS Code's built-in language identifiers. You can find the language identifier for your file by:
1. Opening the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Running "Change Language Mode"
3. The items in the list are the language identifiers you can use

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
