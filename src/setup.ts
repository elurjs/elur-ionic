/**
 * @elurjs/ionic / setup.ts — v2 modular setup
 *
 * Architecture (Elur Ionic 2):
 *
 *   initializeElurIonic(options)   — configures Ionic Core once; returns a
 *                                    handle with status/diagnostics. Safe to
 *                                    call again (no-op after first init, but
 *                                    validates incompatible config changes).
 *
 *   registerIonicComponents(...definers)  — incremental & idempotent. Always
 *                                    registers new definers, skips already-
 *                                    registered custom elements. Works for
 *                                    lazy route loading.
 *
 *   registerIonicons(map)         — incremental with collision diagnostics.
 *                                    Merges new icons into the global set;
 *                                    warns on name collisions.
 *
 *   setupElurIonic(options)        — backward-compatible facade that calls all
 *                                    three. Existing apps work unchanged.
 *
 * Key changes vs v1.x:
 *   - No more `isInitialized` blocking: `registerIonicComponents` and
 *     `registerIonicons` are always incremental.
 *   - No `unpkg@latest` default asset path: uses official `setAssetPath` from
 *     ionicons. CDN is opt-in only.
 *   - SSR-safe: no `window` access at module load; guards in each function.
 *   - Returns a handle with diagnostics from `initializeElurIonic`.
 */

import { initialize } from "@ionic/core/components";

// Minimal core components — the bare minimum any elur-ionic app needs.
import { defineCustomElement as defineIonApp } from "@ionic/core/components/ion-app.js";
import { defineCustomElement as defineIonRouterOutlet } from "@ionic/core/components/ion-router-outlet.js";
import { defineCustomElement as defineIonBackButton } from "@ionic/core/components/ion-back-button.js";
import { defineCustomElement as defineIonButtons } from "@ionic/core/components/ion-buttons.js";

// Icons
import { defineCustomElement as defineIonIcon } from "ionicons/components/ion-icon.js";
import { addIcons, setAssetPath } from "ionicons";
import { arrowBack, arrowBackSharp, chevronBack, chevronBackSharp } from "ionicons/icons";

export type ComponentDefiner = () => void;
export type IconDefinitionMap = Record<string, string>;

export interface SetupElurIonicOptions {
    /** @deprecated Use `icons` mode in `initializeElurIonic` instead. */
    iconAssetPath?: string;
    components?: ComponentDefiner[];
    icons?: IconDefinitionMap;
}

export interface InitializeOptions {
    /**
     * Icon asset strategy:
     * - "inline" (default): icons are inlined via addIcons; no remote fetch.
     * - "assets": use setAssetPath to a local URL; icons fetched on demand.
     * - object with `mode: "assets"` and `path` for explicit local path.
     */
    icons?: "inline" | "assets" | { mode: "assets"; path: string };
    /** Ionic mode override: "ios" | "md" | undefined (auto-detect). */
    mode?: "ios" | "md";
}

export interface SetupHandle {
    /** True if this call performed the initialization; false if already init. */
    readonly initialized: boolean;
    /** Diagnostics collected during initialization. */
    readonly diagnostics: string[];
}

// --- Internal registry state ---

const _coreDefiners: ComponentDefiner[] = [
    defineIonApp,
    defineIonRouterOutlet,
    defineIonBackButton,
    defineIonButtons,
    defineIonIcon,
];

const _defaultIcons: IconDefinitionMap = {
    "arrow-back": arrowBack,
    "arrow-back-sharp": arrowBackSharp,
    "chevron-back": chevronBack,
    "chevron-back-sharp": chevronBackSharp,
};

let _initialized = false;
const _registeredIconNames = new Set<string>();

function _hasWindow(): boolean {
    return typeof window !== "undefined";
}

function _hasCustomElements(): boolean {
    return typeof customElements !== "undefined";
}

/**
 * Initialize Ionic Core for Elur. Configures the runtime once.
 *
 * Subsequent calls are no-ops for the core init, but `registerIonicComponents`
 * and `registerIonicons` remain incremental regardless.
 *
 * Returns a handle with diagnostics.
 */
export function initializeElurIonic(options: InitializeOptions = {}): SetupHandle {
    const diagnostics: string[] = [];

    if (!_hasWindow()) {
        // SSR/prerender: do not touch DOM. Module is import-safe.
        return { initialized: false, diagnostics: ["SSR: window unavailable, skipping init"] };
    }

    if (_initialized) {
        // Validate incompatible config changes after init.
        if (options.mode) {
            diagnostics.push("mode cannot be changed after initialization; ignoring");
        }
        return { initialized: false, diagnostics };
    }

    // Icon asset strategy
    const iconsCfg = options.icons ?? "inline";
    if (iconsCfg === "inline") {
        // Default: no remote asset path. Icons are inlined via addIcons.
        // setAssetPath to empty string prevents any CDN fetch.
        setAssetPath("");
    } else if (typeof iconsCfg === "object" && iconsCfg.mode === "assets") {
        setAssetPath(iconsCfg.path);
    } else if (iconsCfg === "assets") {
        // "assets" mode without explicit path — use a sensible default
        // relative to the document base.
        const base = document.baseURI || "/";
        setAssetPath(new URL("assets/icons/", base).href);
    }

    // Initialize Ionic Core
    initialize();

    // Register minimal core components
    for (const definer of _coreDefiners) {
        definer();
    }

    // Register default back icons (used by IonBackButton)
    addIcons(_defaultIcons);
    for (const name of Object.keys(_defaultIcons)) {
        _registeredIconNames.add(name);
    }

    _initialized = true;

    return { initialized: true, diagnostics };
}

/**
 * Register additional Ionic custom element definers. Incremental and
 * idempotent — always processes new definers, safe to call from lazy routes.
 *
 * @example
 * ```ts
 * // In a lazy route module:
 * import { defineCustomElement as defineIonDatetime } from "@ionic/core/components/ion-datetime.js";
 * registerIonicComponents(defineIonDatetime);
 * ```
 */
export function registerIonicComponents(...definers: ComponentDefiner[]): void {
    if (!_hasCustomElements()) {
        if (_hasWindow()) {
            console.warn("[elur-ionic] customElements unavailable; cannot register components");
        }
        return;
    }

    for (const definer of definers) {
        try {
            definer();
        } catch (e) {
            // Ionic definers internally guard against double-registration,
            // but we catch just in case.
            if (e instanceof Error && !e.message.includes("already been registered")) {
                console.warn(`[elur-ionic] Component registration error: ${e.message}`);
            }
        }
    }
}

/**
 * Register additional Ionicons by name → SVG string mapping. Incremental
 * with collision diagnostics.
 *
 * @example
 * ```ts
 * import { registerIonicons } from "@elurjs/ionic";
 * import { home, homeOutline } from "ionicons/icons";
 *
 * registerIonicons({ home, "home-outline": homeOutline });
 * ```
 */
export function registerIonicons(map: IconDefinitionMap): void {
    if (!_hasWindow()) {
        return;
    }

    const toAdd: IconDefinitionMap = {};
    for (const [name, svg] of Object.entries(map)) {
        if (_registeredIconNames.has(name)) {
            // Overwriting is allowed (addIcons merges), but warn in dev.
            console.warn(`[elur-ionic] Icon "${name}" already registered; overwriting.`);
        }
        toAdd[name] = svg;
        _registeredIconNames.add(name);
    }

    if (Object.keys(toAdd).length > 0) {
        addIcons(toAdd);
    }
}

/**
 * Backward-compatible facade. Calls `initializeElurIonic`, then registers
 * any extra components and icons passed via options.
 *
 * Existing v1.x apps work unchanged. New apps should prefer the granular
 * functions (`initializeElurIonic` + `registerIonicComponents` + `registerIonicons`)
 * for lazy loading and HMR support.
 *
 * @deprecated Prefer `initializeElurIonic` + `registerIonicComponents` + `registerIonicons` for new code.
 */
export function setupElurIonic(options: SetupElurIonicOptions = {}): void {
    if (!_hasWindow()) return;

    // Map old options to new init
    const initOpts: InitializeOptions = {};
    if (options.iconAssetPath) {
        initOpts.icons = { mode: "assets", path: options.iconAssetPath };
    }

    const handle = initializeElurIonic(initOpts);

    // Register extra components (always incremental, even after init)
    if (options.components) {
        registerIonicComponents(...options.components);
    }

    // Register extra icons (always incremental, even after init)
    if (options.icons) {
        registerIonicons(options.icons);
    }

    void handle;
}

export { addIcons, setAssetPath };
