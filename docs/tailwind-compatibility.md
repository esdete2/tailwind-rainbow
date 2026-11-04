# Tailwind syntax compatibility

This extension colors source text using its configured theme. It does not compile
Tailwind, validate utility existence or load a project's Tailwind configuration.
The matrix separates grammar recognition from default color coverage. Both
documented important syntaxes work without a version switch.

| Feature                     | v3                                                        | v4                                                                                                             | Extension behavior                                                                                                                                                |
| --------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Important                   | `!flex`, `hover:!flex`                                    | v4.0 recommends `flex!`, `hover:flex!`; the v3 form remains supported but deprecated.                          | Both positions work. The marker has its own range; utility lookup excludes it.                                                                                    |
| Prefix/namespace            | `hover:tw-flex` with `prefix: 'tw-'`                      | v4.0 uses `tw:hover:flex`; namespace comes first.                                                              | Source segments and important markers parse. Automatic prefix/namespace normalization is deferred; exact base rules such as `tw-flex` can be supplied by a theme. |
| Variable shorthand          | `bg-[--brand]`                                            | v4.0 uses `bg-(--brand)`                                                                                       | Both remain one utility token, using ordinary exact/base-wildcard lookup.                                                                                         |
| Typed variable              | `text-[length:var(--size)]`                               | v4.0 supports `text-(length:--size)`                                                                           | Grouped colons are protected. Both forms can match `text-*`; no new arbitrary-color category is inferred.                                                         |
| Arbitrary property/selector | `[color:var(--brand)]`, `[&:hover]:flex`                  | Remains available.                                                                                             | Brackets, parentheses, quoted/escaped delimiters and protected literal `!` work. Whole bracketed properties/selectors retain the arbitrary theme rule.            |
| Variant composition         | Applied right to left by Tailwind.                        | v4.0 applies left to right; order-sensitive combinations can need reversing.                                   | Written order is preserved. No CSS selector evaluation or automatic migration.                                                                                    |
| New variants                | Smaller built-in set.                                     | v4.0 adds `not-*`, `in-*`, `nth-*`, `starting:`, `inert:` and `**:`.                                           | Generic names tokenize. Default `not-hover:`, `in-focus:` and `**:` already resolve; many others need theme entries. Palette expansion is deferred.               |
| Container queries           | Available through a plugin.                               | Built in from v4.0, including `@sm:@max-md:flex`.                                                              | Segments tokenize, but default container palette rules are absent. Named variants retain `/name`.                                                                 |
| Dynamic values              | Many values need configuration or arbitrary syntax.       | v4.0 permits more direct values, e.g. `w-17`, `grid-cols-15`, `data-current:…`.                                | No finite utility whitelist. Coloring depends on theme rules; new data variants do not automatically receive colors.                                              |
| Later v4 variants           | Not built in.                                             | v4.1 adds `pointer-*`, `any-pointer-*`, `details-content:` and others.                                         | Generic token boundaries work; palette additions are deferred.                                                                                                    |
| CSS class lists             | `@apply` and configuration safelists.                     | `@apply` remains; v4.1 adds `@source inline("hover:flex")` and brace expansion.                                | `@apply` works outside comments/literals. Source-inline discovery/expansion is deferred. Ordinary source paths are not class lists.                               |
| Customization               | Primarily JavaScript configuration, plugins and `@layer`. | v4.0 adds CSS-first `@theme`, `@utility`, `@custom-variant`; legacy JS config can be explicitly loaded.        | Automatic CSS configuration/custom-variant discovery is deferred. Extension theme rules can be configured directly.                                               |
| Renames/defaults            | Earlier names and scales.                                 | Examples: `shadow-sm` → `shadow-xs`, old `outline-none` behavior → `outline-hidden`, default `ring` 3px → 1px. | No class migration or CSS simulation. Exact theme rules may need updating; wildcards retain ordinary matching.                                                    |

The default theme leaves its base section empty: a utility can parse correctly
without receiving standalone color. A styled variant can extend through an
unstyled base. Whole arbitrary properties and important markers have their own
theme sections.

## Important ranges

Offsets count UTF-16 code units with an excluded end:

| Source        | Styled base                                 | Unstyled base with enabled hover styling                         |
| ------------- | ------------------------------------------- | ---------------------------------------------------------------- |
| `hover:!flex` | `hover:` [0,6), `!` [6,7), `flex` [7,11).   | Hover fragments [0,6) and [7,11), plus independent marker [6,7). |
| `hover:flex!` | `hover:` [0,6), `flex` [6,10), `!` [10,11). | Hover fragment [0,10), plus marker [10,11).                      |

Disabled important styling leaves the marker unstyled; class decorations still
exclude it. Exact/wildcard utility lookup receives the class without its marker.
Disabled prefix/base rules retain their established priority.

`!hover:flex` is accepted as extension compatibility syntax. It is not the
documented v3 variant placement or recommended v4 form and is tested separately.
Lone/repeated markers produce no fragments. Escaped/quoted `!` inside protected
values is literal content. Incomplete groups can produce bounded partial
fragments while typing; mismatched closing delimiters are rejected. ASCII space,
tab, CR and LF separate words, including inside incomplete groups. This is not
full CSS validation. Incomplete document-level quote recovery remains separate.

## Verification and scope

`tests/compatibility.test.mjs` checks exact parser spans, marker positions,
prefixed strings, theme disabling, fallback splits, grouped values, escapes and
UTF-16 offsets. `tests/host/review.cjs` checks ranges in real VS Code documents.
The historical class fixture is unchanged; its lone-marker exception is replaced
by the desired no-fragments assertion. The [benchmark report](../benchmarks/tailwind-syntax/README.md)
compares with the six-review-fix stage. SDD plan: `20261024-092359-d-ops-1rg`.

Other GitHub requests remain deferred for product-scope review. This matrix does
not imply complete v3/v4 compiler, configuration or palette compatibility.

## Official sources

- [v3 important, prefix and separator configuration](https://v3.tailwindcss.com/docs/configuration#important-modifier)
- [v4 upgrade guide: markers, prefixes, values, variant order and renames](https://tailwindcss.com/docs/upgrade-guide)
- [Typed arbitrary values and custom utilities](https://tailwindcss.com/docs/adding-custom-styles)
- [Font-size variable shorthand](https://tailwindcss.com/docs/font-size#using-a-custom-value)
- [v4.0 additions](https://tailwindcss.com/blog/tailwindcss-v4)
- [Container queries](https://tailwindcss.com/docs/responsive-design#container-queries)
- [v4.1 additions and source-inline safelists](https://tailwindcss.com/blog/tailwindcss-v4-1)
- [Source-inline syntax and brace expansion](https://tailwindcss.com/docs/detecting-classes-in-source-files#safelisting-specific-utilities)

The versioned release posts distinguish introductions in v4.0 and v4.1;
unversioned documentation describes the current v4 family.
