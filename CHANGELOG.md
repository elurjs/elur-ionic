# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.2]

### Changed

- `peerDependencies`: `@elurjs/core` now requires `^4.0.5` — drops the Elur 3
  range so the package always resolves the v4 engine, which includes
  duplicate-instance detection. Projects still on Elur 3 should stay on
  `2.1.0`.

## [2.1.0]

### Added

- **DevTools plugin entry point** (`@elurjs/ionic/devtools`): dev-only module
  that registers an `Ionic` plugin on the elur DevTools backend hook
  (`window.__ELUR_DEVTOOLS_HOOK__`), exposing live `IonRouterOutlet`
  instances (cached views per tab with age/idle times, cache policy, tab
  stacks) and `NavigationManager` instances (per-tab stacks, `canGoBack`,
  transition state). Instances are tracked via global `Symbol.for`
  registries (`@elurjs/ionic/outlets`, `@elurjs/ionic/navigation`) populated
  in their constructors — negligible cost, no behavior or hot-path changes.
  Never loaded in production: `@elurjs/vite-plugin-elur` injects it
  automatically in dev mode (`devtools: "auto"`).

## [2.0.7]

### Added

- **Nix.js framework delegate for overlays** — `createPopover()` and
  `createModal()` now automatically inject a Nix.js `FrameworkDelegate`
  when `component` is a function (e.g. `() => html\`...\``). This fixes
  the `"framework delegate is missing"` error that occurred when passing
  Nix.js templates as overlay content. The delegate uses `mount()` to
  render the template inside the overlay and `unmount()` on dismiss.
- **Vite plugin warnings for unlisted icons** — when the plugin detects
  `name="icon-name"` on `<ion-icon>` in templates and the icon is not in
  `allowIcons`, it now emits a warning listing the icons and the file.
  This complements the existing tag warnings and helps catch missing
  icon registrations caused by lazy-loaded pages.

### Fixed

- **Tab IDs no longer have leading hyphens** — `_normalizePath("/search")`
  produced `-search` (with a leading `-`) because the leading `/` was
  replaced with `-`. Now `/search` → `search`, `/profile` → `profile`,
  and `/` → `root`. This fixes the `[ion-tabs] Tab with id: "undefined"
  does not exist` error that occurred on tab clicks.
- **Tab bar now renders at the bottom** — `ion-tabs` defaults to
  `display: block` with no explicit height, which collapsed the layout
  because `ion-router-outlet` is `position: absolute`. A small CSS
  snippet is now injected by `createTabsLayout()` to force `ion-tabs`
  into a flexbox column layout where the outlet fills the available
  space and the tab bar sits at the bottom.
- **Tab click no longer triggers Ionic's internal `select()`** — the
  `@click` handler on `ion-tab-button` now uses Nix.js event modifiers
  (`@click.prevent.stop`) to prevent Ionic's internal tab selection
  (which looks for `<ion-tab>` children we don't have). Navigation is
  driven entirely by the Nix.js router.
- **Invalid `import { foo as "string" }` syntax in generated module** —
  the Vite plugin was generating `import { alertCircleOutline as
  "alert-circle-outline" } from "ionicons/icons"` which is not valid
  JavaScript (alias must be an identifier, not a string). Now generates
  `import { alertCircleOutline } from "ionicons/icons"` and maps
  kebab-case names in the `registerIonicons({ ... })` call instead.

---

## [2.0.6]

### Added

- **Vite plugin warnings for unlisted tags** — when the plugin detects
  `<ion-*>` tags in templates that are not in `allowTags`, it now emits a
  warning listing the tags and the file. This helps catch missing
  registrations caused by lazy-loaded pages (the virtual module is served
  before all page files are scanned).
- **"New tags discovered after registration" warning** — if tags are found
  after the registration module was already served, the plugin warns that
  they were NOT included and the user should add them to `allowTags`.

---

## [2.0.5]

### Added

- **`cssVars` option in `BottomTabBarOptions`** — set CSS custom properties
  on `ion-tab-bar` for theming (`--background`, `--color-selected`, etc.).
- **`layout` option in `BottomTabBarOptions`** — configurable tab button
  layout: `icon-top` (default), `icon-start`, `icon-end`, `icon-bottom`,
  `icon-hide`, `label-hide`.
- **`badge` + `badgeColor` in `BottomTabItem`** — renders `<ion-badge>` inside
  tab buttons for notification counts.
- **`TabButtonLayout` type exported** for consumer type-safety.
- **`ion-buttons` registered as core component** in `initializeNixIonic()`.

### Fixed

- **Tab button `selected` property now set via JS (not attribute)** — Stencil
  boolean `@Prop` cannot be set via HTML attributes with Nix.js (`selected=""`
  is falsy in Stencil's coercion). `createBottomTabBar` now uses a `ref` +
  `effect` + `nextTick` to set `(btn as any).selected = isActive` directly on
  each `ion-tab-button` after DOM mount and on every route change. This
  triggers Stencil re-renders, applying internal classes (`tab-has-icon`,
  `tab-selected`, `tab-layout-icon-top`) correctly — fixing the icon resize
  and label layout shift.
- **Tab button class no longer overwritten** — removed `class=${...}` binding
  on `ion-tab-button` that was clobbering Stencil's internal host classes
  (`md`, `tab-has-icon`, `tab-layout-icon-top`, `hydrated`, etc.). Stencil
  manages these classes; external class binding destroyed them on route
  change, causing icon resize and label shift.
- **Initial load sync** — on first render, `tabBarRef.el` is null (template
  hasn't mounted). Added `nextTick` retry so `selected` is set after the DOM
  is ready.
- **`IonBackButton` now wrapped in `<ion-buttons slot="start">`** — without
  this wrapper, `ion-back-button` had no flex constraints and could expand
  to fill the toolbar width.
- **`createPicker` now uses `pickerController`** — Ionic 8's `ion-picker` is
  a wheel-style component without `columns`/`buttons`/`isOpen`. The legacy
  picker (with columns/buttons API) is accessed via `pickerController`, which
  creates `<ion-picker-legacy>` internally. `createPicker` now lazily
  registers `ion-picker-legacy`, `ion-picker-legacy-column`, and
  `ion-backdrop` via dynamic import (preserving tree-shaking).
- **Removed unused `createInlineOverlayHandle`** — dead code after picker
  migration to controller pattern.

### E2E verified

- 7 Playwright tests pass: tab bar positioning, `selected` property, icon
  size stability (0px diff on tab switch), internal Stencil classes,
  click switching.

---

## [2.0.4]

### Fixed

- **Tab button icon resize / text layout shift**: `ion-tab-button` uses a
  `selected` property (not just a CSS class) to trigger internal Stencil
  re-renders. Without `selected=true`, the component never re-renders, so
  `hasIcon`/`hasLabel` getters (which query the DOM for `ion-icon`/
  `ion-label`) are never re-evaluated. This caused the icon to render at
  the wrong size and the label to shift position. `createBottomTabBar` now
  sets `.selected` reactively based on the active route, in addition to
  the CSS class for backwards compatibility.
- **Tab button `layout` property**: explicitly set `layout="icon-top"` on
  each `ion-tab-button` to ensure the correct layout class
  (`tab-layout-icon-top`) is applied immediately, preventing layout shifts
  when the component re-renders.

---

## [2.0.3]

### Fixed

- **`createTabsLayout` now accepts `IonRouterOutlet`**: `IonRouterOutlet`
  extends `NixComponent`, not `NixTemplate`. `createTabsLayout` now accepts
  both `NixTemplate | NixComponent` and calls `render()` on the component
  to get the template.

---

## [2.0.2]

### Fixed

- **Tab bar layout**: `ion-tab-bar` without `ion-tabs` wrapper had no CSS
  positioning — it appeared at the top of the flex flow, behind
  `ion-router-outlet` (which is `position:absolute; inset:0`). Added
  `createTabsLayout(outlet, tabBar)` which wraps both in `<ion-tabs>`,
  providing the correct CSS layout context (flex column, `tabs-inner`
  with `flex:1`, `<slot name="bottom">` for the tab bar).
- **Tab bar icons**: `createBottomTabBar` uses dynamic `name=${() => tab.icon}`
  expressions which the Vite plugin cannot detect. Added `icons` option to
  `BottomTabBarOptions` — pass icon SVG data and `createBottomTabBar` calls
  `addIcons()` internally.

### Added

- **`createTabsLayout(outlet, tabBar)`**: wraps an `IonRouterOutlet` and tab
  bar in `<ion-tabs>`, providing the correct CSS layout context. This is the
  recommended way to use tabs with `IonRouterOutlet`.
- **`BottomTabBarOptions.icons`**: `IconDefinitionMap` for registering tab
  bar icons that can't be auto-detected by the Vite plugin.

---

## [2.0.1]

### Fixed

- **Vite plugin: core tags no longer generate invalid imports** —
  `ion-app`, `ion-router-outlet`, `ion-back-button`, and `ion-icon` are
  registered by `initializeNixIonic()` and do not have individual
  component subpaths. The plugin now skips these tags instead of
  generating imports to `@deijose/nix-ionic/components/app` (which
  doesn't exist).

### Tests

- 236 unit tests (was 235) — added test for core-tag skipping.

---

## [2.0.0]

Major rewrite focused on tree-shakeable components, reactive overlays, cache
policies, optional Capacitor, and leak-free lifecycle.

### Breaking changes

- `setupNixIonic()` no longer registers all components by default. Use
  `initializeNixIonic()` + `registerIonicComponents()` or the Vite plugin.
- `unpkg@latest` asset URL removed. Uses `setAssetPath` — you control assets.
- Overlay factories renamed from React-style `use*` to Nix.js `create*` pattern:
  `createToast()`, `createAlert()`, `createLoading()`, `createActionSheet()`,
  `createPopover()`, `createModal()`.
- Single router authority — no more competing Ionic/Nix routers.
- `createPicker()` reimplemented for Ionic 8 inline `isOpen` pattern (no longer
  uses `pickerController.create()` which hangs in Ionic 8).

### Added

- **Tree-shakeable components**: per-component subpath imports
  (`@deijose/nix-ionic/components/button`) + bundle subpaths
  (`@deijose/nix-ionic/bundles/layout`).
- **Vite plugin** `nixIonic()`: auto-detects `<ion-*>` tags in `html```
  templates and generates registration imports.
- **Reactive overlays**: signal-based `create*` controllers with `presented`
  and `result` signals, latest-wins semantics, stale-result protection.
- **Cache policies**: LRU/FIFO max eviction, TTL expiry, per-route overrides,
  per-tab cache isolation.
- **Page-state persistence**: opt-in serializable state across navigation.
- **NavigationManager + StackManager**: reactive `canGoBack`, single authority.
- **Optional Capacitor**: `@deijose/nix-ionic/capacitor` subpath with zero web
  bundle cost. StatusBar, SplashScreen, Keyboard, Haptics, and App plugin
  wrappers with graceful web degradation (no-op on web).
- **Nix.js delegate** for modal/popover overlays: mounts NixTemplate/NixComponent
  inside Ionic overlays.
- **Bundle measurement script** (`npm run measure-bundles`): validates
  tree-shaking with 4 fixtures (minimal, partial, full, capacitor-only).
  Minimal fixture = 11.3% of full bundle (gzip), capacitor-only = 604 bytes.

### Fixed

- **Hash-mode navigation race**: transition race condition fixed — rapid
  navigations queue as pending instead of being silently dropped.
  `_isTransitioning` check moved before `cacheKey` early return.
- **Cached page visibility**: `ion-page-hidden` and inline `display` state
  removed before and after `commit()` to prevent stale hidden state with
  reduced-motion/zero-duration transitions.
- **Ionic 8 picker**: `createPicker()` reimplemented with `createInlineOverlayHandle()`
  using the `isOpen` property pattern (controller-based `pickerController.create()`
  hangs in Ionic 8).

### Tests

- 235 unit tests (13 files)
- 56 E2E tests with real `@ionic/core` (no mocks):
  - 19 application E2E (navigation, lifecycle, overlays, back button)
  - 24 contract tests (custom elements, commit, lifecycle, overlays, properties,
    events, network isolation)
  - 13 accessibility/leak tests (ARIA roles, shadow DOM, focus management,
    repeated navigation, overlay disposal, listener cleanup)

### Documentation

- [MIGRATION.md](./MIGRATION.md) — full 1.x → 2.0 migration guide
- Architecture document: `docs/arquitecturas/ARCHITECTURA_TECNICA_NIX_JS_IONIC.md`
  (in the monorepo `docs/` directory)
- README "Limitations" section: iOS swipe-back documented as unsupported

### Migration

See [MIGRATION.md](./MIGRATION.md) for the full 1.x → 2.0 migration guide.

---

## [1.4.14]

Previous release — basic Ionic lifecycle & router bridge.

- `setupNixIonic()` registered all components from `unpkg@latest`
- React-style `use*` overlay factories
- No cache policies
- No Vite plugin
- No Capacitor support
