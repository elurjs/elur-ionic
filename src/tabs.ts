/**
 * @elurjs/ionic / tabs.ts  —  v2
 *
 * Bottom tab bar that drives navigation through the core router. The visual
 * "active" state is computed from `elurRouter().current` directly.
 *
 * Tab switches are intentionally direction:"none" — Ionic's convention is no
 * animation between tabs. Per-tab stacks (configured on IonRouterOutlet via
 * `tabs: [...]`) preserve each tab's deep view across switches.
 */

import { html, ElurComponent, effect, ref, nextTick } from "@elurjs/core";
import type { ElurTemplate } from "@elurjs/core";
import { elurRouter, type NavigationDirection } from "@elurjs/core";
import { addIcons, type IconDefinitionMap } from "./setup.js";

/** Layout of icon and label inside each tab button. */
export type TabButtonLayout =
    | "icon-top"
    | "icon-start"
    | "icon-end"
    | "icon-bottom"
    | "icon-hide"
    | "label-hide";

export interface BottomTabItem {
    path: string;
    label: string;
    icon?: string;
    activeIcon?: string;
    exact?: boolean;
    tabId?: string;
    /** Badge text or number (e.g. notification count). */
    badge?: string | number;
    /** Badge color (Ionic color name). Default: "danger". */
    badgeColor?: string;
}

export interface BottomTabBarOptions {
    slot?: "top" | "bottom";
    className?: string;
    hiddenPaths?: string[];
    /**
     * Direction passed to the router on tab change.
     * Default `"none"` — no animation, native Ionic feel.
     */
    navigationDirection?: NavigationDirection;
    hideWhen?: (path: string) => boolean;
    /**
     * Icon SVG data to register for the tab bar icons.
     *
     * The Vite plugin can only detect static `name="icon-name"` in html``
     * templates. Tab bar icons are dynamic, so pass the data here.
     */
    icons?: IconDefinitionMap;
    /**
     * Layout of icon and label inside each tab button.
     * Default: `"icon-top"`.
     */
    layout?: TabButtonLayout;
    /**
     * CSS custom properties to set on the `ion-tab-bar` element.
     * Useful for theming: `--background`, `--color`, `--color-selected`, etc.
     *
     * @example
     * ```ts
     * createBottomTabBar(tabs, {
     *   cssVars: {
     *     "--background": "#1a1a2e",
     *     "--color-selected": "#00ff88",
     *   },
     * });
     * ```
     */
    cssVars?: Record<string, string>;
}

function _normalizePath(p: string): string {
    if (!p || p === "/") return "/";
    return p.endsWith("/") ? p.slice(0, -1) : p;
}

function _isActive(tab: BottomTabItem, currentPath: string): boolean {
    const cur = _normalizePath(currentPath);
    const tgt = _normalizePath(tab.path);
    if (tab.exact) return cur === tgt;
    if (tgt === "/") return cur === "/";
    return cur === tgt || cur.startsWith(`${tgt}/`);
}

function _isHidden(path: string, patterns?: string[]): boolean {
    if (!patterns?.length) return false;
    const cur = _normalizePath(path);
    return patterns.some((pat) => {
        const norm = _normalizePath(pat);
        if (norm.endsWith("/*")) {
            const base = norm.slice(0, -2);
            return cur === base || cur.startsWith(`${base}/`);
        }
        return cur === norm;
    });
}

/** Convert a cssVars record to a CSS string for the style attribute. */
function _cssVarsToString(vars: Record<string, string> | undefined): string {
    if (!vars) return "";
    return Object.entries(vars)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");
}

export function createBottomTabBar(
    tabs: BottomTabItem[],
    options: BottomTabBarOptions = {},
): ElurTemplate {
    const router = elurRouter();
    const slot = options.slot ?? "bottom";
    const className = options.className ?? "elur-ion-tab-bar";
    const direction: NavigationDirection = options.navigationDirection ?? "none";
    const layout: TabButtonLayout = options.layout ?? "icon-top";
    const cssVars = options.cssVars;

    // Register icons if provided.
    if (options.icons) {
        addIcons(options.icons);
    }

    // Stencil boolean props (like `selected`) cannot be set via HTML
    // attributes with Elur. We use an effect to set the JS property
    // directly on each ion-tab-button after it's in the DOM, and
    // re-sync whenever the route changes.
    const tabBarRef = ref<HTMLElement>();
    let synced = false;
    effect(() => {
        const currentPath = router.current.value;
        const tabBarEl = tabBarRef.el;
        if (!tabBarEl) {
            if (!synced) {
                nextTick(() => {
                    synced = true;
                    const el = tabBarRef.el;
                    if (!el) return;
                    const btns = el.querySelectorAll("ion-tab-button");
                    btns.forEach((btn, i) => {
                        const tab = tabs[i];
                        if (!tab) return;
                        (btn as any).selected = _isActive(tab, router.current.value);
                    });
                });
            }
            return;
        }
        const buttons = tabBarEl.querySelectorAll("ion-tab-button");
        buttons.forEach((btn, i) => {
            const tab = tabs[i];
            if (!tab) return;
            const isActive = _isActive(tab, currentPath);
            (btn as any).selected = isActive;
        });
    });

    return html`
    <ion-tab-bar
      slot=${slot}
      class=${className}
      ref=${tabBarRef}
      style=${() => {
            const path = router.current.value;
            const hidden = options.hideWhen
                ? options.hideWhen(path)
                : _isHidden(path, options.hiddenPaths);
            const vars = _cssVarsToString(cssVars);
            const display = hidden ? "display:none" : "";
            return [vars, display].filter(Boolean).join("; ");
        }}
    >
      ${tabs.map((tab) => {
            const computedTabId = tab.path === "/"
                ? "root"
                : _normalizePath(tab.path).replace(/^\//, "").replace(/\//g, "-");
            const tabId = tab.tabId ?? computedTabId;

            return html`
          <ion-tab-button
            tab=${tabId}
            layout=${layout}
            @click.prevent.stop=${() => {
                    // .prevent.stop prevents Ionic's internal tab selection
                    // (which looks for <ion-tab> children we don't have).
                    // We drive navigation through the Elur router instead.
                    if (_isActive(tab, router.current.value)) {
                        router.replace(tab.path, { direction: "none" });
                    } else {
                        router.navigate(tab.path, { direction });
                    }
                }}
          >
            ${tab.icon
                    ? html`
                  <ion-icon
                    name=${() => {
                            const active = _isActive(tab, router.current.value);
                            return active && tab.activeIcon ? tab.activeIcon : tab.icon;
                        }}
                  ></ion-icon>
                `
                    : ""}
            <ion-label>${tab.label}</ion-label>
            ${tab.badge != null
                    ? html`<ion-badge color=${tab.badgeColor ?? "danger"}>${tab.badge}</ion-badge>`
                    : ""}
          </ion-tab-button>
        `;
        })}
    </ion-tab-bar>
  `;
}

/**
 * Wraps an IonRouterOutlet and a tab bar in <ion-tabs>.
 *
 * <ion-tabs> provides the correct CSS layout context: the outlet fills
 * the available space and the tab bar sits at the bottom (or top).
 *
 * We use <ion-tabs> for layout only — navigation is driven by the
 * Elur router via the @click handler on each <ion-tab-button>, not
 * by Ionic's internal tab selection. The tab buttons have `tab` IDs
 * so Ionic doesn't warn, but there are no <ion-tab> children.
 *
 * A small CSS snippet is injected to ensure <ion-tabs> fills its
 * parent and the absolutely-positioned <ion-router-outlet> doesn't
 * collapse the layout.
 */
export function createTabsLayout(
    outlet: ElurTemplate | ElurComponent,
    tabBar: ElurTemplate,
): ElurTemplate {
    _injectTabsLayoutStyles();
    const outletTemplate = outlet instanceof ElurComponent ? outlet.render() : outlet;
    return html`
        <ion-tabs>
            ${outletTemplate}
            ${tabBar}
        </ion-tabs>
    `;
}

/** Inject the tabs layout CSS once (idempotent). */
let _tabsStylesInjected = false;
function _injectTabsLayoutStyles(): void {
    if (_tabsStylesInjected) return;
    if (typeof document === "undefined") return;
    _tabsStylesInjected = true;
    const style = document.createElement("style");
    style.id = "elur-ionic-tabs-layout";
    // ion-tabs defaults to display:block with no explicit height, which
    // collapses to the tab bar's height because ion-router-outlet is
    // position:absolute. Force ion-tabs to fill its parent and use flexbox
    // so the outlet takes the remaining space above the tab bar.
    style.textContent = `
ion-tabs {
    display: flex !important;
    flex-direction: column !important;
    height: 100% !important;
    width: 100% !important;
    position: relative !important;
}
ion-tabs > ion-router-outlet {
    flex: 1 1 0 !important;
    min-height: 0 !important;
    position: relative !important;
    top: auto !important;
    bottom: auto !important;
    left: auto !important;
    right: auto !important;
}
ion-tabs > ion-tab-bar {
    flex-shrink: 0 !important;
}
`;
    document.head.appendChild(style);
}
