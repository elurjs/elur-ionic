/**
 * Typed manifest of all Ionic 8 custom elements supported by elur-ionic.
 * This is the single source of truth for:
 *   - the Vite plugin (auto-import scanning)
 *   - direct subpath generation
 *   - bundle composition
 *   - diagnostics (unsupported tags, version drift)
 *
 * Each entry maps a kebab-case tag name to its Ionic Core import path and
 * metadata (category, dependencies, wrapper/controller if any).
 */

export type ComponentCategory =
    | "layout"
    | "navigation"
    | "forms"
    | "lists"
    | "feedback"
    | "buttons"
    | "overlays"
    | "data"
    | "routing-legacy";

export interface ComponentManifestEntry {
    /** Custom element tag name, e.g. "ion-button". */
    tag: string;
    /** Import specifier relative to @ionic/core, e.g. "ion-button.js". */
    importPath: string;
    /** Category for bundle composition. */
    category: ComponentCategory;
    /** Other components this one depends on (e.g. ion-card needs ion-card-content). */
    dependencies?: string[];
    /** Associated elur-ionic wrapper or controller, if any. */
    wrapper?: string;
    /** Minimum Ionic Core major version. */
    minIonicMajor: number;
    /** True if this is a legacy/deprecated component (ion-router, ion-route, etc.). */
    legacy?: boolean;
}

// --- Manifest ---

export const COMPONENT_MANIFEST: readonly ComponentManifestEntry[] = [
    // Layout & Core
    { tag: "ion-app", importPath: "ion-app.js", category: "layout", minIonicMajor: 8 },
    { tag: "ion-header", importPath: "ion-header.js", category: "layout", minIonicMajor: 8 },
    { tag: "ion-toolbar", importPath: "ion-toolbar.js", category: "layout", minIonicMajor: 8 },
    { tag: "ion-title", importPath: "ion-title.js", category: "layout", minIonicMajor: 8 },
    { tag: "ion-content", importPath: "ion-content.js", category: "layout", minIonicMajor: 8 },
    { tag: "ion-footer", importPath: "ion-footer.js", category: "layout", minIonicMajor: 8 },
    { tag: "ion-grid", importPath: "ion-grid.js", category: "layout", minIonicMajor: 8 },
    { tag: "ion-row", importPath: "ion-row.js", category: "layout", minIonicMajor: 8, dependencies: ["ion-grid"] },
    { tag: "ion-col", importPath: "ion-col.js", category: "layout", minIonicMajor: 8, dependencies: ["ion-grid", "ion-row"] },
    { tag: "ion-split-pane", importPath: "ion-split-pane.js", category: "layout", minIonicMajor: 8 },
    { tag: "ion-text", importPath: "ion-text.js", category: "layout", minIonicMajor: 8 },
    { tag: "ion-img", importPath: "ion-img.js", category: "layout", minIonicMajor: 8 },
    { tag: "ion-backdrop", importPath: "ion-backdrop.js", category: "layout", minIonicMajor: 8 },

    // Navigation
    { tag: "ion-buttons", importPath: "ion-buttons.js", category: "navigation", minIonicMajor: 8 },
    { tag: "ion-back-button", importPath: "ion-back-button.js", category: "navigation", minIonicMajor: 8 },
    { tag: "ion-menu", importPath: "ion-menu.js", category: "navigation", minIonicMajor: 8 },
    { tag: "ion-menu-button", importPath: "ion-menu-button.js", category: "navigation", minIonicMajor: 8 },
    { tag: "ion-menu-toggle", importPath: "ion-menu-toggle.js", category: "navigation", minIonicMajor: 8 },
    { tag: "ion-tabs", importPath: "ion-tabs.js", category: "navigation", minIonicMajor: 8 },
    { tag: "ion-tab", importPath: "ion-tab.js", category: "navigation", minIonicMajor: 8 },
    { tag: "ion-tab-bar", importPath: "ion-tab-bar.js", category: "navigation", minIonicMajor: 8 },
    { tag: "ion-tab-button", importPath: "ion-tab-button.js", category: "navigation", minIonicMajor: 8 },
    { tag: "ion-nav", importPath: "ion-nav.js", category: "navigation", minIonicMajor: 8 },
    { tag: "ion-nav-link", importPath: "ion-nav-link.js", category: "navigation", minIonicMajor: 8 },
    { tag: "ion-router-link", importPath: "ion-router-link.js", category: "navigation", minIonicMajor: 8 },

    // Forms & Inputs
    { tag: "ion-input", importPath: "ion-input.js", category: "forms", minIonicMajor: 8 },
    { tag: "ion-input-otp", importPath: "ion-input-otp.js", category: "forms", minIonicMajor: 8 },
    { tag: "ion-input-password-toggle", importPath: "ion-input-password-toggle.js", category: "forms", minIonicMajor: 8 },
    { tag: "ion-textarea", importPath: "ion-textarea.js", category: "forms", minIonicMajor: 8 },
    { tag: "ion-checkbox", importPath: "ion-checkbox.js", category: "forms", minIonicMajor: 8 },
    { tag: "ion-toggle", importPath: "ion-toggle.js", category: "forms", minIonicMajor: 8 },
    { tag: "ion-select", importPath: "ion-select.js", category: "forms", minIonicMajor: 8 },
    { tag: "ion-select-option", importPath: "ion-select-option.js", category: "forms", minIonicMajor: 8, dependencies: ["ion-select"] },
    { tag: "ion-select-modal", importPath: "ion-select-modal.js", category: "forms", minIonicMajor: 8 },
    { tag: "ion-select-popover", importPath: "ion-select-popover.js", category: "forms", minIonicMajor: 8 },
    { tag: "ion-radio", importPath: "ion-radio.js", category: "forms", minIonicMajor: 8 },
    { tag: "ion-radio-group", importPath: "ion-radio-group.js", category: "forms", minIonicMajor: 8, dependencies: ["ion-radio"] },
    { tag: "ion-range", importPath: "ion-range.js", category: "forms", minIonicMajor: 8 },
    { tag: "ion-searchbar", importPath: "ion-searchbar.js", category: "forms", minIonicMajor: 8 },
    { tag: "ion-datetime", importPath: "ion-datetime.js", category: "forms", minIonicMajor: 8 },
    { tag: "ion-datetime-button", importPath: "ion-datetime-button.js", category: "forms", minIonicMajor: 8, dependencies: ["ion-datetime"] },
    { tag: "ion-segment", importPath: "ion-segment.js", category: "forms", minIonicMajor: 8 },
    { tag: "ion-segment-button", importPath: "ion-segment-button.js", category: "forms", minIonicMajor: 8, dependencies: ["ion-segment"] },
    { tag: "ion-segment-view", importPath: "ion-segment-view.js", category: "forms", minIonicMajor: 8 },
    { tag: "ion-segment-content", importPath: "ion-segment-content.js", category: "forms", minIonicMajor: 8, dependencies: ["ion-segment-view"] },

    // List & Items
    { tag: "ion-list", importPath: "ion-list.js", category: "lists", minIonicMajor: 8 },
    { tag: "ion-list-header", importPath: "ion-list-header.js", category: "lists", minIonicMajor: 8 },
    { tag: "ion-item", importPath: "ion-item.js", category: "lists", minIonicMajor: 8 },
    { tag: "ion-item-divider", importPath: "ion-item-divider.js", category: "lists", minIonicMajor: 8 },
    { tag: "ion-item-group", importPath: "ion-item-group.js", category: "lists", minIonicMajor: 8 },
    { tag: "ion-item-sliding", importPath: "ion-item-sliding.js", category: "lists", minIonicMajor: 8 },
    { tag: "ion-item-options", importPath: "ion-item-options.js", category: "lists", minIonicMajor: 8, dependencies: ["ion-item-sliding"] },
    { tag: "ion-item-option", importPath: "ion-item-option.js", category: "lists", minIonicMajor: 8, dependencies: ["ion-item-sliding"] },
    { tag: "ion-label", importPath: "ion-label.js", category: "lists", minIonicMajor: 8 },
    { tag: "ion-note", importPath: "ion-note.js", category: "lists", minIonicMajor: 8 },
    { tag: "ion-reorder", importPath: "ion-reorder.js", category: "lists", minIonicMajor: 8 },
    { tag: "ion-reorder-group", importPath: "ion-reorder-group.js", category: "lists", minIonicMajor: 8, dependencies: ["ion-reorder"] },

    // Cards & Data
    { tag: "ion-card", importPath: "ion-card.js", category: "data", minIonicMajor: 8 },
    { tag: "ion-card-header", importPath: "ion-card-header.js", category: "data", minIonicMajor: 8, dependencies: ["ion-card"] },
    { tag: "ion-card-title", importPath: "ion-card-title.js", category: "data", minIonicMajor: 8, dependencies: ["ion-card"] },
    { tag: "ion-card-subtitle", importPath: "ion-card-subtitle.js", category: "data", minIonicMajor: 8, dependencies: ["ion-card"] },
    { tag: "ion-card-content", importPath: "ion-card-content.js", category: "data", minIonicMajor: 8, dependencies: ["ion-card"] },
    { tag: "ion-chip", importPath: "ion-chip.js", category: "data", minIonicMajor: 8 },
    { tag: "ion-badge", importPath: "ion-badge.js", category: "data", minIonicMajor: 8 },
    { tag: "ion-avatar", importPath: "ion-avatar.js", category: "data", minIonicMajor: 8 },
    { tag: "ion-thumbnail", importPath: "ion-thumbnail.js", category: "data", minIonicMajor: 8 },
    { tag: "ion-accordion", importPath: "ion-accordion.js", category: "data", minIonicMajor: 8 },
    { tag: "ion-accordion-group", importPath: "ion-accordion-group.js", category: "data", minIonicMajor: 8, dependencies: ["ion-accordion"] },
    { tag: "ion-breadcrumb", importPath: "ion-breadcrumb.js", category: "data", minIonicMajor: 8 },
    { tag: "ion-breadcrumbs", importPath: "ion-breadcrumbs.js", category: "data", minIonicMajor: 8, dependencies: ["ion-breadcrumb"] },
    { tag: "ion-infinite-scroll", importPath: "ion-infinite-scroll.js", category: "data", minIonicMajor: 8 },
    { tag: "ion-infinite-scroll-content", importPath: "ion-infinite-scroll-content.js", category: "data", minIonicMajor: 8, dependencies: ["ion-infinite-scroll"] },
    { tag: "ion-refresher", importPath: "ion-refresher.js", category: "data", minIonicMajor: 8 },
    { tag: "ion-refresher-content", importPath: "ion-refresher-content.js", category: "data", minIonicMajor: 8, dependencies: ["ion-refresher"] },

    // Feedback & Progress
    { tag: "ion-spinner", importPath: "ion-spinner.js", category: "feedback", minIonicMajor: 8 },
    { tag: "ion-progress-bar", importPath: "ion-progress-bar.js", category: "feedback", minIonicMajor: 8 },
    { tag: "ion-skeleton-text", importPath: "ion-skeleton-text.js", category: "feedback", minIonicMajor: 8 },

    // Buttons & Actions
    { tag: "ion-button", importPath: "ion-button.js", category: "buttons", minIonicMajor: 8 },
    { tag: "ion-fab", importPath: "ion-fab.js", category: "buttons", minIonicMajor: 8 },
    { tag: "ion-fab-button", importPath: "ion-fab-button.js", category: "buttons", minIonicMajor: 8, dependencies: ["ion-fab"] },
    { tag: "ion-fab-list", importPath: "ion-fab-list.js", category: "buttons", minIonicMajor: 8, dependencies: ["ion-fab"] },
    { tag: "ion-ripple-effect", importPath: "ion-ripple-effect.js", category: "buttons", minIonicMajor: 8 },

    // Overlays
    { tag: "ion-modal", importPath: "ion-modal.js", category: "overlays", minIonicMajor: 8, wrapper: "useModal" },
    { tag: "ion-popover", importPath: "ion-popover.js", category: "overlays", minIonicMajor: 8, wrapper: "usePopover" },
    { tag: "ion-toast", importPath: "ion-toast.js", category: "overlays", minIonicMajor: 8, wrapper: "useToast" },
    { tag: "ion-alert", importPath: "ion-alert.js", category: "overlays", minIonicMajor: 8, wrapper: "useAlert" },
    { tag: "ion-action-sheet", importPath: "ion-action-sheet.js", category: "overlays", minIonicMajor: 8, wrapper: "useActionSheet" },
    { tag: "ion-loading", importPath: "ion-loading.js", category: "overlays", minIonicMajor: 8, wrapper: "useLoading" },
    { tag: "ion-picker", importPath: "ion-picker.js", category: "overlays", minIonicMajor: 8, wrapper: "usePicker" },
    { tag: "ion-picker-column", importPath: "ion-picker-column.js", category: "overlays", minIonicMajor: 8, dependencies: ["ion-picker"] },
    { tag: "ion-picker-column-option", importPath: "ion-picker-column-option.js", category: "overlays", minIonicMajor: 8, dependencies: ["ion-picker-column"] },

    // Routing (legacy — not registered by default)
    { tag: "ion-router", importPath: "ion-router.js", category: "routing-legacy", minIonicMajor: 8, legacy: true },
    { tag: "ion-route", importPath: "ion-route.js", category: "routing-legacy", minIonicMajor: 8, legacy: true },
    { tag: "ion-route-redirect", importPath: "ion-route-redirect.js", category: "routing-legacy", minIonicMajor: 8, legacy: true },
    { tag: "ion-router-outlet", importPath: "ion-router-outlet.js", category: "layout", minIonicMajor: 8 },

    // Icon (from ionicons, not @ionic/core)
    { tag: "ion-icon", importPath: "ion-icon.js", category: "feedback", minIonicMajor: 8 },
] as const;

// --- Lookup helpers ---

const _byTag = new Map<string, ComponentManifestEntry>(
    COMPONENT_MANIFEST.map((e) => [e.tag, e]),
);

const _byCategory = new Map<ComponentCategory, ComponentManifestEntry[]>();
for (const entry of COMPONENT_MANIFEST) {
    const list = _byCategory.get(entry.category) ?? [];
    list.push(entry);
    _byCategory.set(entry.category, list);
}

/** Get a manifest entry by tag name. */
export function getComponentByTag(tag: string): ComponentManifestEntry | undefined {
    return _byTag.get(tag);
}

/** Get all entries in a category (excluding legacy). */
export function getComponentsByCategory(category: ComponentCategory): readonly ComponentManifestEntry[] {
    return (_byCategory.get(category) ?? []).filter((e) => !e.legacy);
}

/** Get all non-legacy tags. */
export function getAllSupportedTags(): readonly string[] {
    return COMPONENT_MANIFEST.filter((e) => !e.legacy).map((e) => e.tag);
}

/** Check if a tag is in the manifest (and not legacy). */
export function isSupportedTag(tag: string): boolean {
    const entry = _byTag.get(tag);
    return entry != null && !entry.legacy;
}

/** Get the full dependency chain for a tag (recursive). */
export function getDependencyChain(tag: string): string[] {
    const entry = _byTag.get(tag);
    if (!entry?.dependencies) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    function visit(t: string) {
        const e = _byTag.get(t);
        if (!e?.dependencies) return;
        for (const dep of e.dependencies) {
            if (seen.has(dep)) continue;
            seen.add(dep);
            result.push(dep);
            visit(dep);
        }
    }
    visit(tag);
    return result;
}

/** Convert a tag name to a subpath-safe name (e.g. "ion-button" → "button"). */
export function tagToSubpath(tag: string): string {
    return tag.replace(/^ion-/, "");
}

/** Convert a tag name to a definer export name (e.g. "ion-button" → "defineIonButton"). */
export function tagToDefinerName(tag: string): string {
    return "defineIon" + tagToSubpath(tag)
        .split("-")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join("");
}
