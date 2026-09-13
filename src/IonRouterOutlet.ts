/**
 * @elurjs/ionic / IonRouterOutlet.ts  —  v2.5
 *
 *  Architecture: "core API + ion-router-outlet motor" (with auto-bootstrap)
 *
 *  Changes vs v2.4:
 *
 *  (E) Manual lifecycle dispatch on duration-0 transitions.
 *      EMPIRICAL FINDING: <ion-router-outlet>.commit() with `duration: 0`
 *      (used for direction: "none" and "root") does NOT fire the lifecycle
 *      events. We confirmed this with `replace("/login")` after a logout —
 *      the leaving page's `ionViewWillLeave` never ran.
 *
 *      The fix: when `direction` is "none" or "root", we synthesize the
 *      events ourselves around the commit() call, in the order Ionic
 *      documents:
 *        1. WillLeave on the leaving page  (BEFORE commit starts)
 *        2. WillEnter on the entering page (BEFORE commit starts)
 *        3. await commit()                  (instantaneous when duration=0)
 *        4. DidEnter on the entering page  (AFTER commit resolves)
 *        5. DidLeave on the leaving page   (AFTER DidEnter — Ionic docs)
 *
 *      For animated transitions ("forward"/"back") we still rely on Ionic
 *      to fire the events, since those go through the full animation path
 *      where the events ARE wired correctly.
 *
 *  Kept from earlier versions:
 *    (A) Anti-flash on first mount.
 *    (B) StackManager `back` recognition.
 *    (C) _hideInactivePages defensive sweep after every transition.
 *    (D) Manual lifecycle dispatch on first mount (no leaving page).
 *
 *  Subclass note for IonPage users: if you override `onInit()` in a
 *  subclass, you MUST call `super.onInit()` first. The base IonPage uses
 *  onInit to wire `watch()` calls onto the lifecycle signals — without the
 *  super call, your `ionViewWillEnter`/etc. methods never fire.
 */

import { ElurComponent, effect } from "@elurjs/core";
import type { ElurTemplate } from "@elurjs/core";
import {
    elurRouter,
    createRouter,
    _hasActiveRouter,
    type Router,
    type RouteRecord,
    type NavigationGuard,
    type NavigationIntent,
} from "@elurjs/core";
import * as _coreSignals from "@elurjs/core/signals";
import { createPageLifecycle, _connectIonicLifecycle, type PageLifecycle } from "./lifecycle";
import { NavigationManager, StackManager } from "./navigation";

export type GuardResult =
    | boolean
    | string
    | { redirect: string }
    | void
    | undefined;

export interface PageContext {
    lc: PageLifecycle;
    params: Record<string, string>;
    query: Record<string, string>;
}

export interface RouteDefinition {
    path: string;
    component: (ctx: PageContext) => ElurComponent | ElurTemplate;
    beforeEnter?: (ctx: PageContext) => GuardResult | Promise<GuardResult>;
    /**
     * Per-route cache policy override. When set, takes precedence over the
     * outlet-level policy for this route.
     *
     * - `true` — use the outlet's default cache policy
     * - `false` — never cache this route (cleanup on leave)
     * - `{ max: N }` — cache at most N instances of this route
     * - `{ ttl: N }` — cache entries expire after N milliseconds
     * - `{ max: N, ttl: N }` — both bounds
     */
    cache?: boolean | CachePolicy;
}

/**
 * Bounded cache policy for cached pages.
 *
 * - `max`: maximum number of cached entries per tab. When exceeded, the
 *   least-recently-used entry is evicted. Default: unlimited.
 * - `ttl`: time-to-live in milliseconds. Entries older than this are
 *   evicted on next access or by a background timer. Default: unlimited.
 * - `strategy`: "lru" (default) evicts the least-recently-used entry when
 *   `max` is reached. "fifo" evicts the oldest entry.
 */
export interface CachePolicy {
    max?: number;
    ttl?: number;
    strategy?: "lru" | "fifo";
}

export interface IonRouterOutletOptions {
    /** Enable/disable caching globally. Set to false to disable all caching. */
    cache?: boolean;
    /**
     * Bounded cache policy applied to all cached routes (unless overridden
     * per-route via `RouteDefinition.cache`).
     */
    cachePolicy?: CachePolicy;
    defaultAnimation?: unknown;
    tabs?: string[];
    skipAutoBootstrap?: boolean;
    /**
     * Optional NavigationManager for centralized navigation state, hooks,
     * and programmatic tab switching. When provided, the outlet delegates
     * stack management and transition state to the manager.
     */
    navigation?: NavigationManager;
}

function adaptGuardForCore(
    routePath: string,
    pageGuard: (ctx: PageContext) => GuardResult | Promise<GuardResult>,
): NavigationGuard {
    return (to: string, _from: string) => {
        const params = extractParamsFromPath(routePath, to);
        const query = extractQueryFromPath(to);
        const lc = createPageLifecycle();
        return pageGuard({ lc, params, query }) as any;
    };
}

function extractQueryFromPath(path: string): Record<string, string> {
    const qIndex = path.indexOf("?");
    if (qIndex === -1) return {};
    const search = path.slice(qIndex + 1);
    const result: Record<string, string> = {};
    for (const pair of search.split("&")) {
        if (!pair) continue;
        const eq = pair.indexOf("=");
        if (eq === -1) {
            result[pair] = "";
        } else {
            const k = pair.slice(0, eq);
            try {
                result[k] = decodeURIComponent(pair.slice(eq + 1));
            } catch {
                result[k] = pair.slice(eq + 1);
            }
        }
    }
    return result;
}

function extractParamsFromPath(pattern: string, actual: string): Record<string, string> {
    const patternParts = pattern.split("/").filter(Boolean);
    const actualParts = actual.split("/").filter(Boolean);
    const params: Record<string, string> = {};
    for (let i = 0; i < patternParts.length && i < actualParts.length; i++) {
        const p = patternParts[i];
        if (p.startsWith(":")) {
            try {
                params[p.slice(1)] = decodeURIComponent(actualParts[i] ?? "");
            } catch {
                params[p.slice(1)] = actualParts[i] ?? "";
            }
        }
    }
    return params;
}

function _parseGuardResult(r: GuardResult): { allow: boolean; redirect?: string } {
    if (r === false) return { allow: false };
    if (r === true || r === undefined || r === null) return { allow: true };
    if (typeof r === "string") return { allow: false, redirect: r };
    if (typeof r === "object" && "redirect" in r && typeof r.redirect === "string") {
        return { allow: false, redirect: r.redirect };
    }
    return { allow: true };
}

function buildCoreRouteRecords(routes: RouteDefinition[]): RouteRecord[] {
    return routes.map((r): RouteRecord => ({
        path: r.path,
        component: undefined,
        beforeEnter: r.beforeEnter
            ? adaptGuardForCore(r.path, r.beforeEnter)
            : undefined,
    }));
}

interface CachedView {
    pageEl: HTMLElement;
    lc: PageLifecycle;
    cleanup: () => void;
    cacheKey: string;
    /** Timestamp of last access (for LRU). */
    lastAccessed: number;
    /** Timestamp of creation (for TTL). */
    createdAt: number;
    /** Route path (for route-level policy lookup). */
    routePath: string;
    /** Per-route policy override (null = use outlet default). */
    routePolicy: CachePolicy | false | null;
    /** TTL timer handle (if TTL is set). */
    ttlTimer: ReturnType<typeof setTimeout> | null;
}

const IONIC_STATE_CLASSES_TO_RESET = ["ion-page-hidden", "can-go-back"];

function _resetCachedPageState(el: HTMLElement): void {
    el.classList.remove(...IONIC_STATE_CLASSES_TO_RESET);
    el.style.removeProperty("display");
    el.style.removeProperty("visibility");
    el.style.removeProperty("opacity");
    el.style.removeProperty("transform");
    el.style.removeProperty("animation");
    el.style.removeProperty("transition");
    el.style.removeProperty("pointer-events");
    el.style.removeProperty("z-index");
}

function _hasDynamicSegments(path: string): boolean {
    return path.includes(":");
}

function _buildCacheKey(
    routePath: string,
    params: Record<string, string>,
    query?: Record<string, string>,
): string {
    const parts: string[] = [];

    // Params segment — only when the route has dynamic segments.
    if (_hasDynamicSegments(routePath) && params && Object.keys(params).length > 0) {
        parts.push(
            Object.keys(params)
                .sort()
                .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
                .join("&"),
        );
    }

    // Query segment — encoded to avoid collisions (e.g. x=1&y=2 vs x=1y=2).
    if (query && Object.keys(query).length > 0) {
        parts.push(
            Object.keys(query)
                .sort()
                .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
                .join("&"),
        );
    }

    if (parts.length === 0) return routePath;
    return `${routePath}?${parts.join("&")}`;
}

/**
 * Synthesize an Ionic page-lifecycle event on a pageEl. Used when commit()
 * either won't run at all (first mount) or runs with duration:0 (which
 * empirically does not fire lifecycle events in Ionic).
 */
function _dispatchIonicLifecycle(
    pageEl: HTMLElement,
    name: "ionViewWillEnter" | "ionViewDidEnter" | "ionViewWillLeave" | "ionViewDidLeave",
): void {
    pageEl.dispatchEvent(new CustomEvent(name, {
        bubbles: true,
        cancelable: false,
        composed: true,
    }));
}

/**
 * Tracks cleanup functions for pages that are NOT in the cache (cache:false
 * mode). Without this, effects/lifecycle watchers leak when a non-cached
 * page is removed from the DOM.
 */
const _uncachedCleanups = new WeakMap<HTMLElement, () => void>();

/**
 * Mounts a page under a detached reactive root.
 *
 * `_mountComponent` runs synchronously inside the outlet's route effect, so
 * under core ≥4 (next-2 ownership) everything created during mount —
 * lifecycle watches, user `effect()`s — would be owned by that effect and
 * disposed when it re-runs on the NEXT navigation, silently killing the
 * page's reactivity (e.g. ionViewWillLeave never firing). Each page gets its
 * own ownerless root instead; its lifetime is managed by the cleanup the
 * view machinery already tracks (`view.cleanup()` / `_uncachedCleanups`).
 *
 * On core ≤3.6 there is no ownership model — runWithOwner/createRoot don't
 * exist and this falls back to calling fn() directly, preserving the old
 * semantics under the `^3.0.0` peer range.
 */
function _mountDetachedPage<T>(fn: () => T): { value: T; dispose: () => void } {
    const rwOwner = (_coreSignals as Record<string, unknown>).runWithOwner as
        | ((owner: unknown, f: () => T) => T)
        | undefined;
    const mkRoot = (_coreSignals as Record<string, unknown>).createRoot as
        | ((f: (dispose: () => void) => T) => T)
        | undefined;
    if (typeof rwOwner !== "function" || typeof mkRoot !== "function") {
        return { value: fn(), dispose: () => { } };
    }
    let dispose: () => void = () => { };
    const value = rwOwner(null, () =>
        mkRoot((d: () => void) => {
            dispose = d;
            return fn();
        }),
    );
    return { value, dispose };
}

class CacheRegistry {
    private _byTab = new Map<string, Map<string, CachedView>>();
    /** Eviction callback — called when an entry is evicted by policy. */
    private _onEvict: ((view: CachedView) => void) | null = null;

    /** Set the eviction callback for policy-driven evictions. */
    onEvict(cb: (view: CachedView) => void): void {
        this._onEvict = cb;
    }

    /**
     * @internal — Debug snapshot of all cached views for
     * `@elurjs/ionic/devtools`. Plain data, computed on demand.
     */
    _debugSnapshot(): Array<{
        tab: string;
        key: string;
        routePath: string;
        createdAt: number;
        lastAccessed: number;
    }> {
        const out: Array<{
            tab: string;
            key: string;
            routePath: string;
            createdAt: number;
            lastAccessed: number;
        }> = [];
        for (const [tab, views] of this._byTab) {
            for (const [key, view] of views) {
                out.push({
                    tab,
                    key,
                    routePath: view.routePath,
                    createdAt: view.createdAt,
                    lastAccessed: view.lastAccessed,
                });
            }
        }
        return out;
    }

    get(tabKey: string, cacheKey: string): CachedView | undefined {
        const view = this._byTab.get(tabKey)?.get(cacheKey);
        if (view) {
            // Update LRU timestamp on access
            view.lastAccessed = Date.now();
        }
        return view;
    }

    set(tabKey: string, cacheKey: string, view: CachedView): void {
        let map = this._byTab.get(tabKey);
        if (!map) { map = new Map(); this._byTab.set(tabKey, map); }
        map.set(cacheKey, view);
    }

    delete(tabKey: string, cacheKey: string): void {
        const map = this._byTab.get(tabKey);
        if (!map) return;
        const view = map.get(cacheKey);
        if (view?.ttlTimer) {
            clearTimeout(view.ttlTimer);
            view.ttlTimer = null;
        }
        map.delete(cacheKey);
    }

    /**
     * Enforce cache policy for a specific tab. Evicts entries that exceed
     * `max` or have expired by `ttl`. Returns the number of evicted entries.
     */
    enforcePolicy(
        tabKey: string,
        policy: CachePolicy,
        routePolicies: Map<string, boolean | CachePolicy>,
    ): number {
        const map = this._byTab.get(tabKey);
        if (!map) return 0;

        let evicted = 0;

        // 1. TTL expiry — check all entries
        const now = Date.now();
        for (const [cacheKey, view] of map) {
            const effectivePolicy = this._getEffectivePolicy(view.routePath, routePolicies, policy);
            if (effectivePolicy === false) continue; // not cached
            const ttl = effectivePolicy.ttl;
            if (ttl && now - view.createdAt > ttl) {
                this._evict(tabKey, cacheKey, view);
                evicted++;
            }
        }

        // 2. Max enforcement — evict LRU/FIFO entries until under max
        const max = policy.max;
        if (max && map.size > max) {
            const strategy = policy.strategy ?? "lru";
            const entries = [...map.entries()];
            // Sort by eviction priority
            if (strategy === "lru") {
                entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
            } else {
                // FIFO — oldest creation first
                entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
            }
            const toEvict = map.size - max;
            for (let i = 0; i < toEvict; i++) {
                const [cacheKey, view] = entries[i];
                this._evict(tabKey, cacheKey, view);
                evicted++;
            }
        }

        return evicted;
    }

    private _getEffectivePolicy(
        routePath: string,
        routePolicies: Map<string, boolean | CachePolicy>,
        defaultPolicy: CachePolicy,
    ): CachePolicy | false {
        const routeOverride = routePolicies.get(routePath);
        if (routeOverride === false) return false;
        if (routeOverride === true) return defaultPolicy;
        if (routeOverride && typeof routeOverride === "object") return routeOverride;
        return defaultPolicy;
    }

    private _evict(tabKey: string, cacheKey: string, view: CachedView): void {
        if (view.ttlTimer) {
            clearTimeout(view.ttlTimer);
            view.ttlTimer = null;
        }
        this._byTab.get(tabKey)?.delete(cacheKey);
        // Run cleanup + remove DOM
        this._onEvict?.(view);
    }

    *all(): Generator<{ tabKey: string; cacheKey: string; view: CachedView }> {
        for (const [tabKey, map] of this._byTab.entries()) {
            for (const [cacheKey, view] of map.entries()) {
                yield { tabKey, cacheKey, view };
            }
        }
    }

    clear(): void {
        for (const map of this._byTab.values()) {
            for (const view of map.values()) {
                if (view.ttlTimer) clearTimeout(view.ttlTimer);
            }
        }
        this._byTab.clear();
    }
}

export function IonBackButton(defaultHref: string = "/"): ElurTemplate {
    return {
        __isElurTemplate: true as const,
        mount(container: Element | string) {
            const el = typeof container === "string"
                ? document.querySelector(container)!
                : container;
            const cleanup = this._render(el, null);
            return { unmount: cleanup };
        },
        _render(parent: Node, before: Node | null): () => void {
            // Wrap in <ion-buttons slot="start"> for correct layout.
            // Without ion-buttons, ion-back-button has no flex constraints
            // and can expand to fill the toolbar.
            const buttons = document.createElement("ion-buttons");
            buttons.setAttribute("slot", "start");

            const btn = document.createElement("ion-back-button");
            btn.setAttribute("default-href", defaultHref);
            const onClick = (ev: Event) => {
                ev.preventDefault();
                ev.stopPropagation();
                const router = elurRouter();
                const nav = _activeNavigationManager;
                const canGoBack = nav ? nav.canGoBack.value : router.canGoBack.value;
                if (canGoBack) {
                    router.back();
                } else {
                    router.replace(defaultHref);
                }
            };
            btn.addEventListener("click", onClick);
            buttons.appendChild(btn);
            parent.insertBefore(buttons, before);
            return () => {
                btn.removeEventListener("click", onClick);
                buttons.remove();
            };
        },
    };
}

/**
 * Internal registry for the active NavigationManager, set by IonRouterOutlet
 * when it has one. This allows IonBackButton to use per-tab canGoBack
 * without prop drilling.
 */
let _activeNavigationManager: NavigationManager | null = null;

/**
 * @internal — Global registry of live IonRouterOutlet instances for
 * devtools. Shared via `Symbol.for` so it survives module duplication.
 */
const _outletRegistryKey = Symbol.for("@elurjs/ionic/outlets");

function _registerOutlet(instance: IonRouterOutlet): void {
    const g = globalThis as Record<PropertyKey, unknown>;
    let set = g[_outletRegistryKey] as Set<IonRouterOutlet> | undefined;
    if (!set) {
        set = new Set();
        g[_outletRegistryKey] = set;
    }
    set.add(instance);
}

export class IonRouterOutlet extends ElurComponent {
    private _routesByPath = new Map<string, RouteDefinition>();
    private _wildcardRoute: RouteDefinition | null = null;
    private _enableCache: boolean;
    private _cachePolicy: CachePolicy;
    private _routeCachePolicies = new Map<string, boolean | CachePolicy>();
    private _defaultAnimation: unknown;

    private _stacks: StackManager;
    private _cache = new CacheRegistry();
    private _nav: NavigationManager | null;

    private _activePageEl: HTMLElement | null = null;
    private _activeCacheKey: string | null = null;
    private _activeTabKey: string | null = null;

    private _outletEl: HTMLElement | null = null;
    private _routeEffectDisposer: (() => void) | null = null;

    private _isTransitioning = false;
    private _pendingNav: { path: string; intent: NavigationIntent } | null = null;
    // True when the outlet auto-bootstrapped the core router with page guards
    // registered. In that case _transitionTo must NOT re-run beforeEnter
    // (the core router already did) — otherwise guards fire twice.
    private _guardsInCoreRouter: boolean;

    constructor(routes: RouteDefinition[], opts: IonRouterOutletOptions = {}) {
        super();
        this._enableCache = opts.cache ?? true;
        this._cachePolicy = opts.cachePolicy ?? {};
        this._defaultAnimation = opts.defaultAnimation;

        // Use provided NavigationManager or create an internal one
        if (opts.navigation) {
            this._nav = opts.navigation;
            this._stacks = opts.navigation.stacks;
            _activeNavigationManager = opts.navigation;
        } else {
            this._nav = null;
            this._stacks = new StackManager(opts.tabs);
        }

        for (const r of routes) {
            if (r.path === "*") {
                if (this._wildcardRoute) {
                    console.warn(
                        `[elur-ionic] Duplicate wildcard route "*" — the previous ` +
                        `fallback will be overwritten. Define only one "*" route.`,
                    );
                }
                this._wildcardRoute = r;
                continue;
            }
            if (this._routesByPath.has(r.path)) {
                console.warn(
                    `[elur-ionic] Duplicate route path "${r.path}" — the previous ` +
                    `definition will be overwritten. Each route path must be unique.`,
                );
            }
            this._routesByPath.set(r.path, r);
            // Collect per-route cache policy overrides
            if (r.cache !== undefined) {
                this._routeCachePolicies.set(r.path, r.cache);
            }
        }

        // Set up eviction callback — runs cleanup + removes DOM
        this._cache.onEvict((view) => {
            try {
                view.cleanup();
            } catch { /* ignore */ }
            if (view.pageEl.parentElement) {
                view.pageEl.remove();
            }
        });

        this._guardsInCoreRouter = !opts.skipAutoBootstrap && !_hasActiveRouter();
        if (this._guardsInCoreRouter) {
            createRouter(buildCoreRouteRecords(routes));
        }

        // Register cache invalidation handlers on the NavigationManager
        if (this._nav) {
            for (const r of routes) {
                if (r.path === "*") continue;
                this._nav.registerInvalidationHandler(r.path, (params) => {
                    if (params) {
                        this.invalidateCache(r.path, params);
                    } else {
                        // Invalidate all instances of this route
                        for (const entry of this._cache.all()) {
                            if (entry.view.routePath === r.path) {
                                this.invalidateCache(
                                    r.path,
                                    undefined,
                                    entry.tabKey,
                                );
                            }
                        }
                    }
                });
            }
        }

        _registerOutlet(this);
    }

    private _resolveRouteDefinition(currentPath: string): {
        def: RouteDefinition;
        params: Record<string, string>;
    } | null {
        const router = elurRouter();
        const resolved = router.resolve(currentPath);
        if (!resolved.matched || !resolved.route) return null;
        const def = this._routesByPath.get(resolved.route.path);
        if (def) return { def, params: resolved.params };
        // Fallback to the wildcard route (if any) when the core router matched
        // a "*" route that the outlet excluded from _routesByPath.
        if (this._wildcardRoute) {
            return { def: this._wildcardRoute, params: resolved.params };
        }
        return null;
    }

    private _createPageEl(): { pageEl: HTMLElement; lc: PageLifecycle } {
        const pageEl = document.createElement("ion-page");
        pageEl.classList.add("ion-page");
        pageEl.classList.add("ion-page-invisible");
        const lc = createPageLifecycle();
        pageEl.addEventListener("ionViewWillEnter", () =>
            lc.willEnter.update((n) => n + 1));
        pageEl.addEventListener("ionViewDidEnter", () =>
            lc.didEnter.update((n) => n + 1));
        pageEl.addEventListener("ionViewWillLeave", () =>
            lc.willLeave.update((n) => n + 1));
        pageEl.addEventListener("ionViewDidLeave", () =>
            lc.didLeave.update((n) => n + 1));
        return { pageEl, lc };
    }

    private _mountComponent(
        pageEl: HTMLElement,
        def: RouteDefinition,
        ctx: PageContext,
    ): () => void {
        const mounted = _mountDetachedPage(() =>
            this._mountComponentOwned(pageEl, def, ctx),
        );
        return () => {
            try {
                mounted.value();
            } finally {
                mounted.dispose();
            }
        };
    }

    private _mountComponentOwned(
        pageEl: HTMLElement,
        def: RouteDefinition,
        ctx: PageContext,
    ): () => void {
        const node = def.component(ctx);
        if ("render" in node && typeof (node as ElurComponent).render === "function") {
            const comp = node as ElurComponent;
            // Connect Ionic lifecycle via the symbol-based internal API so
            // the contract does NOT depend on subclasses calling super.onInit().
            // IonPage implements this symbol; other ElurComponents ignore it.
            let lifecycleDispose: (() => void) | null = null;
            if (_connectIonicLifecycle in comp) {
                lifecycleDispose = (comp as any)[_connectIonicLifecycle]();
            }
            comp.onInit?.();
            const renderCleanup = comp.render()._render(pageEl, null);
            const mountRet = comp.onMount?.();
            return () => {
                comp.onUnmount?.();
                if (typeof mountRet === "function") mountRet();
                renderCleanup();
                lifecycleDispose?.();
            };
        } else {
            return (node as ElurTemplate)._render(pageEl, null);
        }
    }

    private _hideInactivePages(activeEl: HTMLElement | null): void {
        const outletEl = this._outletEl;
        if (!outletEl) return;
        const children = Array.from(outletEl.children);
        for (const child of children) {
            if (!(child instanceof HTMLElement)) continue;
            if (child.tagName !== "ION-PAGE" && !child.classList.contains("ion-page")) continue;
            if (child === activeEl) {
                child.classList.remove("ion-page-hidden");
            } else {
                child.classList.add("ion-page-hidden");
            }
        }
    }

    private async _transitionTo(
        targetPath: string,
        intent: NavigationIntent,
    ): Promise<void> {
        const outletEl = this._outletEl;
        if (!outletEl) return;

        const resolved = this._resolveRouteDefinition(targetPath);
        if (!resolved) return;

        const { def, params } = resolved;
        const router = elurRouter();
        const query = router.query.value;
        const cacheKey = _buildCacheKey(def.path, params, query);
        const targetTabKey = this._stacks.keyForPath(targetPath);

        if (this._isTransitioning) {
            // Preserve full intent metadata (direction, animation, action)
            // so the deferred navigation behaves identically to the original.
            if (this._nav) {
                this._nav.setPendingNav(targetPath, intent);
            } else {
                this._pendingNav = { path: targetPath, intent };
            }
            return;
        }

        if (cacheKey === this._activeCacheKey && targetTabKey === this._activeTabKey) return;
        this._isTransitioning = true;
        if (this._nav) this._nav.beginTransition();
        let transitionCancelled = false;

        // Run beforeNav hooks from NavigationManager
        if (this._nav) {
            const allowed = await this._nav.runBeforeNav(targetPath, intent);
            if (!allowed) {
                this._isTransitioning = false;
                this._nav.endTransition();
                return;
            }
        }

        try {
            // Page-level guard — only run here if the core router is NOT
            // already handling it (skipAutoBootstrap or external router).
            // When the outlet auto-bootstrapped, guards are registered in the
            // core router and running them again here would double-fire.
            if (def.beforeEnter && !this._guardsInCoreRouter) {
                const cached = this._cache.get(targetTabKey, cacheKey);
                const lcForGuard = cached?.lc ?? createPageLifecycle();
                const guardResult = await Promise.resolve(
                    def.beforeEnter({ lc: lcForGuard, params, query: router.query.value }),
                );
                const parsed = _parseGuardResult(guardResult);
                if (!parsed.allow) {
                    if (parsed.redirect) {
                        // Clear any stale pending nav before redirecting so the
                        // only pending nav after this is the one triggered by
                        // the redirect itself (which is legitimate).
                        this._pendingNav = null;
                        elurRouter().replace(parsed.redirect);
                        // Don't mark as cancelled — the redirect enqueued a
                        // new pending nav via the effect that should process.
                    } else {
                        // Pure cancel (no redirect) — drop pending navs.
                        transitionCancelled = true;
                    }
                    return;
                }
            }

            // Resolve entering page
            let enteringEl: HTMLElement;
            let isNewlyMounted = false;

            // Determine if this route should be cached
            const routeCacheOpt = this._routeCachePolicies.get(def.path);
            const routeCacheDisabled = routeCacheOpt === false;
            const shouldCache = this._enableCache && !routeCacheDisabled;

            const cached = shouldCache
                ? this._cache.get(targetTabKey, cacheKey)
                : undefined;

            if (cached) {
                _resetCachedPageState(cached.pageEl);
                // Remove ion-page-hidden (added by _hideInactivePages when the
                // page was cached) so Ionic's commit() can show it. Keep
                // ion-page-invisible to prevent flash before the transition.
                cached.pageEl.classList.remove("ion-page-hidden");
                cached.pageEl.style.removeProperty("display");
                cached.pageEl.classList.add("ion-page-invisible");
                enteringEl = cached.pageEl;
            } else {
                const { pageEl, lc } = this._createPageEl();
                const cleanup = this._mountComponent(pageEl, def, { lc, params, query });
                if (shouldCache) {
                    const now = Date.now();
                    const routePolicy = (routeCacheOpt && typeof routeCacheOpt === "object")
                        ? routeCacheOpt
                        : null;
                    const effectivePolicy = routePolicy ?? this._cachePolicy;
                    const ttl = effectivePolicy.ttl;
                    const view: CachedView = {
                        pageEl, lc, cleanup, cacheKey,
                        lastAccessed: now,
                        createdAt: now,
                        routePath: def.path,
                        routePolicy,
                        ttlTimer: ttl ? setTimeout(() => {
                            // TTL expired — evict if still in cache and not active
                            if (this._activeCacheKey !== cacheKey || this._activeTabKey !== targetTabKey) {
                                this._cache.delete(targetTabKey, cacheKey);
                                try { cleanup(); } catch { /* ignore */ }
                                if (pageEl.parentElement) pageEl.remove();
                            }
                        }, ttl) : null,
                    };
                    this._cache.set(targetTabKey, cacheKey, view);
                    // Enforce max after inserting
                    if (this._cachePolicy.max) {
                        this._cache.enforcePolicy(targetTabKey, this._cachePolicy, this._routeCachePolicies);
                    }
                } else {
                    // cache:false — track cleanup so it runs when the page leaves.
                    _uncachedCleanups.set(pageEl, cleanup);
                }
                enteringEl = pageEl;
                isNewlyMounted = true;
            }

            if (!outletEl.contains(enteringEl)) {
                outletEl.appendChild(enteringEl);
            }

            const direction = this._stacks.apply(targetPath, intent);
            const leavingEl = this._activePageEl;

            if (!leavingEl || leavingEl === enteringEl) {
                this._activePageEl = enteringEl;
                this._activeCacheKey = cacheKey;
                this._activeTabKey = targetTabKey;

                const finalEl = enteringEl;
                _dispatchIonicLifecycle(finalEl, "ionViewWillEnter");

                if (isNewlyMounted) {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            finalEl.classList.remove("ion-page-invisible");
                            this._hideInactivePages(finalEl);
                            _dispatchIonicLifecycle(finalEl, "ionViewDidEnter");
                        });
                    });
                } else {
                    finalEl.classList.remove("ion-page-invisible");
                    this._hideInactivePages(finalEl);
                    _dispatchIonicLifecycle(finalEl, "ionViewDidEnter");
                }
                return;
            }

            const animationBuilder = (intent.animation ?? this._defaultAnimation) as
                | undefined | unknown;

            // duration:0 is what Ionic uses for "no animation" navigations.
            // Empirically, this path skips lifecycle event dispatch — so we
            // synthesize them manually around the commit() call.
            const isDuration0 = direction === "root" || direction === "none";

            const commitOpts: any = {
                duration: isDuration0 ? 0 : undefined,
                direction:
                    direction === "back" ? "back"
                        : direction === "forward" ? "forward"
                            : undefined,
                showGoBack: direction === "forward",
            };
            if (animationBuilder) commitOpts.animationBuilder = animationBuilder;

            // Ionic docs: WillLeave fires BEFORE WillEnter.
            // Animated paths (duration > 0): commit() handles dispatch.
            if (isDuration0) {
                _dispatchIonicLifecycle(leavingEl, "ionViewWillLeave");
                _dispatchIonicLifecycle(enteringEl, "ionViewWillEnter");
            }

            await (outletEl as any).commit(enteringEl, leavingEl, commitOpts);

            this._activePageEl = enteringEl;
            this._activeCacheKey = cacheKey;
            this._activeTabKey = targetTabKey;

            // Remove the invisible/hidden classes that were added when reusing
            // a cached page. Ionic's commit() may remove them during animation,
            // but with reduced-motion or duration-0 transitions they can persist.
            enteringEl.classList.remove("ion-page-invisible");
            enteringEl.classList.remove("ion-page-hidden");
            enteringEl.style.removeProperty("display");
            // Ensure the entering page has a higher z-index than the leaving
            // page. Ionic's commit() with reduced-motion may not swap z-index.
            const leavingZ = leavingEl ? parseInt(getComputedStyle(leavingEl).zIndex, 10) || 0 : 0;
            enteringEl.style.zIndex = String(leavingZ + 1);
            this._hideInactivePages(enteringEl);

            // Ionic docs: DidLeave fires AFTER DidEnter (after the new
            // page has fully transitioned in).
            if (isDuration0) {
                _dispatchIonicLifecycle(enteringEl, "ionViewDidEnter");
                _dispatchIonicLifecycle(leavingEl, "ionViewDidLeave");
            }

            // If the leaving page is not in the cache (either because cache is
            // disabled OR because it was invalidated while active), run its
            // cleanup before removing the DOM node, otherwise effects/lifecycle
            // watchers leak.
            const leavingCleanup = _uncachedCleanups.get(leavingEl);
            if (leavingCleanup && leavingEl.parentElement === outletEl) {
                leavingCleanup();
                _uncachedCleanups.delete(leavingEl);
                leavingEl.remove();
            } else if (!this._enableCache && leavingEl.parentElement === outletEl) {
                leavingEl.remove();
            }
        } finally {
            this._isTransitioning = false;
            if (this._nav) this._nav.endTransition();

            // Determine the effective direction for afterNav hooks
            const effectiveDirection = this._stacks.apply(targetPath, intent);

            // Run afterNav and tabChange hooks
            if (this._nav && !transitionCancelled) {
                this._nav.runAfterNav(targetPath, effectiveDirection);
                this._nav.runTabChangeIfNeeded(targetPath);
                this._nav.updateCanGoBack();
            }

            // Only process pending nav if the current transition succeeded.
            // A cancelled/failed transition (guard reject, route not found)
            // must NOT blindly replay a stale pending nav — the router state
            // may have already moved (e.g. redirect) and the pending path
            // could be inconsistent with the new current.
            const pending = this._nav ? this._nav.consumePendingNav() : this._pendingNav;
            if (!this._nav) this._pendingNav = null;

            if (pending && !transitionCancelled) {
                // Re-validate against current router state before processing.
                const currentRouter = elurRouter();
                if (pending.path === currentRouter.current.value) {
                    void this._transitionTo(pending.path, pending.intent);
                }
            } else if (transitionCancelled && this._nav) {
                this._nav.clearPendingNav();
            }
        }
    }

    override render(): ElurTemplate {
        const self = this;
        return {
            __isElurTemplate: true as const,

            mount(container: Element | string) {
                const el = typeof container === "string"
                    ? document.querySelector(container)!
                    : container;
                const cleanup = this._render(el, null);
                return { unmount: cleanup };
            },

            _render(parent: Node, before: Node | null): () => void {
                const outletEl = document.createElement("ion-router-outlet");
                self._outletEl = outletEl;

                (outletEl as any).delegate = {
                    attachViewToDom: (
                        container: HTMLElement,
                        component: HTMLElement,
                    ): HTMLElement => {
                        if (component && !container.contains(component)) {
                            container.appendChild(component);
                        }
                        return component;
                    },
                    removeViewFromDom: async (): Promise<void> => { /* no-op */ },
                };

                parent.insertBefore(outletEl, before);

                const router: Router = elurRouter();
                let lastSeenNavKey: string | null = null;
                let initialDeferred = false;

                self._routeEffectDisposer = effect(() => {
                    const path = router.current.value;
                    const intent = router.intent.value;
                    // Observe query so query-only navigation (same path, different
                    // query) triggers a transition. The nav key combines path +
                    // serialized query; reading router.query.value subscribes
                    // the effect to query changes.
                    const query = router.query.value;
                    const queryStr = Object.keys(query).length > 0
                        ? "?" + Object.keys(query).sort().map(
                            (k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`,
                        ).join("&")
                        : "";
                    const navKey = path + queryStr;

                    if (!initialDeferred) {
                        initialDeferred = true;
                        queueMicrotask(() => {
                            const settledPath = router.current.value;
                            const settledIntent = router.intent.value;
                            const settledQuery = router.query.value;
                            const settledQueryStr = Object.keys(settledQuery).length > 0
                                ? "?" + Object.keys(settledQuery).sort().map(
                                    (k) => `${encodeURIComponent(k)}=${encodeURIComponent(settledQuery[k])}`,
                                ).join("&")
                                : "";
                            lastSeenNavKey = settledPath + settledQueryStr;
                            void self._transitionTo(settledPath, settledIntent);
                        });
                        return;
                    }

                    if (navKey === lastSeenNavKey) {
                        // The router sets intent.value before current.value,
                        // which can trigger the effect with a stale path.
                        // If the intent indicates a pop (hashchange back),
                        // defer to a microtask to read the settled path.
                        if (intent.action === "pop" && intent.direction === "none") {
                            queueMicrotask(() => {
                                const settledPath = router.current.value;
                                const settledQuery = router.query.value;
                                const settledQueryStr = Object.keys(settledQuery).length > 0
                                    ? "?" + Object.keys(settledQuery).sort().map(
                                        (k) => `${encodeURIComponent(k)}=${encodeURIComponent(settledQuery[k])}`,
                                    ).join("&")
                                    : "";
                                const settledNavKey = settledPath + settledQueryStr;
                                if (settledNavKey === lastSeenNavKey) return;
                                lastSeenNavKey = settledNavKey;
                                void self._transitionTo(settledPath, router.intent.value);
                            });
                        }
                        return;
                    }
                    lastSeenNavKey = navKey;
                    void self._transitionTo(path, intent);
                });

                return () => {
                    self._routeEffectDisposer?.();
                    self._routeEffectDisposer = null;
                    for (const { view } of self._cache.all()) {
                        view.cleanup();
                        if (view.pageEl.parentElement) view.pageEl.remove();
                    }
                    self._cache.clear();
                    // cache:false active page — run its cleanup too.
                    if (self._activePageEl) {
                        const activeCleanup = _uncachedCleanups.get(self._activePageEl);
                        if (activeCleanup) {
                            activeCleanup();
                            _uncachedCleanups.delete(self._activePageEl);
                        }
                    }
                    self._activePageEl = null;
                    self._activeCacheKey = null;
                    self._activeTabKey = null;
                    self._outletEl = null;
                    outletEl.remove();
                };
            },
        };
    }

    invalidateCache(
        routePath: string,
        params?: Record<string, string>,
        tabKey?: string,
        query?: Record<string, string>,
    ): void {
        const key = (params || query)
            ? _buildCacheKey(routePath, params ?? {}, query)
            : routePath;
        const targetTabKey = tabKey ?? this._stacks.keyForPath(routePath);
        const cached = this._cache.get(targetTabKey, key);
        if (!cached) return;

        if (cached.pageEl === this._activePageEl) {
            // Active page: do NOT dispose reactivity or remove DOM — that would
            // leave a visible-but-dead view. Just drop the cache entry so the
            // next visit remounts a fresh instance. Move the cleanup to the
            // uncached tracker so the normal transition path disposes it when
            // the user navigates away.
            _uncachedCleanups.set(cached.pageEl, cached.cleanup);
            this._cache.delete(targetTabKey, key);
            this._activeCacheKey = null;
            return;
        }

        cached.cleanup();
        if (cached.pageEl.parentElement) {
            cached.pageEl.remove();
        }
        this._cache.delete(targetTabKey, key);
    }

    clearCache(): void {
        const entries: Array<{ tabKey: string; cacheKey: string; view: CachedView }> = [];
        for (const e of this._cache.all()) entries.push(e);
        for (const { tabKey, cacheKey, view } of entries) {
            if (view.pageEl === this._activePageEl) continue;
            view.cleanup();
            if (view.pageEl.parentElement) view.pageEl.remove();
            this._cache.delete(tabKey, cacheKey);
        }
    }

    /**
     * Clear all cached pages for a specific tab. Useful when leaving a tab
     * permanently or for memory management.
     */
    clearTabCache(tabKey: string): void {
        const entries: Array<{ tabKey: string; cacheKey: string; view: CachedView }> = [];
        for (const e of this._cache.all()) {
            if (e.tabKey === tabKey) entries.push(e);
        }
        for (const { tabKey, cacheKey, view } of entries) {
            if (view.pageEl === this._activePageEl) continue;
            view.cleanup();
            if (view.pageEl.parentElement) view.pageEl.remove();
            this._cache.delete(tabKey, cacheKey);
        }
    }

    /** The NavigationManager used by this outlet (if any). */
    get navigation(): NavigationManager | null {
        return this._nav;
    }

    /**
     * @internal — Debug snapshot for `@elurjs/ionic/devtools`.
     * Plain data, computed on demand.
     */
    _debugSnapshot(): {
        cacheEnabled: boolean;
        cachePolicy: CachePolicy;
        views: Array<{
            tab: string;
            key: string;
            routePath: string;
            createdAt: number;
            lastAccessed: number;
        }>;
        stacks: Array<{ prefix: string; depth: number; entries: string[] }>;
    } {
        return {
            cacheEnabled: this._enableCache,
            cachePolicy: { ...this._cachePolicy },
            views: this._cache._debugSnapshot(),
            stacks: this._stacks._debugSnapshot(),
        };
    }
}