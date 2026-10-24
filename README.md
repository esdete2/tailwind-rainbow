# Tailwind Rainbow

Color Tailwind class variants, important markers and optional utility patterns in
VS Code. Choose a built-in theme or supply your own colors.

<p align="center">
  <img src="https://github.com/esdete2/tailwind-rainbow/blob/main/images/example.png?raw=true" alt="Tailwind Rainbow class highlighting">
</p>

## Installation

Requires **VS Code 1.96 or newer**. Install
[Tailwind Rainbow from the Marketplace](https://marketplace.visualstudio.com/items?itemName=esdete.tailwind-rainbow),
then open a supported file. Unsaved documents work when their language mode is
supported, such as HTML or TypeScript React.

For a local `.vsix`, run **Extensions: Install from VSIX…** from the Command
Palette and select the package. Reload the window if prompted.

## Highlighting

```html
<div class="sm:hover:bg-blue-500 hover:!text-white hover:text-white!"></div>
<div class="[aspect-ratio:1/8] [&:hover]:block"></div>
```

- Each recognized variant, such as `sm:` or `hover:`, uses its theme rule.
- Both built-in themes, `default` and `synthwave`, leave `base` empty. Ordinary
  standalone utilities such as `flex` and `bg-blue-500` need a custom base rule
  to receive color. Whole arbitrary properties and selectors use `arbitrary`.
- When the final variant is styled and the utility has no active base rule, that
  variant can color the utility too. With the default theme, `sm:hover:bg-blue-500` has separate `sm:`
  and `hover:bg-blue-500` fragments.
- When a base rule is active, the variant and utility have separate fragments:
  `hover:` and `bg-blue-500` with a matching `bg-*` rule.

### Important modifiers and variable values

Both documented important positions work without choosing a Tailwind version:

```html
<div class="!flex hover:!flex flex! hover:flex!"></div>
<div class="hover:text-(length:--size) hover:bg-(--brand)"></div>
```

Tailwind v3 uses `!flex` and `hover:!flex`; v4 recommends `flex!` and `hover:flex!`.
The `!` marker uses the `important` rule separately from the utility. Variant and
base decorations exclude it even when important styling is disabled. The older
extension form `!hover:flex` remains accepted as compatibility syntax.

Bracketed and parenthesized values protect internal colons, quotes and escaped
delimiters. For example, `text-(length:--size)` stays one utility and can match
`text-*`. Likewise, `bg-[var(--brand)]` and `bg-(--brand)` can match `bg-*`;
they do not automatically use the whole-property `arbitrary` rule.

### Class contexts

Highlighting applies to configured class attributes and properties, recognized
function arguments, template tags, named class-containing collections and CSS
`@apply` directives. Typical contexts include:

```tsx
const button = <div className="hover:bg-blue-500" />;
const merged = clsx('sm:flex', 'hover:text-white');
const tagged = tw`md:grid hover:bg-blue-500`;
const variants = { primary: 'hover:bg-blue-500' };
```

```css
.button {
  @apply sm:flex hover:bg-blue-500;
}
/* @apply hover:bg-red-500; */
```

Ordinary strings and templates without a recognized class context stay
uncolored. A variable name suffix such as `buttonClasses` alone does not create
a class context. Arbitrary member calls such as `classList.add(...)` are not
automatically recognized. CSS directives inside comments and string literals
are ignored.

Detection uses bounded context heuristics rather than a complete language
parser. Both the document-length guard and editor offsets count UTF-16 code
units. Class lists longer than 5,000 code units are skipped.

### Tailwind coverage

The extension colors source text according to its theme. It does not compile
Tailwind, validate whether a utility exists or load a project's Tailwind
configuration. Grammar support and available colors are separate: new variant
names may need custom prefix rules.

Automatic v3 prefix/v4 namespace normalization, additional v4 variant palettes,
CSS configuration/custom-variant discovery and `@source inline()` class-list
expansion remain outside the implemented coverage. This is not complete
Tailwind v4 compiler or configuration support. See the official
[Tailwind upgrade guide](https://tailwindcss.com/docs/upgrade-guide) for framework
migration details.

## Themes and settings

Run **Tailwind Rainbow: Select Theme** in the Command Palette, or set
`tailwindRainbow.theme` to `default`, `synthwave` or your custom theme name.
Set `tailwindRainbow.enabled` to `false` to remove decorations; setting it back
to `true` restores highlighting.

### Custom themes

Add a theme or override sections of an existing theme in `settings.json`:

```json
{
  "tailwindRainbow.themes": {
    "myTheme": {
      "prefix": {
        "sm": { "color": "#0000ff" },
        "hover": { "color": "#ff0000", "fontWeight": "bold" },
        "min-*": { "color": "#00ffff" }
      },
      "base": {
        "bg-*": { "color": "#ff6600", "fontWeight": "semibold" },
        "text-*": { "color": "#6600ff" }
      },
      "arbitrary": { "color": "#ff00ff", "fontWeight": "bold" },
      "important": { "color": "#ff0000", "fontWeight": "bold" }
    }
  },
  "tailwindRainbow.theme": "myTheme"
}
```

Settings overlays can be removed without retaining stale rules. Themes
registered through the extension API survive settings reloads.

### Rule priority and wildcards

The `important` and whole-bracket `arbitrary` rules have their own styling roles.
Whole bracketed selectors/properties resolve through `arbitrary` before ordinary
exact-name lookup. For other variants, lookup proceeds through:

1. Applicable special `arbitrary` or `important` sections.
2. The exact prefix name, such as `group-hover/button`.
3. An exact name after removing configured ignored modifiers, such as `hover/button`.
4. An exact name after removing its group suffix, such as `hover`.
5. A wildcard based on the first component of the original prefix, such as `group-*`.

Ordinary utilities use an exact base rule first, then a wildcard based on their
first component. `bg-*` matches `bg-blue-500`, `bg-gradient-to-r` and
`bg-[#ff0000]`; `min-*` matches `min-w-full` and `min-w-[100px]`. These are
first-component rules, not general glob patterns: `min-w-*` is not a fallback
for `min-w-full`.

An exact match with `enabled: false` blocks lower-priority matches for that
lookup. A surrounding styled variant can still extend through an unstyled
utility. Ignored modifiers are removed in configured order for lookup; the
source text, including names such as `group-hover/button`, remains intact.

### Detection settings

These arrays replace the corresponding defaults. Include any existing names you
want to keep when customizing them.

```json
{
  "tailwindRainbow.classIdentifiers": ["class", "className", "classes", "style"],
  "tailwindRainbow.classFunctions": ["cn", "clsx", "cva", "twMerge", "tw"],
  "tailwindRainbow.templatePatterns": ["tw`", "css`", "styled"],
  "tailwindRainbow.contextPatterns": ["variants", "classes", "styles"],
  "tailwindRainbow.ignoredPrefixModifiers": ["group", "peer", "has", "in", "not"]
}
```

| Setting                  | Meaning                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `classIdentifiers`       | Literal, case-insensitive class attribute/property and collection names. `regex:` identifiers are unsupported.  |
| `classFunctions`         | Case-sensitive function names whose open argument lists may contain class strings.                              |
| `templatePatterns`       | Case-sensitive tag names. A trailing backtick is optional; `styled` also matches member tags like `styled.div`. |
| `contextPatterns`        | Case-sensitive names for class-containing arrays/objects, rather than nearby substring matches.                 |
| `ignoredPrefixModifiers` | Ordered regular-expression fragments removed from the start of a prefix during theme lookup.                    |
| `maxFileSize`            | Maximum document length in UTF-16 code units; defaults to 1,000,000.                                            |

### Supported languages

The default `tailwindRainbow.languages` list includes:

- HTML, JavaScript, TypeScript and React JSX/TSX.
- Vue, Svelte, Astro and PHP templates.
- CSS, SCSS, Sass, Less, Stylus, PostCSS and the `tailwindcss` language mode.

Change the list to select the language identifiers where highlighting runs.

## Performance

In the recorded Apple M3 Max / VS Code 1.142 benchmark, processing a large HTML
corpus of roughly 950,000 UTF-16 code units decreased from about 1.3 seconds to
about 50 milliseconds. These measure tokenizer and range-assembly calls;
debounce, decoration application, document creation and file IO are excluded.
Results depend on the document and environment and are not edit-to-paint timing.

## Extension API

Other extensions can register themes after activation:

```ts
import * as vscode from 'vscode';

export async function activate() {
  const extension = vscode.extensions.getExtension('esdete.tailwind-rainbow');
  if (!extension) return;
  const api = await extension.activate();
  api.registerTheme('myCustomTheme', {
    prefix: { hover: { color: '#ff0000', fontWeight: 'bold' } },
    base: { 'bg-*': { color: '#00ff00' } },
    arbitrary: { color: '#0000ff' },
    important: { color: '#ff00ff' },
  });
}
```

The API also exposes `getThemes()`, `clearThemes()` and `getTokenRanges(editor)`.

## Contributing

Report bugs or propose features through
[GitHub Issues](https://github.com/esdete2/tailwind-rainbow/issues). Development
uses Node 24.22.1 and pnpm 10.33.0; run `pnpm install --frozen-lockfile`,
`pnpm test`, `pnpm run test:host` and `pnpm run build` for installation, strict
tests, real-editor checks and local packaging. The repository's
`docs/toolchain.md` describes the full development workflow.

## License

[Apache 2.0](LICENSE).
