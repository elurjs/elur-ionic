/**
 * @elurjs/ionic/devtools — dev-only entry point.
 *
 * Registers an `Ionic` plugin on the elur DevTools backend hook
 * (`window.__ELUR_DEVTOOLS_HOOK__`) exposing router outlets (cached views
 * per tab, cache policy) and navigation managers (per-tab stacks, transition
 * state). Only loaded when explicitly imported (the Vite plugin injects it
 * in dev mode); never bundled into production apps.
 */
import type { NavigationManager } from "./navigation";
import type { IonRouterOutlet } from "./IonRouterOutlet";

export interface IonicDevtoolsSnapshot {
    outlets: Array<{
        cacheEnabled: boolean;
        cachePolicy: { max?: number; ttl?: number; strategy?: string };
        views: Array<{
            tab: string;
            key: string;
            routePath: string;
            ageMs: number;
            idleMs: number;
        }>;
        stacks: Array<{ prefix: string; depth: number; entries: string[] }>;
    }>;
    navigation: Array<{
        activeTab: string;
        tabPrefixes: string[];
        canGoBack: boolean;
        isTransitioning: boolean;
        stacks: Array<{ prefix: string; depth: number; entries: string[] }>;
    }>;
}

const _navigationRegistryKey = Symbol.for("@elurjs/ionic/navigation");
const _outletRegistryKey = Symbol.for("@elurjs/ionic/outlets");

function getRegistry<T>(key: symbol): T[] {
    const set = (globalThis as Record<PropertyKey, unknown>)[key] as Set<T> | undefined;
    return set ? Array.from(set) : [];
}

/** Builds a JSON-safe snapshot of outlets and navigation managers. */
export function getIonicDevtoolsSnapshot(): IonicDevtoolsSnapshot {
    const now = Date.now();

    const outlets = getRegistry<IonRouterOutlet>(_outletRegistryKey).map((outlet) => {
        const snap = outlet._debugSnapshot();
        return {
            cacheEnabled: snap.cacheEnabled,
            cachePolicy: { ...snap.cachePolicy },
            views: snap.views.map((view) => ({
                tab: view.tab,
                key: view.key,
                routePath: view.routePath,
                ageMs: now - view.createdAt,
                idleMs: now - view.lastAccessed,
            })),
            stacks: snap.stacks,
        };
    });

    const navigation = getRegistry<NavigationManager>(_navigationRegistryKey).map((nav) => ({
        activeTab: nav.activeTab,
        tabPrefixes: [...nav.tabPrefixes],
        canGoBack: nav.canGoBack.value,
        isTransitioning: nav.isTransitioning,
        stacks: nav.stacks._debugSnapshot(),
    }));

    return { outlets, navigation };
}

const descriptor = {
    id: "@elurjs/ionic",
    label: "Ionic",
    getSnapshot: getIonicDevtoolsSnapshot,
};

declare global {
    interface Window {
        __ELUR_DEVTOOLS_HOOK__?: {
            version: number;
            registerPlugin(plugin: {
                id: string;
                label?: string;
                getSnapshot?(): unknown;
            }): () => void;
        };
        __ELUR_DEVTOOLS_PENDING_PLUGINS__?: Array<typeof descriptor>;
    }
}

if (typeof window !== "undefined") {
    const hook = window.__ELUR_DEVTOOLS_HOOK__;
    if (hook) hook.registerPlugin(descriptor);
    else (window.__ELUR_DEVTOOLS_PENDING_PLUGINS__ ??= []).push(descriptor);
}
