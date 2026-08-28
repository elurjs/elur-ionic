/**
 * @elurjs/ionic / overlays.ts
 *
 * Reactive overlay controllers for Elur following the `create*` pattern
 * (`createStore`, `createRouter`, `createForm` → `createToast`, `createAlert`, etc.).
 *
 * Each controller provides:
 *   - `presented: Signal<boolean>` — reactive presentation state
 *   - `result: Signal<OverlayEventDetail | null>` — dismiss event detail
 *   - `present(opts)` — creates + presents the overlay
 *   - `dismiss(data?, role?)` — dismisses the active overlay
 *   - `dispose()` — transactional cleanup, dismisses if still presented
 *
 * Stale-result protection: only the most recent `present()` call's dismiss
 * event updates the result signal. Latest-wins: presenting a new overlay
 * dismisses the previous one.
 *
 * @example Function component (preferred)
 * ```ts
 * import { signal, html } from "@elurjs/core";
 * import { createToast, createAlert } from "@elurjs/ionic";
 *
 * function SettingsPage() {
 *   // Create overlay controllers — signals close over function scope
 *   const toast = createToast();
 *   const alert = createAlert();
 *
 *   const save = async () => {
 *     // Use withLoading for async tasks
 *     const ok = await withLoading({ message: "Saving..." }, async () => {
 *       await fetch("/api/settings", { method: "POST" });
 *     });
 *     toast.present({ message: "Saved!", duration: 1500 });
 *   };
 *
 *   const deleteAccount = () => {
 *     // confirm() returns a Promise<boolean>
 *     confirm({
 *       header: "Delete account",
 *       message: "This cannot be undone.",
 *       confirmText: "Delete",
 *     }).then((yes) => {
 *       if (yes) alert.present({ header: "Done", message: "Account deleted" });
 *     });
 *   };
 *
 *   return html`
 *     <ion-content>
 *       <ion-button @click=${save}>Save</ion-button>
 *       <ion-button color="danger" @click=${deleteAccount}>Delete</ion-button>
 *     </ion-content>
 *   `;
 * }
 * ```
 *
 * @example Class component with lifecycle cleanup
 * ```ts
 * import { ElurComponent, html, signal } from "@elurjs/core";
 * import { createLoading, IonPage } from "@elurjs/ionic";
 *
 * class ProfilePage extends IonPage {
 *   private loading = createLoading();
 *   private data = signal<unknown>(null);
 *
 *   override async onMount() {
 *     // withLoading auto-dismisses on settle or error
 *     const result = await withLoading(
 *       { message: "Loading profile..." },
 *       () => fetch("/api/profile").then(r => r.json()),
 *     );
 *     this.data.value = result;
 *   }
 *
 *   override onUnmount() {
 *     // Dispose all overlay controllers to prevent leaks
 *     this.loading.dispose();
 *   }
 *
 *   override render() {
 *     return html`
 *       <ion-content>
 *         <p>${() => JSON.stringify(this.data.value)}</p>
 *       </ion-content>
 *     `;
 *   }
 * }
 * ```
 *
 * @example Reactive UI driven by overlay signals
 * ```ts
 * import { signal, html } from "@elurjs/core";
 * import { createModal } from "@elurjs/ionic";
 *
 * function ProductList() {
 *   const modal = createModal();
 *   const selected = signal<string | null>(null);
 *
 *   const openDetail = (id: string) => {
 *     selected.value = id;
 *     modal.present({ component: "product-detail" });
 *   };
 *
 *   return html`
 *     <ion-content>
 *       <ion-list>
 *         <ion-button @click=${() => openDetail("1")}>Product 1</ion-button>
 *       </ion-list>
 *
 *       <!-- Reactively show dismiss result -->
 *       ${() => modal.result.value
 *         ? html`<p>Modal closed with role: ${modal.result.value.role}</p>`
 *         : null}
 *
 *       <!-- Reactively disable button while modal is open -->
 *       <ion-button
 *         disabled=${() => modal.presented.value}
 *         @click=${() => openDetail("2")}
 *       >Product 2</ion-button>
 *     </ion-content>
 *   `;
 * }
 * ```
 */

import { signal, type Signal, mount, type ElurTemplate, type ElurComponent } from "@elurjs/core";
import {
    toastController,
    alertController,
    loadingController,
    actionSheetController,
    popoverController,
    modalController,
    pickerController,
} from "@ionic/core";

// --- Elur framework delegate for overlays ---
// Ionic overlays (popover, modal) need a "framework delegate" to render
// content when `component` is not a string tag name or HTMLElement.
// We provide a delegate that uses Elur `mount()` to render templates.

interface FrameworkDelegate {
    attachViewToDom: (
        parentElement: HTMLElement,
        userComponent: unknown,
        userComponentProps?: Record<string, unknown>,
        cssClasses?: string[],
    ) => Promise<HTMLElement>;
    removeViewFromDom: (
        parentElement: HTMLElement,
        childElement: HTMLElement,
    ) => Promise<void>;
}

let _delegateHandle: { unmount: () => void } | null = null;

const elurDelegate: FrameworkDelegate = {
    async attachViewToDom(parentElement, userComponent, _props, cssClasses) {
        // If userComponent is a function (ElurTemplate factory), call it and mount
        if (typeof userComponent === "function") {
            const template = (userComponent as () => ElurTemplate)();
            const handle = mount(template, parentElement);
            _delegateHandle = handle;
            return parentElement;
        }
        // If userComponent is a string, create the element
        if (typeof userComponent === "string") {
            const el = document.createElement(userComponent);
            if (cssClasses) cssClasses.forEach((c) => el.classList.add(c));
            parentElement.appendChild(el);
            return el;
        }
        // If userComponent is an HTMLElement, append it
        if (userComponent instanceof HTMLElement) {
            if (cssClasses) cssClasses.forEach((c) => userComponent.classList.add(c));
            parentElement.appendChild(userComponent);
            return userComponent;
        }
        // Fallback: just return the parent
        return parentElement;
    },
    async removeViewFromDom(_parent, _child) {
        if (_delegateHandle) {
            _delegateHandle.unmount();
            _delegateHandle = null;
        }
    },
};

// --- Types ---

export interface OverlayHandle<TDetail = unknown> {
    /** True while the overlay is presented (visible). */
    readonly presented: Signal<boolean>;
    /** The dismiss event detail (role, data) — null until dismissed. */
    readonly result: Signal<TDetail | null>;
    /** Present the overlay with the given options. */
    present(options: Record<string, unknown>): Promise<void>;
    /** Dismiss the active overlay with optional data and role. */
    dismiss(data?: unknown, role?: string): Promise<boolean>;
    /** Cleanup: dismisses any active overlay. Safe to call multiple times. */
    dispose(): void;
}

interface ActiveOverlay {
    el: { dismiss: (data?: unknown, role?: string) => Promise<boolean> };
    dismissPromise: Promise<unknown>;
    token: number; // stale-result protection
}

// --- Internal factory ---

function createOverlayHandle<TDetail>(
    controller: {
        create: (opts: Record<string, unknown>) => Promise<any>;
    },
): OverlayHandle<TDetail> {
    const presented = signal(false);
    const result = signal<TDetail | null>(null);
    let active: ActiveOverlay | null = null;
    let disposed = false;

    async function present(options: Record<string, unknown>): Promise<void> {
        if (disposed) return;

        // If an overlay is already active, dismiss it first (latest-wins).
        if (active) {
            try {
                await active.el.dismiss();
            } catch { /* ignore */ }
        }

        const token = (active?.token ?? 0) + 1;

        // If `component` is a function (ElurTemplate factory), inject our
        // framework delegate so Ionic can render Elur templates inside
        // popover/modal overlays.
        const opts = { ...options };
        if (typeof opts.component === "function" && !opts.delegate) {
            opts.delegate = elurDelegate;
        }

        const el = await controller.create(opts);
        await el.present();
        active = { el, dismissPromise: el.onDidDismiss?.() ?? Promise.resolve(null), token };
        presented.value = true;

        // Fire-and-forget the dismiss wait — updates state when the overlay
        // is dismissed by the user or by dismiss(). This avoids blocking the
        // caller; they can use the `presented` and `result` signals to react.
        active.dismissPromise
            .then((detail) => {
                if (active?.token === token && !disposed) {
                    result.value = detail as TDetail;
                    presented.value = false;
                    active = null;
                }
            })
            .catch(() => {
                if (active?.token === token && !disposed) {
                    presented.value = false;
                    active = null;
                }
            });
    }

    async function dismiss(data?: unknown, role?: string): Promise<boolean> {
        if (!active || disposed) return false;
        try {
            return await active.el.dismiss(data, role);
        } catch {
            return false;
        }
    }

    function dispose(): void {
        if (disposed) return;
        disposed = true;
        if (active) {
            try {
                active.el.dismiss();
            } catch { /* ignore */ }
            active = null;
        }
        presented.value = false;
    }

    return { presented, result, present, dismiss, dispose };
}

// --- Public factories (create* pattern) ---

/**
 * Create a reactive toast overlay controller.
 * Call `dispose()` in `onUnmount()` when used in a class component.
 */
export function createToast(): OverlayHandle {
    return createOverlayHandle(toastController as any);
}

/**
 * Create a reactive alert overlay controller.
 * Call `dispose()` in `onUnmount()` when used in a class component.
 */
export function createAlert(): OverlayHandle {
    return createOverlayHandle(alertController as any);
}

/**
 * Create a reactive loading overlay controller.
 * Call `dispose()` in `onUnmount()` when used in a class component.
 */
export function createLoading(): OverlayHandle {
    return createOverlayHandle(loadingController as any);
}

/**
 * Create a reactive action-sheet overlay controller.
 * Call `dispose()` in `onUnmount()` when used in a class component.
 */
export function createActionSheet(): OverlayHandle {
    return createOverlayHandle(actionSheetController as any);
}

/**
 * Create a reactive popover overlay controller.
 * Call `dispose()` in `onUnmount()` when used in a class component.
 */
export function createPopover(): OverlayHandle {
    return createOverlayHandle(popoverController as any);
}

/**
 * Create a reactive modal overlay controller.
 * Call `dispose()` in `onUnmount()` when used in a class component.
 */
export function createModal(): OverlayHandle {
    return createOverlayHandle(modalController as any);
}

// --- Convenience: one-shot helpers (no controller needed) ---

/**
 * Present a toast and return immediately (fire-and-forget).
 * The toast auto-dismisses after its duration.
 *
 * @example
 * ```ts
 * import { showToast } from "@elurjs/ionic";
 *
 * showToast({ message: "Saved!", duration: 1500 });
 * ```
 */
export async function showToast(
    options: Record<string, unknown>,
): Promise<void> {
    const toast = await toastController.create(options);
    await toast.present();
}

/**
 * Present a loading overlay, run an async task, then dismiss.
 * Returns the task result. If the task throws, the loading is still dismissed.
 *
 * @example
 * ```ts
 * import { withLoading } from "@elurjs/ionic";
 *
 * const data = await withLoading(
 *   { message: "Fetching..." },
 *   () => fetch("/api/data").then(r => r.json()),
 * );
 * ```
 */
export async function withLoading<T>(
    options: Record<string, unknown>,
    task: () => Promise<T>,
): Promise<T> {
    const loading = await loadingController.create(options);
    await loading.present();
    try {
        return await task();
    } finally {
        await loading.dismiss();
    }
}

/**
 * Present a confirm alert and return true if "OK" was clicked, false otherwise.
 *
 * @example
 * ```ts
 * import { confirm } from "@elurjs/ionic";
 *
 * const yes = await confirm({
 *   header: "Delete",
 *   message: "Are you sure?",
 *   confirmText: "Delete",
 * });
 * if (yes) deleteItem();
 * ```
 */
export async function confirm(
    options: { header?: string; message?: string; confirmText?: string; cancelText?: string },
): Promise<boolean> {
    return new Promise((resolve) => {
        alertController
            .create({
                header: options.header,
                message: options.message,
                buttons: [
                    { text: options.cancelText ?? "Cancel", role: "cancel", handler: () => resolve(false) },
                    { text: options.confirmText ?? "OK", role: "confirm", handler: () => resolve(true) },
                ],
            } as any)
            .then((el) => el.present());
    });
}

// Re-export Ionic controllers for advanced use
export {
    toastController,
    alertController,
    loadingController,
    actionSheetController,
    popoverController,
    modalController,
    pickerController,
};

// =============================================================================
// --- Elur delegate for modal/popover content mounting ---
// =============================================================================

/**
 * A Elur FrameworkDelegate that can mount ElurTemplate or ElurComponent
 * instances inside Ionic overlays (modal, popover).
 *
 * Ionic's `FrameworkDelegate` interface has two methods:
 *   - `attachViewToDom(container, component, props, cssClasses)` → HTMLElement
 *   - `removeViewFromDom(container, component)` → void
 *
 * For Elur, "component" is a function that returns a ElurTemplate or
 * ElurComponent. The delegate creates a wrapper div, mounts the Elur
 * content into it, appends it to the overlay, and tracks the unmount
 * handle for cleanup on dismiss.
 */
export interface ElurOverlayDelegate {
    attachViewToDom(
        container: HTMLElement,
        component: () => ElurTemplate | ElurComponent,
        propsOrData?: Record<string, unknown>,
        cssClasses?: string[],
    ): Promise<HTMLElement>;
    removeViewFromDom(container: HTMLElement, component: unknown): Promise<void>;
}

/**
 * Create a Elur delegate for use with Ionic modal/popover controllers.
 * The delegate mounts Elur templates inside overlays and cleans up on
 * removal.
 *
 * @example
 * ```ts
 * import { createElurDelegate, createModal } from "@elurjs/ionic";
 * import { html, signal } from "@elurjs/core";
 *
 * const delegate = createElurDelegate();
 * const modal = createModal();
 *
 * // The delegate is passed via `delegate` option
 * modal.present({
 *   component: () => html`<ion-content><h1>Hello from modal!</h1></ion-content>`,
 *   delegate,
 * });
 * ```
 */
export function createElurDelegate(): ElurOverlayDelegate {
    // Track unmount handles by wrapper element for cleanup
    const handles = new Map<HTMLElement, () => void>();

    return {
        async attachViewToDom(
            container: HTMLElement,
            component: () => ElurTemplate | ElurComponent,
            _propsOrData?: Record<string, unknown>,
            cssClasses?: string[],
        ): Promise<HTMLElement> {
            // Create a wrapper div to hold the Elur content
            const wrapper = document.createElement("div");
            if (cssClasses) {
                for (const cls of cssClasses) wrapper.classList.add(cls);
            }
            // Mount the Elur content into the wrapper
            const handle = mount(component(), wrapper);
            handles.set(wrapper, handle.unmount);
            // Append to the overlay container
            container.appendChild(wrapper);
            return wrapper;
        },

        async removeViewFromDom(_container: HTMLElement, component: unknown): Promise<void> {
            // component is the wrapper element returned by attachViewToDom
            const wrapper = component as HTMLElement;
            const unmount = handles.get(wrapper);
            if (unmount) {
                unmount();
                handles.delete(wrapper);
            }
            if (wrapper.parentElement) {
                wrapper.remove();
            }
        },
    };
}

// =============================================================================
// --- Enhanced modal/popover with delegate support ---
// =============================================================================

/**
 * Options for presenting a modal with Elur content.
 * The `component` function returns a ElurTemplate or ElurComponent that will
 * be mounted inside the modal via the Elur delegate.
 */
export interface ModalOptions {
    /** Function returning the Elur content to mount inside the modal. */
    component: () => ElurTemplate | ElurComponent;
    /** Component props/data passed to the delegate. */
    componentProps?: Record<string, unknown>;
    /** CSS classes to add to the mounted content wrapper. */
    cssClasses?: string[];
    /** Modal-specific options. */
    backdropDismiss?: boolean;
    showBackdrop?: boolean;
    animated?: boolean;
    canDismiss?: boolean | (() => Promise<boolean>);
    /** Custom delegate (if not provided, a default Elur delegate is used). */
    delegate?: ElurOverlayDelegate;
    [key: string]: unknown;
}

/**
 * Options for presenting a popover with Elur content.
 */
export interface PopoverOptions {
    /** Function returning the Elur content to mount inside the popover. */
    component: () => ElurTemplate | ElurComponent;
    /** Component props/data passed to the delegate. */
    componentProps?: Record<string, unknown>;
    /** CSS classes to add to the mounted content wrapper. */
    cssClasses?: string[];
    /** The element that the popover should be anchored to. */
    event?: Event | { target: HTMLElement };
    /** Popover-specific options. */
    backdropDismiss?: boolean;
    showBackdrop?: boolean;
    animated?: boolean;
    /** Custom delegate (if not provided, a default Elur delegate is used). */
    delegate?: ElurOverlayDelegate;
    [key: string]: unknown;
}

/**
 * Enhanced modal controller with Elur delegate support.
 * Unlike the basic `createModal()`, this automatically creates and uses
 * a Elur delegate so `component` can be a ElurTemplate/ElurComponent.
 *
 * @example
 * ```ts
 * import { createModalController, createElurDelegate } from "@elurjs/ionic";
 * import { html, signal } from "@elurjs/core";
 *
 * const modal = createModalController();
 *
 * modal.present({
 *   component: () => html`
 *     <ion-header>
 *       <ion-toolbar><ion-title>Settings</ion-title></ion-toolbar>
 *     </ion-header>
 *     <ion-content><p>Modal content here</p></ion-content>
 *   `,
 * });
 *
 * // React to dismiss
 * effect(() => {
 *   if (modal.result.value) {
 *     console.log("Modal dismissed:", modal.result.value);
 *   }
 * });
 * ```
 */
export function createModalController(delegate?: ElurOverlayDelegate): OverlayHandle {
    const elurDelegate = delegate ?? createElurDelegate();
    const handle = createOverlayHandle(modalController as any);

    // Wrap present to inject the delegate and convert component
    const originalPresent = handle.present;
    async function present(options: ModalOptions): Promise<void> {
        await originalPresent({
            ...options,
            delegate: elurDelegate,
        });
    }

    return { ...handle, present };
}

/**
 * Enhanced popover controller with Elur delegate support.
 * Automatically creates and uses a Elur delegate so `component` can be
 * a ElurTemplate/ElurComponent.
 *
 * @example
 * ```ts
 * import { createPopoverController } from "@elurjs/ionic";
 * import { html } from "@elurjs/core";
 *
 * const popover = createPopoverController();
 *
 * // In an event handler:
 * popover.present({
 *   component: () => html`<ion-content><p>Popover content</p></ion-content>`,
 *   event, // the click event for anchoring
 * });
 * ```
 */
export function createPopoverController(delegate?: ElurOverlayDelegate): OverlayHandle {
    const elurDelegate = delegate ?? createElurDelegate();
    const handle = createOverlayHandle(popoverController as any);

    const originalPresent = handle.present;
    async function present(options: PopoverOptions): Promise<void> {
        await originalPresent({
            ...options,
            delegate: elurDelegate,
        });
    }

    return { ...handle, present };
}

// =============================================================================
// --- Picker wrapper ---
// =============================================================================

/**
 * Options for a picker column.
 */
export interface PickerColumnOption {
    text: string;
    value: string | number;
    disabled?: boolean;
}

/**
 * Options for presenting a picker overlay.
 */
export interface PickerOptions {
    columns: Array<{
        name: string;
        options: PickerColumnOption[];
        selectedIndex?: number;
    }>;
    buttons?: Array<{
        text: string;
        role?: string;
        handler?: (selected: Record<string, PickerColumnOption>) => void;
    }>;
    cssClass?: string;
    animated?: boolean;
    backdropDismiss?: boolean;
    [key: string]: unknown;
}

/**
 * Create a reactive picker overlay controller.
 * Pickers are column-based selection overlays (like iOS date pickers).
 *
 * @example
 * ```ts
 * import { createPicker } from "@elurjs/ionic";
 *
 * const picker = createPicker();
 * await picker.present({
 *   columns: [{
 *     name: "size",
 *     options: [
 *       { text: "Small", value: "sm" },
 *       { text: "Medium", value: "md" },
 *       { text: "Large", value: "lg" },
 *     ],
 *   }],
 *   buttons: [
 *     { text: "Cancel", role: "cancel" },
 *     { text: "Done", role: "confirm" },
 *   ],
 * });
 * ```
 */
export function createPicker(): OverlayHandle {
    // Ionic 8's ion-picker is a wheel-style component without columns/buttons/isOpen.
    // The legacy picker (with columns, buttons, isOpen) is accessed via pickerController,
    // which creates <ion-picker-legacy> internally. These legacy components must be
    // registered as custom elements, otherwise customElements.whenDefined() hangs
    // forever and the picker never appears.
    //
    // We register them lazily here (not in setup.ts) to preserve tree-shaking —
    // apps that don't use the picker won't bundle the legacy picker code.
    if (typeof customElements !== "undefined") {
        if (!customElements.get("ion-picker-legacy")) {
            import("@ionic/core/components/ion-picker-legacy.js")
                .then((m) => m.defineCustomElement())
                .catch(() => { });
        }
        if (!customElements.get("ion-picker-legacy-column")) {
            import("@ionic/core/components/ion-picker-legacy-column.js")
                .then((m) => m.defineCustomElement())
                .catch(() => { });
        }
        if (!customElements.get("ion-backdrop")) {
            import("@ionic/core/components/ion-backdrop.js")
                .then((m) => m.defineCustomElement())
                .catch(() => { });
        }
    }
    return createOverlayHandle(pickerController as any);
}
