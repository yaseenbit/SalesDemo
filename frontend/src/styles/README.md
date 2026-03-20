# Styling Guide

This app uses layered CSS plus page/component CSS Modules.

## Import order

Global style files are imported in this order in `frontend/src/main.tsx`:

1. `frontend/src/styles/tokens.css`
2. `frontend/src/styles/base.css`
3. `frontend/src/styles/layout.css`
4. `frontend/src/styles/components.css`
5. `frontend/src/styles.css`

Keep this order. Later layers can intentionally override earlier layers.

## Which file to use

### `tokens.css`

Use for design tokens only:

- CSS custom properties like colors, spacing, shadows, z-index, radii
- typography scale variables
- theme-level variables

Do not put selectors here.

### `base.css`

Use for global resets and element defaults:

- `*`, `html`, `body`, root defaults
- anchor/button/input base behavior
- very small global text utility classes that are truly app-wide

Do not add view or component layout rules.

### `layout.css`

Use for app-shell structure only:

- header
- sidebar
- main content frame
- top-level responsive shell behavior

Do not add page content rules.

### `components.css`

Use for reusable cross-page primitives:

- panel/card wrappers
- shared form primitives (`field`, `form-grid`)
- shared buttons and badges
- shared summary/totals blocks

Only keep classes that are reused in multiple pages/components.

### `styles.css`

Use as a thin page-level override layer.

- temporary shared overrides during migration
- avoid adding new broad selectors here unless truly cross-page

Goal: keep this file small.

### `*.module.css` (preferred for new work)

Use for page/component-specific styling.

- colocate with the TSX file
- import as `styles` and reference with `styles.className`
- keep selectors scoped to that feature only

Examples:

- `frontend/src/pages/customers/CustomerListPage.module.css`
- `frontend/src/pages/pos/PosSalesPage.module.css`
- `frontend/src/components/SalesOrderPanel.module.css`

## Naming conventions

### Global classes

Use readable, existing BEM-like names when needed:

- `panel__header`
- `metric-row--total`

Do not invent one-off global classes for a single page.

### CSS Modules

Use camelCase class keys:

- `quickActions`
- `posItemRowRecent`
- `customerTableScroll`

## Decision checklist before adding CSS

1. Is it a token/value? -> `tokens.css`
2. Is it reset/base element behavior? -> `base.css`
3. Is it shell-level layout? -> `layout.css`
4. Is it reused across many screens? -> `components.css`
5. Is it specific to one page/component? -> `*.module.css`
6. If none match and temporary only -> `styles.css` with cleanup follow-up

## Migration checklist for legacy global selectors

1. Find the selector usage with grep.
2. Confirm if it is shared or single-view.
3. Move single-view rules to colocated `*.module.css`.
4. Update TSX `className` to `styles.*`.
5. Remove old global selectors.
6. Build and verify.

## Guardrails

- Default to CSS Modules for new view work.
- Keep `components.css` focused on reusable primitives.
- Keep `styles.css` minimal and shrinking over time.

