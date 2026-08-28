/**
 * @elurjs/ionic / navigation.ts
 *
 * NavigationManager — a single coordination authority for Ionic navigation.
 *
 * The IonRouterOutlet handles DOM rendering, transitions, and cache. The
 * NavigationManager handles:
 *   - Per-tab navigation stacks (extracted from the outlet)
 *   - Navigation state tracking (isTransitioning, pending navigation)
 *   - Navigation hooks (beforeNav, afterNav, onTabChange)
 *   - Programmatic tab switching
 *   - Route-pattern-based cache invalidation hooks
 *   - Guard coordination (delegated to the core router when auto-bootstrapped)
 *
 * The outlet delegates navigation state to the manager, keeping a clean
 * separation: navigation logic lives here, rendering lives in the outlet.
 *
 * @example
 * ```ts
 * import { NavigationManager } from "@elurjs/ionic";
 *
 * const nav = new NavigationManager({ tabs: ["/home", "/search", "/profile"] });
 *
 * // Navigation hooks
 * nav.beforeNav((path, intent) => {
 *   console.log("navigating to", path);
 *   // return false to cancel
 * });
 * nav.afterNav((path) => {
 *   analytics.track("page_view", { path });
 * });
 * nav.onTabChange((tab) => {
 *   console.log("active tab:", tab);
 * });
 *
 * // Programmatic tab switching
 * nav.switchTab("/search");
 *
 * // The outlet uses the manager for stack/state:
 * const outlet = new IonRouterOutlet(routes, { navigation: nav });
 * ```
 */

import { signal, type Signal, type NavigationIntent, type NavigationDirection } from "@elurjs/core";

// --- Types ---

/** A function called before navigation completes. Return false to cancel. */
export type BeforeNavHook = (
    path: string,
    intent: NavigationIntent,
) => boolean | void | Promise<boolean | void>;

/** A function called after navigation completes. */
export type AfterNavHook = (
    path: string,
    direction: NavigationDirection,
) => void;

/** A function called when the active tab changes. */
export type TabChangeHook = (
    tab: string,
    previousTab: string | null,
) => void;

/** Options for NavigationManager construction. */
export interface NavigationManagerOptions {
    /** Tab prefixes for per-tab stack management. */
    tabs?: string[];
}

// --- Per-tab stack management (extracted from IonRouterOutlet) ---

interface TabStack {
    prefix: string;
    entries: string[];
}

/**
 * Manages per-tab navigation stacks. Each tab has its own back/forward
 * stack. When the user switches tabs, the stack for the new tab is
 * restored.
 */
export class StackManager {
    private _stacks = new Map<string, TabStack>();
    private _activeTabKey: string;
    private _tabPrefixes: string[];

    constructor(tabs: string[] | undefined) {
        this._stacks.set("", { prefix: "", entries: [] });
        if (tabs?.length) {
            for (const prefix of tabs) {
                const norm = this._normalize(prefix);
                this._stacks.set(norm, { prefix: norm, entries: [] });
            }
            this._tabPrefixes = tabs.map((t) => this._normalize(t))
                .sort((a, b) => b.length - a.length);
        } else {
            this._tabPrefixes = [];
        }
        this._activeTabKey = "";
    }

    /** Get the tab key for a given path. */
    keyForPath(path: string): string {
        for (const prefix of this._tabPrefixes) {
            if (path === prefix || path.startsWith(prefix + "/")) {
                return prefix;
            }
        }
        return "";
    }

    /** Get the active tab key. */
    get activeTabKey(): string {
        return this._activeTabKey;
    }

    /** Get all registered tab prefixes. */
    get tabPrefixes(): readonly string[] {
        return this._tabPrefixes;
    }

    /** Get the current stack depth for a tab. */
    stackDepth(tabKey?: string): number {
        const key = tabKey ?? this._activeTabKey;
        return this._stacks.get(key)?.entries.length ?? 0;
    }

    /** Get the top of the stack for a tab. */
    stackTop(tabKey?: string): string | null {
        const key = tabKey ?? this._activeTabKey;
        const stack = this._stacks.get(key);
        if (!stack || stack.entries.length === 0) return null;
        return stack.entries[stack.entries.length - 1];
    }

    /** Get all entries in a tab's stack (copy). */
    stackEntries(tabKey?: string): string[] {
        const key = tabKey ?? this._activeTabKey;
        return [...(this._stacks.get(key)?.entries ?? [])];
    }

    /**
     * Apply a navigation to the stacks. Returns the effective direction.
     * This is the same logic that was in IonRouterOutlet._stacks.apply().
     */
    apply(path: string, intent: NavigationIntent): NavigationDirection {
        const targetKey = this.keyForPath(path);
        const stack = this._stacks.get(targetKey)!;

        if (targetKey !== this._activeTabKey) {
            this._activeTabKey = targetKey;
            const top = stack.entries[stack.entries.length - 1];
            if (top !== path) stack.entries.push(path);
            return "none";
        }

        if (intent.direction === "back") {
            while (stack.entries.length > 0
                && stack.entries[stack.entries.length - 1] !== path) {
                stack.entries.pop();
            }
            if (stack.entries.length === 0) stack.entries.push(path);
            return "back";
        }

        if (intent.action === "replace" || intent.direction === "root") {
            if (stack.entries.length === 0) stack.entries.push(path);
            else stack.entries[stack.entries.length - 1] = path;
            return intent.direction === "forward" ? "forward" : "root";
        }

        if (intent.action === "initial") {
            if (stack.entries.length === 0) stack.entries.push(path);
            return "none";
        }

        const top = stack.entries[stack.entries.length - 1];
        if (top !== path) stack.entries.push(path);
        return intent.direction;
    }

    /** Reset a specific tab's stack. */
    resetTab(tabKey: string): void {
        const stack = this._stacks.get(tabKey);
        if (stack) stack.entries = [];
    }

    /** Clear a specific tab's stack and return the paths that were in it. */
    clearTabStack(tabKey: string): string[] {
        const stack = this._stacks.get(tabKey);
        if (!stack) return [];
        const entries = [...stack.entries];
        stack.entries = [];
        return entries;
    }

    /** Reset all stacks. */
    resetAll(): void {
        for (const stack of this._stacks.values()) {
            stack.entries = [];
        }
        this._activeTabKey = "";
    }

    private _normalize(p: string): string {
        if (!p || p === "/") return "/";
        return p.endsWith("/") ? p.slice(0, -1) : p;
    }
}

// --- NavigationManager ---

/**
 * Single coordination authority for Ionic navigation.
 *
 * Wraps the per-tab stack manager and adds:
 *   - Navigation hooks (beforeNav, afterNav, onTabChange)
 *   - Transition state tracking (isTransitioning, pending)
 *   - Programmatic tab switching
 *   - Route-pattern-based cache invalidation hooks
 */
export class NavigationManager {
    private _stacks: StackManager;
    private _beforeNavHooks: BeforeNavHook[] = [];
    private _afterNavHooks: AfterNavHook[] = [];
    private _tabChangeHooks: TabChangeHook[] = [];
    private _cacheInvalidationHandlers = new Map<string, (params?: Record<string, string>) => void>();

    private _isTransitioning = false;
    private _pendingNav: { path: string; intent: NavigationIntent } | null = null;
    private _lastTabKey: string | null = null;

    /** Reactive signal: true when the active tab has a back stack. */
    readonly canGoBack: Signal<boolean>;

    constructor(options: NavigationManagerOptions = {}) {
        this._stacks = new StackManager(options.tabs);
        this.canGoBack = signal(false);
    }

    // --- Stack access ---

    get stacks(): StackManager {
        return this._stacks;
    }

    get activeTab(): string {
        return this._stacks.activeTabKey;
    }

    get tabPrefixes(): readonly string[] {
        return this._stacks.tabPrefixes;
    }

    stackDepth(tabKey?: string): number {
        return this._stacks.stackDepth(tabKey);
    }

    stackTop(tabKey?: string): string | null {
        return this._stacks.stackTop(tabKey);
    }

    stackEntries(tabKey?: string): string[] {
        return this._stacks.stackEntries(tabKey);
    }

    // --- Transition state ---

    get isTransitioning(): boolean {
        return this._isTransitioning;
    }

    get pendingNav(): { path: string; intent: NavigationIntent } | null {
        return this._pendingNav;
    }

    /** Called by the outlet when a transition starts. */
    beginTransition(): void {
        this._isTransitioning = true;
    }

    /** Called by the outlet when a transition ends. */
    endTransition(): void {
        this._isTransitioning = false;
    }

    /** Queue a pending navigation (called by the outlet when already transitioning). */
    setPendingNav(path: string, intent: NavigationIntent): void {
        this._pendingNav = { path, intent };
    }

    /** Clear pending navigation. */
    clearPendingNav(): void {
        this._pendingNav = null;
    }

    /** Consume and return the pending navigation, if any. */
    consumePendingNav(): { path: string; intent: NavigationIntent } | null {
        const pending = this._pendingNav;
        this._pendingNav = null;
        return pending;
    }

    // --- Navigation hooks ---

    /**
     * Register a hook called before navigation completes.
     * Return `false` to cancel the navigation.
     * Multiple hooks are called in registration order.
     */
    beforeNav(hook: BeforeNavHook): () => void {
        this._beforeNavHooks.push(hook);
        return () => {
            const i = this._beforeNavHooks.indexOf(hook);
            if (i >= 0) this._beforeNavHooks.splice(i, 1);
        };
    }

    /**
     * Register a hook called after navigation completes.
     */
    afterNav(hook: AfterNavHook): () => void {
        this._afterNavHooks.push(hook);
        return () => {
            const i = this._afterNavHooks.indexOf(hook);
            if (i >= 0) this._afterNavHooks.splice(i, 1);
        };
    }

    /**
     * Register a hook called when the active tab changes.
     */
    onTabChange(hook: TabChangeHook): () => void {
        this._tabChangeHooks.push(hook);
        return () => {
            const i = this._tabChangeHooks.indexOf(hook);
            if (i >= 0) this._tabChangeHooks.splice(i, 1);
        };
    }

    /**
     * Run beforeNav hooks. Returns true if all hooks allow navigation,
     * false if any hook cancelled.
     */
    async runBeforeNav(path: string, intent: NavigationIntent): Promise<boolean> {
        for (const hook of this._beforeNavHooks) {
            try {
                const result = await hook(path, intent);
                if (result === false) return false;
            } catch {
                // Hook error — don't block navigation
            }
        }
        return true;
    }

    /**
     * Run afterNav hooks. Called by the outlet after a transition completes.
     */
    runAfterNav(path: string, direction: NavigationDirection): void {
        for (const hook of this._afterNavHooks) {
            try {
                hook(path, direction);
            } catch { /* ignore */ }
        }
    }

    /**
     * Run tab change hooks if the tab actually changed.
     */
    runTabChangeIfNeeded(currentPath: string): void {
        const newTab = this._stacks.keyForPath(currentPath);
        if (newTab !== this._lastTabKey) {
            const prev = this._lastTabKey;
            this._lastTabKey = newTab;
            for (const hook of this._tabChangeHooks) {
                try {
                    hook(newTab, prev);
                } catch { /* ignore */ }
            }
        }
    }

    /**
     * Update the reactive `canGoBack` signal based on the active tab's
     * stack depth. Called by the outlet after each transition.
     */
    updateCanGoBack(): void {
        this.canGoBack.value = this._stacks.stackDepth() > 1;
    }

    // --- Programmatic tab switching ---

    /**
     * Switch to a specific tab. Navigates to the tab's current stack top,
     * or the tab prefix if the stack is empty.
     *
     * @example
     * ```ts
     * nav.switchTab("/search"); // switches to the search tab
     * ```
     */
    switchTab(tabPrefix: string): string | null {
        const normalized = this._stacks.keyForPath(tabPrefix);
        if (normalized === this._stacks.activeTabKey) return null;
        const top = this._stacks.stackTop(normalized);
        return top ?? tabPrefix;
    }

    // --- Cache invalidation by route pattern ---

    /**
     * Register a cache invalidation handler for a route pattern.
     * The outlet registers handlers for each route on construction.
     *
     * @example
     * ```ts
     * nav.registerInvalidationHandler("/user/:id", (params) => {
     *   // called when invalidateRoute("/user/:id", { id: "42" }) is invoked
     * });
     * ```
     */
    registerInvalidationHandler(
        routePattern: string,
        handler: (params?: Record<string, string>) => void,
    ): () => void {
        this._cacheInvalidationHandlers.set(routePattern, handler);
        return () => {
            this._cacheInvalidationHandlers.delete(routePattern);
        };
    }

    /**
     * Invalidate cached pages for a specific route pattern + params.
     * If the route has dynamic segments, provide params to target a
     * specific instance. Omit params to invalidate all instances.
     *
     * @example
     * ```ts
     * nav.invalidateRoute("/user/:id", { id: "42" }); // invalidate user 42
     * nav.invalidateRoute("/search"); // invalidate all search instances
     * ```
     */
    invalidateRoute(
        routePattern: string,
        params?: Record<string, string>,
    ): void {
        const handler = this._cacheInvalidationHandlers.get(routePattern);
        if (handler) handler(params);
    }

    /**
     * Invalidate all cached pages matching a glob pattern.
     * Supports `*` as a wildcard suffix.
     *
     * @example
     * ```ts
     * nav.invalidatePattern("/admin/*"); // invalidate all admin pages
     * nav.invalidatePattern("/*");       // invalidate everything
     * ```
     */
    invalidatePattern(pattern: string): void {
        const isWildcard = pattern.endsWith("/*");
        const prefix = isWildcard ? pattern.slice(0, -2) : pattern;

        for (const routePattern of this._cacheInvalidationHandlers.keys()) {
            if (isWildcard) {
                if (routePattern === prefix || routePattern.startsWith(prefix + "/") ||
                    routePattern.startsWith(prefix + ":")) {
                    this._cacheInvalidationHandlers.get(routePattern)?.();
                }
            } else if (routePattern === pattern) {
                this._cacheInvalidationHandlers.get(routePattern)?.();
            }
        }
    }

    // --- Cleanup ---

    /** Reset all navigation state (stacks, hooks, pending). */
    dispose(): void {
        this._stacks.resetAll();
        this._beforeNavHooks = [];
        this._afterNavHooks = [];
        this._tabChangeHooks = [];
        this._cacheInvalidationHandlers.clear();
        this._pendingNav = null;
        this._isTransitioning = false;
        this._lastTabKey = null;
    }
}
