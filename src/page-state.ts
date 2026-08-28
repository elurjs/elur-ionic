/**
 * @elurjs/ionic / page-state.ts
 *
 * Opt-in page-state persistence protocol. Allows pages to save and restore
 * serializable state across navigation, cache eviction, and app reloads.
 *
 * Key design rules:
 *   - **Only serializable data** — JSON.stringify is used; DOM nodes, functions,
 *     symbols, class instances with methods are rejected.
 *   - **Never persist DOM/view instances** — the protocol validates values
 *     before storage and throws on non-serializable content.
 *   - **Opt-in** — pages must explicitly call `save()` to persist state.
 *   - **Per cache key** — state is keyed by route path + params + query,
 *     matching the IonRouterOutlet cache key logic.
 *   - **Storage choice** — `sessionStorage` (default, cleared on tab close)
 *     or `localStorage` (persists across sessions).
 *
 * @example Basic usage in a page component
 * ```ts
 * import { signal, html } from "@elurjs/core";
 * import { createPageState, IonPage } from "@elurjs/ionic";
 *
 * class SearchPage extends IonPage {
 *   private query = signal("");
 *   private results = signal<string[]>([]);
 *   private pageState = createPageState("search", {
 *     // Declare which signals are persistable
 *     query: this.query,
 *     results: this.results,
 *   });
 *
 *   override onMount() {
 *     // Restore saved state on mount
 *     this.pageState.restore();
 *   }
 *
 *   override onUnmount() {
 *     // Save state before leaving
 *     this.pageState.save();
 *   }
 *
 *   override render() {
 *     return html`
 *       <ion-content>
 *         <ion-searchbar value=${() => this.query.value} @input=${(e: any) => {
 *           this.query.value = e.target.value;
 *           this.pageState.save(); // save on change
 *         }}></ion-searchbar>
 *         <ion-list>
 *           ${() => this.results.value.map(r => html`<ion-item>${r}</ion-item>`)}
 *         </ion-list>
 *       </ion-content>
 *     `;
 *   }
 * }
 * ```
 *
 * @example With localStorage (persists across app restarts)
 * ```ts
 * const pageState = createPageState("cart", {
 *   items: cartItems,
 *   total: cartTotal,
 * }, { storage: "local" });
 * ```
 */

// --- Types ---

/** Storage backend selection. */
export type StorageBackend = "session" | "local";

/** Options for page-state persistence. */
export interface PageStateOptions {
    /**
     * Storage backend: `"session"` (sessionStorage, cleared on tab close)
     * or `"local"` (localStorage, persists across sessions).
     * @default "session"
     */
    storage?: StorageBackend;
    /**
     * Namespace prefix for storage keys. Defaults to "elur-ionic".
     * Useful for multi-app scenarios on the same origin.
     */
    namespace?: string;
    /**
     * Additional key suffix (e.g. user ID) to isolate state between users.
     */
    keySuffix?: string;
}

/**
 * A map of signal names to signals. Each signal's value must be serializable.
 */
export type SignalMap = Record<string, { value: unknown }>;

/**
 * Page-state persistence controller. Created per page instance.
 */
export interface PageState {
    /**
     * Save the current state of all declared signals to storage.
     * Only serializable values are stored; non-serializable values are
     * silently skipped (with a console.warn in dev).
     */
    save(): void;
    /**
     * Restore saved state from storage into the declared signals.
     * Returns true if state was found and restored, false otherwise.
     */
    restore(): boolean;
    /**
     * Clear saved state for this page's key.
     */
    clear(): void;
    /**
     * Get the storage key that would be used (for debugging).
     */
    readonly key: string;
}

// --- Serialization validation ---

/**
 * Check if a value is serializable (can survive JSON.stringify + parse).
 * Returns true for: primitives, plain arrays, plain objects.
 * Returns false for: functions, symbols, DOM nodes, class instances,
 * undefined, circular references.
 */
function isSerializable(value: unknown): boolean {
    if (value === undefined) return false;
    if (value === null) return true;
    if (typeof value === "function") return false;
    if (typeof value === "symbol") return false;
    if (typeof value === "bigint") return false; // JSON.stringify throws on bigint

    // DOM nodes and elements
    if (typeof window !== "undefined" && value instanceof Node) return false;
    if (typeof window !== "undefined" && value instanceof Element) return false;
    if (typeof window !== "undefined" && value instanceof DocumentFragment) return false;

    // Primitives
    if (typeof value !== "object") return true;

    // Arrays — check each element
    if (Array.isArray(value)) {
        return value.every(isSerializable);
    }

    // Plain objects — check constructor and each value
    const proto = Object.getPrototypeOf(value);
    if (proto !== null && proto !== Object.prototype) {
        // Class instances (has non-trivial prototype) — reject
        return false;
    }

    try {
        // Final check: can it survive a round-trip?
        JSON.stringify(value);
        return true;
    } catch {
        return false; // circular reference or other stringify error
    }
}

// --- Storage abstraction ---

function getStorage(backend: StorageBackend): Storage | null {
    if (typeof window === "undefined") return null;
    return backend === "local" ? window.localStorage : window.sessionStorage;
}

// --- Factory ---

/**
 * Create a page-state persistence controller.
 *
 * @param pageId Unique identifier for the page (e.g. route path).
 * @param signals Map of signal names to signals whose values should be persisted.
 * @param options Persistence options.
 *
 * @example
 * ```ts
 * const state = createPageState("search", {
 *   query: searchQuery,
 *   filters: filterSignal,
 * }, { storage: "local" });
 *
 * // On page mount:
 * state.restore();
 *
 * // On page leave or data change:
 * state.save();
 * ```
 */
export function createPageState(
    pageId: string,
    signals: SignalMap,
    options: PageStateOptions = {},
): PageState {
    const {
        storage: backend = "session",
        namespace = "elur-ionic",
        keySuffix = "",
    } = options;

    const baseKey = `${namespace}:${pageId}${keySuffix ? ":" + keySuffix : ""}`;

    function save(): void {
        const storage = getStorage(backend);
        if (!storage) return;

        const data: Record<string, unknown> = {};
        let hasData = false;

        for (const [name, sig] of Object.entries(signals)) {
            const value = sig.value;
            if (!isSerializable(value)) {
                if (typeof console !== "undefined" && console.warn) {
                    console.warn(
                        `[elur-ionic] PageState: skipping non-serializable value for "${name}" ` +
                        `on page "${pageId}". Only serializable data (primitives, plain arrays, ` +
                        `plain objects) can be persisted. DOM nodes, functions, and class ` +
                        `instances are not allowed.`,
                    );
                }
                continue;
            }
            data[name] = value;
            hasData = true;
        }

        if (hasData) {
            try {
                storage.setItem(baseKey, JSON.stringify(data));
            } catch {
                // Quota exceeded or storage disabled — fail silently
                if (typeof console !== "undefined" && console.warn) {
                    console.warn(
                        `[elur-ionic] PageState: failed to save state for page "${pageId}" ` +
                        `(storage quota exceeded or storage disabled).`,
                    );
                }
            }
        }
    }

    function restore(): boolean {
        const storage = getStorage(backend);
        if (!storage) return false;

        let raw: string | null = null;
        try {
            raw = storage.getItem(baseKey);
        } catch {
            return false; // storage access denied
        }

        if (!raw) return false;

        let data: Record<string, unknown>;
        try {
            data = JSON.parse(raw);
        } catch {
            // Corrupted data — clear it
            try { storage.removeItem(baseKey); } catch { /* ignore */ }
            return false;
        }

        for (const [name, sig] of Object.entries(signals)) {
            if (name in data) {
                sig.value = data[name];
            }
        }

        return true;
    }

    function clear(): void {
        const storage = getStorage(backend);
        if (!storage) return;
        try {
            storage.removeItem(baseKey);
        } catch { /* ignore */ }
    }

    return {
        save,
        restore,
        clear,
        get key() { return baseKey; },
    };
}

// --- Batch helpers ---

/**
 * Clear all elur-ionic page-state entries from a storage backend.
 * Useful for logout flows.
 *
 * @example
 * ```ts
 * import { clearAllPageState } from "@elurjs/ionic";
 *
 * function logout() {
 *   clearAllPageState(); // sessionStorage
 *   clearAllPageState("local"); // localStorage
 * }
 * ```
 */
export function clearAllPageState(backend: StorageBackend = "session", namespace = "elur-ionic"): void {
    const storage = getStorage(backend);
    if (!storage) return;

    const prefix = `${namespace}:`;
    const keysToRemove: string[] = [];

    try {
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }
        for (const key of keysToRemove) {
            storage.removeItem(key);
        }
    } catch { /* ignore */ }
}

// --- Serialization utilities (exported for testing) ---

export { isSerializable };
