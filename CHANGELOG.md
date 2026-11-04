# Change Log

All notable changes to the "tailwind-rainbow" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Add `tailwindRainbow.mode` with `class` (default) and `prefix` coloring modes. Explicit base, collection and important-marker styles remain independent.
- Add 15 predefined collections following Tailwind documentation categories, configurable collection arrays and per-theme collection styles. Arrays replace a predefined definition or add a custom one; empty arrays empty it.

## [0.3.0] - 2026-11-04

### Added

- Support documented Tailwind v3 and v4 important placement (`hover:!flex` and `hover:flex!`), with independent styling for the marker.
- Parse parenthesized variable values such as `text-(length:--size)` without treating internal colons as variant separators.
- Document the distinction between grammar support, theme coverage and deferred Tailwind features.

### Changed

- Split the TypeScript tokenizer into focused scanning, context, class parsing, theme and range modules.
- Replace pairwise range-overlap scans with an interval index. The recorded large-HTML tokenizer benchmark decreases from about 1.3 seconds to about 50 ms on Apple M3 Max / VS Code 1.142; timings exclude rendering and editor debounce.
- Clarify theme priority, first-component wildcard matching, detection settings and UTF-16 document-size units.

### Fixed

- Prevent unrelated strings and templates from being highlighted solely because their content resembles class syntax.
- Ignore CSS `@apply` directives inside comments and string literals, while preserving following valid directives.
- Keep important-marker and class fragments within their source boundaries without coloring the marker as part of a variant or utility.
- Remove decorations and cancel pending updates when disabled; restore highlighting when enabled.
- Preserve API-registered themes across configuration reloads and remove stale settings overlays.
- Highlight untitled documents with supported language modes.

### Development

- Update compatible compiler, lint, formatting, packaging and editor-test tools with Node 24.22.1 and pnpm 10.33.0.
- Retain VS Code 1.96 support and compatible Mocha 11; verify strict tests, real-editor checks and the legacy suite.
- Exclude compiled tests and other development artifacts from packaged extensions.

Additional GitHub feature requests, v4 palette expansion, automatic namespace normalization, CSS configuration discovery and `@source inline()` expansion remain deferred.

## [0.2.1]

### Fixed

- Recognize CSS `@apply` directives in documents using the `tailwindcss` language identifier.

## [0.2.0] - 2025-05-25

### Added

- **Base class pattern support**: Added wildcard pattern matching for base classes (e.g., `bg-*` matches `bg-blue-500`, `text-*` matches `text-red-400`)
- **Enhanced prefix matching**: Support for arbitrary prefixes with wildcard patterns (e.g., `min-[1920px]`, `[&.is-dragging]`)
- **Smart prefix vs arbitrary detection**: Distinguishes between multi-prefix cases and single-prefix with arbitrary values
- **CSS @apply directive support**: Syntax highlighting for Tailwind classes in CSS `@apply` directives
- **Template literal support**: Enhanced detection in `tw\``, `css\``, `styled`, and `className` template literals
- **Configurable detection patterns**: Added settings for `classIdentifiers`, `classFunctions`, `templatePatterns`, and `contextPatterns`
- **Universal selector support**: Added support for `*` and `**` prefixes as regular Tailwind prefixes

### Changed

- **Improved theme structure**: Updated theme schema to properly define `prefix`, `base`, `arbitrary`, and `important` sections
- **Enhanced tokenization performance**: Replaced regex-based parsing with optimized string operations for better performance
- **Better arbitrary value handling**: Improved parsing of classes with brackets and complex arbitrary values

## [0.1.1] - 2025-03-02

### Added

- Initial prefix-based syntax highlighting
- Basic theme support (default, synthwave)
- Language configuration
- Custom theme creation

---

For more details about changes, see the [GitHub repository](https://github.com/esdete2/tailwind-rainbow).
