/**
 * @elurjs/ionic / lifecycle.ts  —  v2
 *
 * Page-lifecycle plumbing identical to v1. The hooks (ionViewWillEnter,
 * ionViewDidEnter, ionViewWillLeave, ionViewDidLeave) still come from the
 * native <ion-page> element events — IonRouterOutlet attaches the listeners
 * when it creates each page.
 *
 * Nothing here needed to change for the single-router refactor.
 */

import { signal, watch } from "@elurjs/core";
import type { Signal } from "@elurjs/core";
import { ElurComponent } from "@elurjs/core";

export interface PageLifecycle {
    willEnter: Signal<number>;
    didEnter: Signal<number>;
    willLeave: Signal<number>;
    didLeave: Signal<number>;
}

export function createPageLifecycle(): PageLifecycle {
    return {
        willEnter: signal(0),
        didEnter: signal(0),
        willLeave: signal(0),
        didLeave: signal(0),
    };
}

/**
 * Internal symbol used by IonRouterOutlet's mount adapter to connect the
 * Ionic page lifecycle to an IonPage instance WITHOUT relying on the
 * subclass calling `super.onInit()`. The outlet calls this method directly
 * and stores the returned disposer so the watches are torn down with the view.
 */
export const _connectIonicLifecycle = Symbol("elur-ionic:connectLifecycle");

/**
 * Class-based pages. Subclass and implement any of the hooks.
 *
 *   class HomePage extends IonPage {
 *     constructor(lc: PageLifecycle) { super(lc); }
 *     ionViewWillEnter() { this.refreshData(); }
 *     render() { return html`...`; }
 *   }
 *
 * Lifecycle wiring no longer depends on `onInit()` / `super.onInit()`:
 * the router outlet calls the symbol-based `_connectIonicLifecycle` method
 * directly and disposes the watches when the view is cleaned up. Subclasses
 * may override `onInit` freely for their own setup without calling super.
 */
export abstract class IonPage extends ElurComponent {
    private __lc: PageLifecycle;
    private __lifecycleDisposers: Array<() => void> = [];

    constructor(lc: PageLifecycle) {
        super();
        this.__lc = lc;
    }

    /**
     * Connects the Ionic view lifecycle signals to this page's hooks.
     * Called once by the router outlet's mount adapter. Returns a disposer
     * that tears down all lifecycle watches.
     *
     * Idempotent: calling it more than once is a no-op after the first call.
     */
    public [_connectIonicLifecycle](): () => void {
        if (this.__lifecycleDisposers.length > 0) return () => this._disposeLifecycle();
        const lc = this.__lc;
        if (this.ionViewWillEnter) {
            this.__lifecycleDisposers.push(watch(lc.willEnter, this.ionViewWillEnter.bind(this)));
        }
        if (this.ionViewDidEnter) {
            this.__lifecycleDisposers.push(watch(lc.didEnter, this.ionViewDidEnter.bind(this)));
        }
        if (this.ionViewWillLeave) {
            this.__lifecycleDisposers.push(watch(lc.willLeave, this.ionViewWillLeave.bind(this)));
        }
        if (this.ionViewDidLeave) {
            this.__lifecycleDisposers.push(watch(lc.didLeave, this.ionViewDidLeave.bind(this)));
        }
        return () => this._disposeLifecycle();
    }

    private _disposeLifecycle(): void {
        for (const d of this.__lifecycleDisposers) d();
        this.__lifecycleDisposers = [];
    }

    ionViewWillEnter?(): void;
    ionViewDidEnter?(): void;
    ionViewWillLeave?(): void;
    ionViewDidLeave?(): void;
}

export function useIonViewWillEnter(lc: PageLifecycle, fn: () => void): () => void {
    return watch(lc.willEnter, fn);
}

export function useIonViewDidEnter(lc: PageLifecycle, fn: () => void): () => void {
    return watch(lc.didEnter, fn);
}

export function useIonViewWillLeave(lc: PageLifecycle, fn: () => void): () => void {
    return watch(lc.willLeave, fn);
}

export function useIonViewDidLeave(lc: PageLifecycle, fn: () => void): () => void {
    return watch(lc.didLeave, fn);
}