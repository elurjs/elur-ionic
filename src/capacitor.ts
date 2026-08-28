/**
 * @elurjs/ionic / capacitor.ts
 *
 * Optional Capacitor integration for native mobile apps. This module is
 * isolated behind the `@elurjs/ionic/capacitor` subpath so the main
 * web bundle has ZERO Capacitor dependency cost.
 *
 * All `@capacitor/*` imports are dynamic — they are only loaded when the
 * app runs in a Capacitor native environment. On web, every wrapper is
 * a safe no-op or returns a sensible default.
 *
 * @example Bootstrap a mobile app
 * ```ts
 * // app.ts — only imported in native builds
 * import { createCapacitorApp } from "@elurjs/ionic/capacitor";
 *
 * const app = createCapacitorApp({
 *   statusBar: { style: "dark", backgroundColor: "#1a1a2e" },
 *   splashScreen: { fadeOutDuration: 200 },
 *   backButton: { defaultHref: "/" },
 * });
 * await app.ready();
 * ```
 *
 * @example Individual plugin usage
 * ```ts
 * import { Haptics, StatusBar } from "@elurjs/ionic/capacitor";
 *
 * // No-op on web, vibrates on native
 * Haptics.impact("medium");
 *
 * // No-op on web, sets status bar on native
 * await StatusBar.setStyle({ style: "dark" });
 * ```
 */

// --- Types (type-only imports — zero runtime cost) ---

import { Style as StatusBarStyle } from "@capacitor/status-bar";
import { ImpactStyle, NotificationType } from "@capacitor/haptics";
import type { KeyboardStyle, KeyboardResize } from "@capacitor/keyboard";
import type { URLOpenListenerEvent, AppState } from "@capacitor/app";

// Re-export types for consumers
export type { StatusBarStyle, ImpactStyle, NotificationType, KeyboardStyle, KeyboardResize, URLOpenListenerEvent, AppState };

// --- Platform detection ---

let _isNative: boolean | null = null;

/**
 * Returns true if the app is running inside a Capacitor native platform
 * (iOS/Android). Returns false on web. The check is cached after the first
 * call.
 */
export function isNative(): boolean {
    if (_isNative !== null) return _isNative;
    if (typeof window === "undefined") {
        _isNative = false;
        return false;
    }
    // Capacitor injects a bridge on the window object in native environments
    const cap = (window as any).Capacitor;
    _isNative = !!cap?.isNativePlatform?.();
    return _isNative;
}

/**
 * Returns true if running on web (not native). Convenience inverse of `isNative()`.
 */
export function isWeb(): boolean {
    return !isNative();
}

// --- Lazy plugin loader cache ---

const _pluginCache = new Map<string, Promise<any>>();

async function loadPlugin(name: string): Promise<any> {
    if (_pluginCache.has(name)) return _pluginCache.get(name)!;
    const promise = import(/* @vite-ignore */ name);
    _pluginCache.set(name, promise);
    return promise;
}

// --- StatusBar ---

/**
 * Status bar control wrapper. All methods are no-ops on web.
 */
export const StatusBar = {
    async setStyle(options: { style: StatusBarStyle }): Promise<void> {
        if (!isNative()) return;
        const { StatusBar: sb } = await loadPlugin("@capacitor/status-bar");
        await sb.setStyle(options);
    },

    async setBackgroundColor(options: { color: string }): Promise<void> {
        if (!isNative()) return;
        const { StatusBar: sb } = await loadPlugin("@capacitor/status-bar");
        await sb.setBackgroundColor(options);
    },

    async show(): Promise<void> {
        if (!isNative()) return;
        const { StatusBar: sb } = await loadPlugin("@capacitor/status-bar");
        await sb.show();
    },

    async hide(): Promise<void> {
        if (!isNative()) return;
        const { StatusBar: sb } = await loadPlugin("@capacitor/status-bar");
        await sb.hide();
    },

    async setOverlaysWebView(options: { overlay: boolean }): Promise<void> {
        if (!isNative()) return;
        const { StatusBar: sb } = await loadPlugin("@capacitor/status-bar");
        await sb.setOverlaysWebView(options);
    },
};

// --- SplashScreen ---

/**
 * Splash screen control wrapper. All methods are no-ops on web.
 */
export const SplashScreen = {
    async show(options?: { showDuration?: number; fadeOutDuration?: number; autoHide?: boolean }): Promise<void> {
        if (!isNative()) return;
        const { SplashScreen: ss } = await loadPlugin("@capacitor/splash-screen");
        await ss.show(options);
    },

    async hide(options?: { fadeOutDuration?: number }): Promise<void> {
        if (!isNative()) return;
        const { SplashScreen: ss } = await loadPlugin("@capacitor/splash-screen");
        await ss.hide(options);
    },
};

// --- Keyboard ---

/**
 * Keyboard events wrapper. On web, event listeners are no-ops.
 */
export const Keyboard = {
    async setStyle(options: { style: KeyboardStyle }): Promise<void> {
        if (!isNative()) return;
        const { Keyboard: kb } = await loadPlugin("@capacitor/keyboard");
        await kb.setStyle(options);
    },

    async setResizeMode(options: { mode: KeyboardResize }): Promise<void> {
        if (!isNative()) return;
        const { Keyboard: kb } = await loadPlugin("@capacitor/keyboard");
        await kb.setResizeMode(options);
    },

    async show(): Promise<void> {
        if (!isNative()) return;
        const { Keyboard: kb } = await loadPlugin("@capacitor/keyboard");
        await kb.show();
    },

    async hide(): Promise<void> {
        if (!isNative()) return;
        const { Keyboard: kb } = await loadPlugin("@capacitor/keyboard");
        await kb.hide();
    },

    /**
     * Register a keyboard event listener. Returns an unsubscribe function.
     * On web, returns a no-op unsubscribe.
     */
    onWillShow(callback: (info: { keyboardHeight: number }) => void): () => void {
        if (!isNative()) return () => { };
        let removeFn: (() => void) | null = null;
        loadPlugin("@capacitor/keyboard").then(({ Keyboard: kb }) => {
            kb.addListener("keyboardWillShow", callback).then((h: any) => {
                removeFn = () => h.remove();
            });
        });
        return () => removeFn?.();
    },

    onDidShow(callback: (info: { keyboardHeight: number }) => void): () => void {
        if (!isNative()) return () => { };
        let removeFn: (() => void) | null = null;
        loadPlugin("@capacitor/keyboard").then(({ Keyboard: kb }) => {
            kb.addListener("keyboardDidShow", callback).then((h: any) => {
                removeFn = () => h.remove();
            });
        });
        return () => removeFn?.();
    },

    onWillHide(callback: () => void): () => void {
        if (!isNative()) return () => { };
        let removeFn: (() => void) | null = null;
        loadPlugin("@capacitor/keyboard").then(({ Keyboard: kb }) => {
            kb.addListener("keyboardWillHide", callback).then((h: any) => {
                removeFn = () => h.remove();
            });
        });
        return () => removeFn?.();
    },

    onDidHide(callback: () => void): () => void {
        if (!isNative()) return () => { };
        let removeFn: (() => void) | null = null;
        loadPlugin("@capacitor/keyboard").then(({ Keyboard: kb }) => {
            kb.addListener("keyboardDidHide", callback).then((h: any) => {
                removeFn = () => h.remove();
            });
        });
        return () => removeFn?.();
    },
};

// --- Haptics ---

/**
 * Haptic feedback wrapper. No-op on web.
 */
export const Haptics = {
    async impact(style: ImpactStyle = ImpactStyle.Medium): Promise<void> {
        if (!isNative()) return;
        const { Haptics: h } = await loadPlugin("@capacitor/haptics");
        await h.impact({ style });
    },

    async notification(type: NotificationType = NotificationType.Success): Promise<void> {
        if (!isNative()) return;
        const { Haptics: h } = await loadPlugin("@capacitor/haptics");
        await h.notification({ type });
    },

    async vibrate(options: { duration?: number }): Promise<void> {
        if (!isNative()) return;
        const { Haptics: h } = await loadPlugin("@capacitor/haptics");
        await h.vibrate(options);
    },

    async selectionStart(): Promise<void> {
        if (!isNative()) return;
        const { Haptics: h } = await loadPlugin("@capacitor/haptics");
        await h.selectionStart();
    },

    async selectionChanged(): Promise<void> {
        if (!isNative()) return;
        const { Haptics: h } = await loadPlugin("@capacitor/haptics");
        await h.selectionChanged();
    },

    async selectionEnd(): Promise<void> {
        if (!isNative()) return;
        const { Haptics: h } = await loadPlugin("@capacitor/haptics");
        await h.selectionEnd();
    },
};

// --- App ---

/**
 * App lifecycle and back button wrapper. On web, listeners are no-ops.
 */
export const App = {
    /**
     * Get the current app state ("active" | "background").
     * Returns "active" on web.
     */
    async getState(): Promise<AppState> {
        if (!isNative()) return { isActive: true };
        const { App: app } = await loadPlugin("@capacitor/app");
        return app.getState();
    },

    /**
     * Get the app info (version, build, etc.).
     * Returns empty info on web.
     */
    async getInfo(): Promise<{ version: string; build: string; id: string }> {
        if (!isNative()) return { version: "0.0.0", build: "0", id: "web" };
        const { App: app } = await loadPlugin("@capacitor/app");
        return app.getInfo();
    },

    /**
     * Exit the app (Android only). No-op on web and iOS.
     */
    async exitApp(): Promise<void> {
        if (!isNative()) return;
        const { App: app } = await loadPlugin("@capacitor/app");
        await app.exitApp();
    },

    /**
     * Register a back button listener. On web, returns a no-op unsubscribe.
     * The callback receives the URL that would be navigated to.
     */
    onBackButton(callback: (info: { canGoBack: boolean; url: string }) => void): () => void {
        if (!isNative()) return () => { };
        let removeFn: (() => void) | null = null;
        loadPlugin("@capacitor/app").then(({ App: app }) => {
            app.addListener("backButton", callback).then((h: any) => {
                removeFn = () => h.remove();
            });
        });
        return () => removeFn?.();
    },

    /**
     * Register an app state change listener (active/background transitions).
     * On web, returns a no-op unsubscribe.
     */
    onAppStateChange(callback: (state: { isActive: boolean }) => void): () => void {
        if (!isNative()) return () => { };
        let removeFn: (() => void) | null = null;
        loadPlugin("@capacitor/app").then(({ App: app }) => {
            app.addListener("appStateChange", callback).then((h: any) => {
                removeFn = () => h.remove();
            });
        });
        return () => removeFn?.();
    },

    /**
     * Register a URL open listener (for deep links / custom URL schemes).
     * On web, returns a no-op unsubscribe.
     */
    onUrlOpen(callback: (event: URLOpenListenerEvent) => void): () => void {
        if (!isNative()) return () => { };
        let removeFn: (() => void) | null = null;
        loadPlugin("@capacitor/app").then(({ App: app }) => {
            app.addListener("appUrlOpen", callback).then((h: any) => {
                removeFn = () => h.remove();
            });
        });
        return () => removeFn?.();
    },

    /**
     * Register a resume listener (app returns from background).
     * On web, returns a no-op unsubscribe.
     */
    onResume(callback: () => void): () => void {
        if (!isNative()) return () => { };
        let removeFn: (() => void) | null = null;
        loadPlugin("@capacitor/app").then(({ App: app }) => {
            app.addListener("resume", callback).then((h: any) => {
                removeFn = () => h.remove();
            });
        });
        return () => removeFn?.();
    },
};

// --- Bootstrap helper ---

export interface CapacitorAppOptions {
    /** Status bar configuration. Skipped on web. */
    statusBar?: {
        style?: StatusBarStyle;
        backgroundColor?: string;
        overlaysWebView?: boolean;
    };
    /** Splash screen configuration. Skipped on web. */
    splashScreen?: {
        showDuration?: number;
        fadeOutDuration?: number;
    };
    /** Hardware back button configuration (Android). Skipped on web. */
    backButton?: {
        defaultHref?: string;
        /** Custom handler. If returns false, default navigation is prevented. */
        handler?: (info: { canGoBack: boolean; url: string }) => boolean | void;
    };
    /** Haptic feedback on page transitions. Disabled by default. */
    haptics?: {
        pageTransition?: ImpactStyle;
    };
}

/**
 * Bootstrap helper for Capacitor mobile apps. Configures the status bar,
 * hides the splash screen, and wires up the hardware back button.
 *
 * On web, this is a no-op that resolves immediately.
 *
 * @example
 * ```ts
 * import { createCapacitorApp } from "@elurjs/ionic/capacitor";
 * import { mount } from "@elurjs/core";
 * import { App as RootApp } from "./App";
 *
 * const app = createCapacitorApp({
 *   statusBar: { style: "dark", backgroundColor: "#1a1a2e" },
 *   splashScreen: { fadeOutDuration: 200 },
 *   backButton: { defaultHref: "/home" },
 * });
 *
 * await app.ready();
 * mount(RootApp(), "#app");
 * ```
 */
export function createCapacitorApp(options: CapacitorAppOptions = {}) {
    let _backButtonUnsub: (() => void) | null = null;

    async function ready(): Promise<void> {
        if (!isNative()) return;

        const tasks: Promise<unknown>[] = [];

        // Status bar
        if (options.statusBar) {
            if (options.statusBar.style) {
                tasks.push(StatusBar.setStyle({ style: options.statusBar.style }));
            }
            if (options.statusBar.backgroundColor) {
                tasks.push(StatusBar.setBackgroundColor({ color: options.statusBar.backgroundColor }));
            }
            if (options.statusBar.overlaysWebView !== undefined) {
                tasks.push(StatusBar.setOverlaysWebView({ overlay: options.statusBar.overlaysWebView }));
            }
        }

        // Splash screen — hide after configuration
        if (options.splashScreen) {
            tasks.push(
                SplashScreen.hide({
                    fadeOutDuration: options.splashScreen.fadeOutDuration,
                }),
            );
        } else {
            // Always hide splash if not explicitly configured
            tasks.push(SplashScreen.hide());
        }

        // Back button
        if (options.backButton) {
            _backButtonUnsub = App.onBackButton((info) => {
                if (options.backButton?.handler) {
                    const result = options.backButton.handler(info);
                    if (result === false) return; // handler prevented default
                }
                // Default: navigate to defaultHref or let browser handle
                if (!info.canGoBack && options.backButton?.defaultHref) {
                    window.location.hash = options.backButton.defaultHref;
                }
            });
        }

        await Promise.all(tasks);
    }

    function dispose(): void {
        _backButtonUnsub?.();
        _backButtonUnsub = null;
        // Reset the native platform cache (useful for testing)
        _isNative = null;
    }

    return { ready, dispose };
}
