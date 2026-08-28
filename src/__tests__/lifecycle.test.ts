import { describe, it, expect, vi } from "vitest";
import { html } from "@elurjs/core";
import {
    createPageLifecycle,
    IonPage,
    _connectIonicLifecycle,
    useIonViewWillEnter,
    useIonViewDidEnter,
    useIonViewWillLeave,
    useIonViewDidLeave,
} from "../lifecycle.js";

describe("createPageLifecycle", () => {
    it("returns four signals", () => {
        const lc = createPageLifecycle();
        expect(lc.willEnter.value).toBe(0);
        expect(lc.didEnter.value).toBe(0);
        expect(lc.willLeave.value).toBe(0);
        expect(lc.didLeave.value).toBe(0);
    });

    it("signals can be incremented", () => {
        const lc = createPageLifecycle();
        lc.willEnter.value = 5;
        expect(lc.willEnter.value).toBe(5);
    });
});

describe("IonPage", () => {
    it("wires lifecycle hooks when _connectIonicLifecycle is called", () => {
        const lc = createPageLifecycle();
        const willEnter = vi.fn();
        const didEnter = vi.fn();
        const willLeave = vi.fn();
        const didLeave = vi.fn();

        class TestPage extends IonPage {
            ionViewWillEnter() {
                willEnter();
            }
            ionViewDidEnter() {
                didEnter();
            }
            ionViewWillLeave() {
                willLeave();
            }
            ionViewDidLeave() {
                didLeave();
            }
            render() {
                return html`<div>Test</div>`;
            }
        }

        const page = new TestPage(lc);
        // The outlet calls the symbol-based API directly — not onInit.
        const dispose = page[_connectIonicLifecycle]();

        lc.willEnter.value++;
        expect(willEnter).toHaveBeenCalledTimes(1);
        lc.didEnter.value++;
        expect(didEnter).toHaveBeenCalledTimes(1);
        lc.willLeave.value++;
        expect(willLeave).toHaveBeenCalledTimes(1);
        lc.didLeave.value++;
        expect(didLeave).toHaveBeenCalledTimes(1);

        // Disposer tears down all watches.
        dispose();
        lc.willEnter.value++;
        lc.didLeave.value++;
        expect(willEnter).toHaveBeenCalledTimes(1);
        expect(didLeave).toHaveBeenCalledTimes(1);
    });

    it("does not wire optional missing hooks", () => {
        const lc = createPageLifecycle();
        const willEnter = vi.fn();

        class TestPage extends IonPage {
            ionViewWillEnter() {
                willEnter();
            }
            render() {
                return html`<div>Test</div>`;
            }
        }

        const page = new TestPage(lc);
        page[_connectIonicLifecycle]();
        lc.willEnter.value++;
        expect(willEnter).toHaveBeenCalledTimes(1);
    });

    it("does not wire any hooks when none are defined", () => {
        const lc = createPageLifecycle();
        const fn = vi.fn();

        class TestPage extends IonPage {
            render() {
                return html`<div>Test</div>`;
            }
        }

        const page = new TestPage(lc);
        page[_connectIonicLifecycle]();
        lc.willEnter.value++;
        lc.didEnter.value++;
        lc.willLeave.value++;
        lc.didLeave.value++;
        expect(fn).not.toHaveBeenCalled();
    });

    it("does not depend on super.onInit() — subclass can override onInit freely", () => {
        const lc = createPageLifecycle();
        const willEnter = vi.fn();

        class NoSuperPage extends IonPage {
            override onInit() {
                /* intentionally does NOT call super.onInit() */
            }
            ionViewWillEnter() {
                willEnter();
            }
            render() {
                return html`<div>Test</div>`;
            }
        }

        const page = new NoSuperPage(lc);
        page.onInit();
        // Lifecycle is wired by the symbol method, independent of onInit.
        page[_connectIonicLifecycle]();
        lc.willEnter.value++;
        expect(willEnter).toHaveBeenCalledTimes(1);
    });
});

describe("composables", () => {
    it("useIonViewWillEnter watches willEnter", () => {
        const lc = createPageLifecycle();
        const fn = vi.fn();
        useIonViewWillEnter(lc, fn);
        lc.willEnter.value++;
        expect(fn).toHaveBeenCalled();
    });

    it("useIonViewDidEnter watches didEnter", () => {
        const lc = createPageLifecycle();
        const fn = vi.fn();
        useIonViewDidEnter(lc, fn);
        lc.didEnter.value++;
        expect(fn).toHaveBeenCalled();
    });

    it("useIonViewWillLeave watches willLeave", () => {
        const lc = createPageLifecycle();
        const fn = vi.fn();
        useIonViewWillLeave(lc, fn);
        lc.willLeave.value++;
        expect(fn).toHaveBeenCalled();
    });

    it("useIonViewDidLeave watches didLeave", () => {
        const lc = createPageLifecycle();
        const fn = vi.fn();
        useIonViewDidLeave(lc, fn);
        lc.didLeave.value++;
        expect(fn).toHaveBeenCalled();
    });
});
