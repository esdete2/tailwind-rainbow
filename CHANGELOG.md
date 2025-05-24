# Change Log

All notable changes to the "tailwind-rainbow" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

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