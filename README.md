# @elurjs/ionic

[![npm version](https://img.shields.io/npm/v/@elurjs/ionic.svg)](https://www.npmjs.com/package/@elurjs/ionic)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> Ionic mobile integration for [Elur](https://elur.dev/) — tree-shakeable components, reactive overlays, cache policies, page-state persistence, optional Capacitor, and a Vite plugin for auto-registration.

## Why?

`@elurjs/ionic` bridges Elur signal-based reactivity with Ionic Core 8's native routing, transitions, and overlays. Unlike `@ionic/angular` or `@ionic/react`, it adds **zero framework runtime overhead** — no virtual DOM, no dependency arrays, no hooks rules.

## Install

```bash
npm install @elurjs/ionic @elurjs/core @ionic/core ionicons
```

For native mobile (optional):

```bash
npm install @capacitor/core @capacitor/app @capacitor/status-bar @capacitor/splash-screen @capacitor/keyboard @capacitor/haptics
```

## Quick start

```ts
// main.ts
import "@ionic/core/css/core.css";
import "@ionic/core/css/normalize.css";
import "@ionic/core/css/structure.css";
import "@ionic/core/css/typography.css";
import "@ionic/core/css/padding.css";
import "@ionic/core/css/flex-utils.css";
import "@ionic/core/css/display.css";

import { ElurComponent, html, mount } from "@elurjs/core";
import { IonRouterOutlet, IonPage, IonBackButton } from "@elurjs/ionic";
import { initializeElurIonic, registerIonicComponents } from "@elurjs/ionic";
import { defineIonHeader, defineIonToolbar, defineIonTitle, defineIonContent, defineIonButton } from "@elurjs/ionic/components";
import { home, homeOutline } from "ionicons/icons";

// 1. Initialize + register only what you use
initializeElurIonic();
registerIonicComponents(defineIonHeader, defineIonToolbar, defineIonTitle, defineIonContent, defineIonButton);

// 2. Define routes
const outlet = new IonRouterOutlet([
  { path: "/", component: () => html`<ion-content><h1>Home</h1></ion-content>` },
  { path: "/detail/:id", component: (ctx) => new DetailPage(ctx) },
]);

// 3. Mount
class App extends ElurComponent {
  override render() {
    return html`<ion-app>${outlet}</ion-app>`;
  }
}
mount(new App(), "#app");
```

## Subpaths

| Import | What it gives you |
|---|---|
| `@elurjs/ionic` | Core: router outlet, pages, lifecycle, setup, overlays, page-state |
| `@elurjs/ionic/components/*` | Individual component definers (tree-shakeable) |
| `@elurjs/ionic/bundles/*` | Category bundles (layout, forms, lists, etc.) |
| `@elurjs/ionic/overlays` | Reactive overlay controllers |
| `@elurjs/ionic/page-state` | Page-state persistence protocol |
| `@elurjs/ionic/navigation` | NavigationManager (single authority, hooks, tab switching) |
| `@elurjs/ionic/capacitor` | Optional Capacitor integration (zero web bundle cost) |

## Testing

- **Unit tests**: `npm test` — 234 tests with happy-dom mocks
- **E2E tests**: `npm run e2e` — 12 Playwright tests with real `@ionic/core`
  - Navigation, lifecycle, overlays, back button, contract tests
  - Chromium mobile viewport, `prefers-reduced-motion: reduce`
  - No mocks — real `ion-router-outlet.commit()`, real custom elements
| `@elurjs/ionic/vite-plugin` | Vite plugin for auto component/icon registration |

## Setup

### Incremental (recommended)

```ts
import { initializeElurIonic, registerIonicComponents, registerIonicons } from "@elurjs/ionic";
import { defineIonButton, defineIonCard } from "@elurjs/ionic/components/button";
import { star, starOutline } from "ionicons/icons";

initializeElurIonic();
registerIonicComponents(defineIonButton, defineIonCard);
registerIonicons({ star, "star-outline": starOutline });
```

### Compatibility facade (1.x migration)

```ts
import { setupElurIonic } from "@elurjs/ionic";
import { allComponents } from "@elurjs/ionic/bundles/all";

setupElurIonic({ components: allComponents });
```

### Vite plugin (auto-registration)

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { elur } from "@elurjs/vite-plugin-elur";
import { elurIonic } from "@elurjs/ionic/vite-plugin";

export default defineConfig({
  plugins: [
    elur(),
    elurIonic(), // scans html`` for <ion-*> tags + static icons
  ],
});

// Then in your app entry:
import "virtual:elur-ionic/registration";
```

The plugin scans `html\`\`` templates for `<ion-*>` tags and `name="icon-name"` attributes, then generates a virtual module that imports and registers only what you use.

## Pages

### Class component with lifecycle

```ts
import { html, signal } from "@elurjs/core";
import { IonPage, IonBackButton, type PageContext } from "@elurjs/ionic";

class DetailPage extends IonPage {
  private data = signal<unknown>(null);
  private id: string;

  constructor({ lc, params }: PageContext) {
    super(lc);
    this.id = params.id;
  }

  override ionViewWillEnter() {
    // Runs on every activation — even from cache
    fetch(`/api/items/${this.id}`).then(r => r.json()).then(d => this.data.value = d);
  }

  override ionViewWillLeave() {
    // Pause timers, subscriptions, etc.
  }

  override render() {
    return html`
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">${IonBackButton()}</ion-buttons>
          <ion-title>Detail</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <p>${() => JSON.stringify(this.data.value)}</p>
      </ion-content>
    `;
  }
}
```

### Function component with composables

```ts
import { html, signal } from "@elurjs/core";
import { useIonViewWillEnter, useIonViewWillLeave, type PageContext } from "@elurjs/ionic";

function ProfilePage({ lc }: PageContext) {
  const visits = signal(0);
  useIonViewWillEnter(lc, () => visits.value++);
  useIonViewWillLeave(lc, () => console.log("leaving"));
  return html`<ion-content><p>Visits: ${() => visits.value}</p></ion-content>`;
}
```

### Lifecycle hooks

| Hook | When | Use for |
|---|---|---|
| `ionViewWillEnter` | Before visible (every activation) | Data refresh, restart timers |
| `ionViewDidEnter` | After fully visible | Analytics, scroll position |
| `ionViewWillLeave` | Before hidden | Pause timers, save state |
| `ionViewDidLeave` | After hidden | Cleanup subscriptions |

> **Key**: `onMount`/`onInit` fire once. `ionViewWillEnter` fires on every visit — even from cache.

## Navigation

```ts
import { elurRouter } from "@elurjs/core";

const router = elurRouter();
router.navigate("/detail/42");
router.navigate("/search", { query: { q: "hello" } });
router.replace("/home");
router.back();

router.current.value;     // "/detail/42"
router.params.value;      // { id: "42" }
router.query.value;       // { q: "hello" }
router.canGoBack.value;   // true/false
```

### Route guards

```ts
new IonRouterOutlet([
  {
    path: "/admin",
    component: (ctx) => new AdminPage(ctx),
    beforeEnter: ({ params }) => {
      if (!isLoggedIn()) return "/login";  // redirect
      if (!isAdmin()) return false;         // cancel
      // void/undefined = allow
    },
  },
]);
```

## Cache policies

Control how many pages stay cached and for how long.

```ts
new IonRouterOutlet(routes, {
  cachePolicy: { max: 10, ttl: 60000, strategy: "lru" },
});
```

| Option | Default | Description |
|---|---|---|
| `max` | unlimited | Max cached entries per tab. Excess evicted by strategy. |
| `ttl` | unlimited | Time-to-live in ms. Entries auto-evicted on expiry. |
| `strategy` | `"lru"` | `"lru"` = evict least-recently-used, `"fifo"` = evict oldest |

### Per-route override

```ts
new IonRouterOutlet([
  { path: "/", component: () => html`...` },
  { path: "/transient", cache: false, component: () => html`...` },        // never cache
  { path: "/heavy", cache: { max: 1 }, component: () => html`...` },      // max 1 instance
  { path: "/volatile", cache: { ttl: 5000 }, component: () => html`...` }, // 5s TTL
]);
```

## NavigationManager

A single coordination authority for navigation — hooks, tab switching, and cache invalidation by route pattern.

```ts
import { NavigationManager, IonRouterOutlet } from "@elurjs/ionic";

const nav = new NavigationManager({ tabs: ["/home", "/search", "/profile"] });

// Navigation hooks
nav.beforeNav((path, intent) => {
  console.log("navigating to", path);
  // return false to cancel
});

nav.afterNav((path, direction) => {
  analytics.track("page_view", { path, direction });
});

nav.onTabChange((tab, prev) => {
  console.log("tab changed:", prev, "→", tab);
});

// Programmatic tab switching
const target = nav.switchTab("/search");
if (target) elurRouter().navigate(target);

// Cache invalidation by route pattern
nav.invalidateRoute("/user/:id", { id: "42" }); // invalidate user 42
nav.invalidatePattern("/admin/*");              // invalidate all admin pages

// Pass to outlet
const outlet = new IonRouterOutlet(routes, { navigation: nav });
```

### Stack inspection

```ts
nav.stackDepth();        // current tab stack depth
nav.stackTop();          // current tab stack top path
nav.stackEntries();      // copy of current tab stack
nav.activeTab;           // active tab prefix
```

## Overlays

Reactive overlay controllers using the `create*` pattern (like `createStore`, `createRouter`).

`createPopover()` and `createModal()` automatically inject a Elur framework
delegate when `component` is a function (e.g. `() => html\`...\``), so you can
pass Elur templates as overlay content without any extra setup.

```ts
import { html } from "@elurjs/core";
import { createToast, createAlert, createModal, createPopover, confirm, withLoading } from "@elurjs/ionic";

function MyPage() {
  const toast = createToast();
  const modal = createModal();
  const popover = createPopover();

  const save = async () => {
    await withLoading({ message: "Saving..." }, async () => {
      await fetch("/api/save", { method: "POST" });
    });
    toast.present({ message: "Saved!", duration: 1500 });
  };

  const openModal = () => modal.present({
    component: () => html`<ion-content><h1>Modal content mounted by Elur!</h1></ion-content>`,
  });

  const openPopover = (event: Event) => popover.present({
    event,
    component: () => html`
      <div style="padding: 20px;">
        <ion-button @click=${() => popover.dismiss()}>Close</ion-button>
      </div>
    `,
  });

  return html`
    <ion-content>
      <ion-button @click=${save}>Save</ion-button>
      <ion-button @click=${openModal}>Open Modal</ion-button>
      <ion-button @click=${(e: Event) => openPopover(e)}>Open Popover</ion-button>
      ${() => modal.presented.value ? html`<p>Modal is open</p>` : null}
    </ion-content>
  `;
}
```

> **Note:** The framework delegate is injected automatically when
> `component` is a function. If you pass a string (tag name) or
> `HTMLElement`, no delegate is needed and Ionic handles it natively.

### Available controllers

| Controller | Description |
|---|---|
| `createToast()` | Reactive toast |
| `createAlert()` | Reactive alert |
| `createLoading()` | Reactive loading spinner |
| `createActionSheet()` | Reactive action sheet |
| `createPopover()` | Reactive popover (auto-injects Elur delegate for `component: () => html\`...\``) |
| `createModal()` | Reactive modal (auto-injects Elur delegate for `component: () => html\`...\``) |
| `createPicker()` | Column-based picker (lazy-registers `ion-picker-legacy`) |

### One-shot helpers

```ts
import { showToast, withLoading, confirm } from "@elurjs/ionic";

showToast({ message: "Done!", duration: 1000 });

const data = await withLoading({ message: "Fetching..." },
  () => fetch("/api/data").then(r => r.json()));

const yes = await confirm({ header: "Delete", message: "Sure?", confirmText: "Delete" });
```

## Page-state persistence

Opt-in persistence of serializable state across navigation and app restarts.

```ts
import { signal } from "@elurjs/core";
import { createPageState, IonPage } from "@elurjs/ionic";

class SearchPage extends IonPage {
  private query = signal("");
  private results = signal<string[]>([]);
  private state = createPageState("search", {
    query: this.query,
    results: this.results,
  }, { storage: "local" }); // persists across app restarts

  override ionViewWillEnter() { this.state.restore(); }
  override ionViewWillLeave() { this.state.save(); }
}
```

**Rules:**
- Only serializable data (primitives, plain arrays/objects)
- DOM nodes, functions, symbols, class instances → rejected with warning
- `sessionStorage` (default) or `localStorage` (opt-in)
- `clearAllPageState()` for logout flows

## Capacitor (optional native)

Isolated behind `@elurjs/ionic/capacitor` — **zero web bundle cost** (0 bytes of `@capacitor/*` in main bundle).

```ts
import { createCapacitorApp } from "@elurjs/ionic/capacitor";

const app = createCapacitorApp({
  statusBar: { style: "dark", backgroundColor: "#1a1a2e" },
  splashScreen: { fadeOutDuration: 200 },
  backButton: { defaultHref: "/home" },
});

await app.ready(); // configures status bar, hides splash, wires back button
```

### Individual plugins

```ts
import { Haptics, StatusBar, App, Keyboard } from "@elurjs/ionic/capacitor";

await Haptics.impact("medium");     // no-op on web
await StatusBar.setStyle({ style: "dark" }); // no-op on web
App.onBackButton((info) => { /* ... */ });   // no-op on web
```

All methods are **no-ops on web** — safe to call unconditionally.

## Tabs

```ts
import { createBottomTabBar, createTabsLayout, IonRouterOutlet, NavigationManager } from "@elurjs/ionic";
import { home, search, person, settings } from "ionicons/icons";

const nav = new NavigationManager({ tabs: ["/", "/search", "/profile", "/settings"] });

const outlet = new IonRouterOutlet(routes, {
  tabs: ["/", "/search", "/profile", "/settings"],
  navigation: nav,
});

const tabBar = createBottomTabBar([
  { path: "/", label: "Home", icon: "home", exact: true },
  { path: "/search", label: "Search", icon: "search" },
  { path: "/profile", label: "Profile", icon: "person", badge: "!" },
  { path: "/settings", label: "Settings", icon: "settings" },
], {
  hiddenPaths: ["/detail/*", "/profile/edit"],
  icons: { home, search, person, settings },
  cssVars: {
    "--background": "var(--app-tab-bg)",
    "--color-selected": "var(--ion-color-primary)",
  },
});

// Wrap outlet + tab bar in <ion-tabs> with correct CSS layout
const tabsLayout = createTabsLayout(outlet, tabBar);

html`<ion-app>${tabsLayout}</ion-app>`;
```

### How tabs work

- **Navigation** is driven by the Elur router, not Ionic's internal tab
  selection. Each `ion-tab-button` has `@click.prevent.stop` to prevent
  Ionic's `select()` (which expects `<ion-tab>` children we don't use).
- **`createTabsLayout()`** wraps the outlet and tab bar in `<ion-tabs>`
  and injects a small CSS snippet to ensure the tab bar sits at the
  bottom and the outlet fills the remaining space.
- **Tab IDs** are derived from the path: `/` → `root`, `/search` →
  `search`, `/profile/edit` → `profile-edit`. Override with `tabId`.
- **`selected` state** is set via JS property (`(btn as any).selected =
  isActive`) using a `ref` + `effect` + `nextTick`, because Stencil
  boolean props can't be set via HTML attributes with Elur.

### Tab bar options

| Option | Type | Description |
|---|---|---|
| `slot` | `"top" \| "bottom"` | Tab bar position (default: `"bottom"`) |
| `layout` | `TabButtonLayout` | Icon/label layout (default: `"icon-top"`) |
| `hiddenPaths` | `string[]` | Paths where tab bar is hidden (supports `*` wildcards) |
| `hideWhen` | `(path: string) => boolean` | Dynamic hide callback |
| `icons` | `Record<string, IconDefinition>` | Icon SVG data for tab icons |
| `cssVars` | `Record<string, string>` | CSS custom properties on `ion-tab-bar` |
| `direction` | `NavigationDirection` | Navigation direction on tab switch (default: `"none"`) |

### Tab item options

| Option | Type | Description |
|---|---|---|
| `path` | `string` | Route path |
| `label` | `string` | Tab label text |
| `icon` | `string` | Icon name (kebab-case) |
| `activeIcon` | `string` | Icon name when active (optional) |
| `exact` | `boolean` | Exact path match (default: `false`) |
| `tabId` | `string` | Override auto-generated tab ID |
| `badge` | `string \| number` | Badge content |
| `badgeColor` | `string` | Badge color (default: `"danger"`) |

## Vite plugin

Auto-registers only the Ionic components and icons you actually use in `html\`\`` templates.

```ts
// vite.config.ts
import { elurIonic } from "@elurjs/ionic/vite-plugin";

export default defineConfig({
  plugins: [elurIonic()],
});
```

```ts
// app entry — imports the auto-generated virtual module
import "virtual:elur-ionic/registration";
```

Features:
- Scans `html\`\`` for `<ion-*>` tags → generates direct subpath imports
- Scans `name="icon-name"` on `<ion-icon>` → generates `ionicons/icons` imports
- Warns on dynamic tags/icons (with allowlist suppression)
- `elurIonic({ allowTags: [...], allowIcons: [...] })` for dynamic usage

### `allowTags` and `allowIcons` (important for lazy-loaded pages)

The Vite plugin scans your source files for `<ion-*>` tags and `name="icon-name"`
attributes, then generates a virtual module that imports and registers only what
you use. However, in dev mode, Vite loads modules on-demand. The virtual module
is served when your app entry imports it at startup, but pages loaded lazily by
the router may not have been scanned yet.

**Use `allowTags` and `allowIcons` to explicitly list tags/icons used in
lazy-loaded pages.** The plugin emits warnings when it detects tags or icons
that are not in the allowlists, so you know exactly what to add:

```text
[elur-ionic] Tags used in src/pages/HomePage.ts but not in allowTags:
ion-header, ion-toolbar, ion-title, ion-content, ion-button, ...
Add them to `elurIonic({ allowTags: [...] })` to ensure they are
registered before first use.

[elur-ionic] Icons used in src/pages/HomePage.ts but not in allowIcons:
flash-outline, leaf-outline, toast-outline, ...
Add them to `elurIonic({ allowIcons: [...] })` to ensure they are
registered before first use.
```

If new tags/icons are discovered after the registration module was already
served, an additional warning is emitted:

```text
[elur-ionic] New tags discovered after registration: ion-header, ...
These were NOT included in the registration module. Add them to
allowTags and reload.
```

Example with full allowlists:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { elur } from "@elurjs/vite-plugin-elur";
import { elurIonic } from "@elurjs/ionic/vite-plugin";

export default defineConfig({
  plugins: [
    elur(),
    elurIonic({
      allowTags: [
        "ion-app", "ion-header", "ion-toolbar", "ion-title", "ion-content",
        "ion-buttons", "ion-button", "ion-back-button",
        "ion-tab-bar", "ion-tab-button",
        "ion-list", "ion-item", "ion-label",
        "ion-card", "ion-card-content",
        "ion-input", "ion-toggle", "ion-select", "ion-select-option",
        "ion-icon", "ion-chip", "ion-badge",
        // Overlays (programmatic)
        "ion-toast", "ion-alert", "ion-loading",
        "ion-action-sheet", "ion-popover", "ion-modal",
      ],
      allowIcons: [
        "home", "search", "person", "settings",
        "arrow-back", "arrow-forward",
        "share-outline", "link-outline",
        // ... all icons used in your templates
      ],
    }),
  ],
});
```

## API reference

### Core

| Export | Description |
|---|---|
| `IonRouterOutlet` | Router outlet with cache policies, guards, tabs |
| `IonPage` | Base class for pages with lifecycle hooks |
| `IonBackButton(defaultHref?)` | Back button component |
| `createBottomTabBar(tabs, opts?)` | Bottom tab bar |
| `initializeElurIonic()` | Initialize Ionic Core (incremental) |
| `registerIonicComponents(...definers)` | Register specific components |
| `registerIonicons(icons)` | Register specific icons |
| `setupElurIonic(opts?)` | 1.x compatibility facade |
| `createPageState(pageId, signals, opts?)` | Page-state persistence |
| `clearAllPageState(backend?, ns?)` | Clear all persisted state |
| `NavigationManager` | Single navigation authority (hooks, tabs, invalidation) |
| `StackManager` | Per-tab navigation stack management |

### Overlays

| Export | Description |
|---|---|
| `createToast()` / `createAlert()` / `createLoading()` | Reactive overlay controllers |
| `createActionSheet()` / `createPopover()` / `createModal()` | Reactive overlay controllers |
| `createPicker()` | Column-based picker (lazy-registers `ion-picker-legacy`) |
| `showToast(opts)` | One-shot toast |
| `withLoading(opts, task)` | Loading + async task + auto-dismiss |
| `confirm(opts)` | Promise-based confirm dialog |

### Capacitor (`@elurjs/ionic/capacitor`)

| Export | Description |
|---|---|
| `createCapacitorApp(opts)` | Bootstrap helper (status bar, splash, back button) |
| `StatusBar` / `SplashScreen` / `Keyboard` | Plugin wrappers (no-op on web) |
| `Haptics` / `App` | Plugin wrappers (no-op on web) |
| `isNative()` / `isWeb()` | Platform detection |

### Vite plugin (`@elurjs/ionic/vite-plugin`)

| Export | Description |
|---|---|
| `elurIonic(opts?)` | Vite plugin for auto-registration |
| `generateRegistrationModule(tags, icons, opts)` | Code generator (for testing) |

## Comparison

| Feature | `@ionic/angular` | `@ionic/react` | `@elurjs/ionic` |
|---|---|---|---|
| Virtual DOM | Angular | React | **None** |
| Bundle size overhead | Angular runtime | React runtime | **Zero** |
| Tree-shakeable components | No | No | **Yes** |
| Auto-registration plugin | No | No | **Yes** (Vite) |
| Cache policies (LRU/TTL) | No | No | **Yes** |
| Page-state persistence | Manual | Manual | **Built-in** |
| Capacitor integration | External | External | **Optional subpath** |
| Reactive overlays | Manual | Manual | **`create*` pattern** |

## Testing

All tests run against real `@ionic/core` (no mocks).

| Suite | Tests | What it covers |
|---|---|---|
| Unit (Vitest) | 235 | Cache policies, navigation, overlays, page-state, Capacitor, Vite plugin, bundles |
| E2E application | 19 | Navigation, lifecycle, overlays (toast/modal/alert/loading/action-sheet/picker), back button |
| E2E contract | 24 | Custom elements, `commit()`, lifecycle events, overlay present/dismiss, properties, form events, network isolation |
| E2E accessibility/leaks | 13 | ARIA roles, shadow DOM, focus management, repeated navigation, overlay disposal, listener cleanup |

**Total: 291 tests, all passing.**

### Bundle validation

```bash
npm run measure-bundles
```

Validates tree-shaking with 4 fixtures:

| Fixture | Gzip | Purpose |
|---|---|---|
| minimal (1 component) | 0.82 KB | Only `ion-button` — no other component code |
| partial (layout + buttons) | 1.05 KB | Two bundles — no forms/lists/overlays |
| full (all + overlays + nav) | 7.26 KB | Worst-case bundle |
| capacitor-only | 0.59 KB | Zero `@capacitor/*` in web bundle |

Minimal = 11.3% of full bundle (gzip) — tree-shaking works.

## Limitations

### iOS swipe-back gesture

iOS swipe-back (interactive pop gesture) is **not supported**. The integration
does not assign `swipeHandler` on `ion-router-outlet`. Native swipe-back requires
a WebKit/mobile test that reproduces both a completed swipe and a cancelled
swipe with correct lifecycle rollback — this has not been demonstrated.

Use `ion-back-button` or programmatic `router.back()` for back navigation.

## License

MIT
