# Collection definitions

The predefined collection names follow [Tailwind v4 documentation](https://tailwindcss.com/docs/styling-with-utility-classes). [Tailwind v3 documentation](https://v3.tailwindcss.com/docs/utility-first) supplies retained spellings such as container, bg-gradient-* and older ring/filter utilities. These definitions are family-based highlighting rules, not a complete Tailwind validator.

The authoritative data is [src/collections.ts](https://github.com/esdete2/tailwind-rainbow/blob/main/src/collections.ts). Exact names beat family matches, and longer literal family prefixes beat shorter ones when determining an unmodified predefined category. Equal matches use the category order below. Consequently border-collapse/border-spacing-* belong to Tables, bg-blend-* and text-shadow-* to Effects, and content-center to Flexbox & Grid. Replacing or emptying a definition does not move its original members into another predefined category.

In v4, display utilities (including bare flex/grid, sr-only and not-sr-only) belong to Layout. V3 documented screen-reader utilities under Accessibility. The accessibility collection here covers forced-color-adjust-*. Gap belongs to Flexbox & Grid; padding, margin and space-between utilities belong to Spacing. Namespace normalization and plugin/custom-utility discovery are not performed.

Configured arrays replace full definitions. Configured matches with a theme style are checked in written order before unmodified categories; an absent style is skipped, and enabled: false blocks lower-priority styles. Base rules and the arbitrary-property contract take priority.

Patterns are exact class names or literal prefixes ending in -*. No general glob or regex interpretation is used. Negative families are listed explicitly; built-in padding and border rules do not include negative forms. Bracketed/parenthesized values remain part of the utility. Invalid dynamic values can still match their spelling family.

## Predefined members

### layout

`aspect-*`, `container`, `columns-*`, `break-after-*`, `break-before-*`, `break-inside-*`, `box-decoration-*`, `box-border`, `box-content`, `block`, `inline-block`, `inline`, `flex`, `inline-flex`, `table`, `inline-table`, `table-caption`, `table-cell`, `table-column`, `table-column-group`, `table-footer-group`, `table-header-group`, `table-row-group`, `table-row`, `flow-root`, `grid`, `inline-grid`, `contents`, `list-item`, `hidden`, `sr-only`, `not-sr-only`, `float-*`, `clear-*`, `isolate`, `isolation-auto`, `object-*`, `overflow-*`, `overscroll-*`, `static`, `fixed`, `absolute`, `relative`, `sticky`, `inset-*`, `-inset-*`, `inset-x-*`, `inset-y-*`, `inset-s-*`, `inset-e-*`, `inset-bs-*`, `inset-be-*`, `top-*`, `-top-*`, `right-*`, `-right-*`, `bottom-*`, `-bottom-*`, `left-*`, `-left-*`, `start-*`, `-start-*`, `end-*`, `-end-*`, `visible`, `invisible`, `collapse`, `z-*`, `-z-*`

### flexboxGrid

`basis-*`, `flex-*`, `grow`, `grow-*`, `shrink`, `shrink-*`, `order-*`, `-order-*`, `grid-*`, `col-*`, `-col-*`, `row-*`, `-row-*`, `auto-cols-*`, `auto-rows-*`, `gap-*`, `justify-*`, `items-*`, `self-*`, `place-*`, `content-normal`, `content-center`, `content-start`, `content-end`, `content-between`, `content-around`, `content-evenly`, `content-baseline`, `content-stretch`

### spacing

`p-*`, `px-*`, `py-*`, `ps-*`, `pe-*`, `pbs-*`, `pbe-*`, `pt-*`, `pr-*`, `pb-*`, `pl-*`, `m-*`, `mx-*`, `my-*`, `ms-*`, `me-*`, `mbs-*`, `mbe-*`, `mt-*`, `mr-*`, `mb-*`, `ml-*`, `-m-*`, `-mx-*`, `-my-*`, `-ms-*`, `-me-*`, `-mbs-*`, `-mbe-*`, `-mt-*`, `-mr-*`, `-mb-*`, `-ml-*`, `space-*`, `-space-*`

### sizing

`size-*`, `w-*`, `min-w-*`, `max-w-*`, `h-*`, `min-h-*`, `max-h-*`, `is-*`, `min-is-*`, `max-is-*`, `bs-*`, `min-bs-*`, `max-bs-*`

### typography

`font-*`, `antialiased`, `subpixel-antialiased`, `italic`, `not-italic`, `normal-nums`, `ordinal`, `slashed-zero`, `lining-nums`, `oldstyle-nums`, `proportional-nums`, `tabular-nums`, `diagonal-fractions`, `stacked-fractions`, `tracking-*`, `-tracking-*`, `line-clamp-*`, `leading-*`, `list-*`, `text-*`, `underline`, `overline`, `line-through`, `no-underline`, `decoration-*`, `underline-offset-*`, `-underline-offset-*`, `uppercase`, `lowercase`, `capitalize`, `normal-case`, `indent-*`, `-indent-*`, `tab-*`, `align-*`, `whitespace-*`, `break-*`, `wrap-*`, `hyphens-*`, `content-*`, `truncate`

### backgrounds

`bg-*`, `from-*`, `via-*`, `to-*`

### borders

`rounded`, `rounded-*`, `border`, `border-*`, `divide-*`, `outline`, `outline-*`, `-outline-offset-*`, `ring`, `ring-*`, `inset-ring`, `inset-ring-*`

### effects

`shadow`, `shadow-*`, `inset-shadow`, `inset-shadow-*`, `text-shadow`, `text-shadow-*`, `opacity-*`, `mix-blend-*`, `bg-blend-*`, `mask-*`

### filters

`filter`, `filter-*`, `blur`, `blur-*`, `brightness-*`, `contrast-*`, `drop-shadow`, `drop-shadow-*`, `grayscale`, `grayscale-*`, `hue-rotate-*`, `-hue-rotate-*`, `invert`, `invert-*`, `saturate-*`, `sepia`, `sepia-*`, `backdrop-*`

### tables

`border-collapse`, `border-separate`, `border-spacing-*`, `table-auto`, `table-fixed`, `caption-*`

### transitionsAnimation

`transition`, `transition-*`, `duration-*`, `ease-*`, `delay-*`, `animate-*`

### transforms

`backface-*`, `perspective-*`, `rotate-*`, `-rotate-*`, `scale-*`, `-scale-*`, `skew-*`, `-skew-*`, `transform`, `transform-*`, `origin-*`, `translate-*`, `-translate-*`, `zoom-*`

### interactivity

`accent-*`, `appearance-*`, `caret-*`, `scheme-*`, `cursor-*`, `field-sizing-*`, `pointer-events-*`, `resize`, `resize-*`, `scroll-*`, `-scroll-m-*`, `-scroll-mx-*`, `-scroll-my-*`, `-scroll-ms-*`, `-scroll-me-*`, `-scroll-mt-*`, `-scroll-mr-*`, `-scroll-mb-*`, `-scroll-ml-*`, `scrollbar-*`, `snap-*`, `touch-*`, `select-*`, `will-change-*`

### svg

`fill-*`, `stroke-*`

### accessibility

`forced-color-adjust-*`
