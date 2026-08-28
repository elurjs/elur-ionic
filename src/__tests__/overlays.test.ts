import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @ionic/core controllers
const mockOverlayEl = () => {
    let _dismissCallback: ((detail: unknown) => void) | null = null;
    const el = {
        present: vi.fn(async () => { }),
        dismiss: vi.fn(async (data?: unknown, role?: string) => {
            _dismissCallback?.({ data, role });
            return true;
        }),
        onDidDismiss: vi.fn(() => {
            return new Promise((resolve) => {
                _dismissCallback = resolve;
            });
        }),
        onWillDismiss: vi.fn(() => Promise.resolve(null)),
    };
    return el;
};

vi.mock("@ionic/core", () => ({
    toastController: {
        create: vi.fn(async () => mockOverlayEl()),
        dismiss: vi.fn(async () => true),
        getTop: vi.fn(async () => undefined),
    },
    alertController: {
        create: vi.fn(async () => mockOverlayEl()),
        dismiss: vi.fn(async () => true),
        getTop: vi.fn(async () => undefined),
    },
    loadingController: {
        create: vi.fn(async () => mockOverlayEl()),
        dismiss: vi.fn(async () => true),
        getTop: vi.fn(async () => undefined),
    },
    actionSheetController: {
        create: vi.fn(async () => mockOverlayEl()),
        dismiss: vi.fn(async () => true),
        getTop: vi.fn(async () => undefined),
    },
    popoverController: {
        create: vi.fn(async () => mockOverlayEl()),
        dismiss: vi.fn(async () => true),
        getTop: vi.fn(async () => undefined),
    },
    modalController: {
        create: vi.fn(async () => mockOverlayEl()),
        dismiss: vi.fn(async () => true),
        getTop: vi.fn(async () => undefined),
    },
    pickerController: {
        create: vi.fn(async () => mockOverlayEl()),
        dismiss: vi.fn(async () => true),
        getTop: vi.fn(async () => undefined),
    },
}));

import {
    createToast,
    createAlert,
    createLoading,
    createActionSheet,
    createPopover,
    createModal,
    createPicker,
    createModalController,
    createPopoverController,
    createElurDelegate,
    showToast,
    withLoading,
    confirm,
    toastController,
    loadingController,
    alertController,
    modalController,
    popoverController,
} from "../overlays.js";
import { html } from "@elurjs/core";

describe("overlay controllers (create* pattern)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createToast", () => {
        it("creates and presents a toast", async () => {
            const toast = createToast();
            await toast.present({ message: "Hello", duration: 1000 });
            expect(toastController.create).toHaveBeenCalledWith({ message: "Hello", duration: 1000 });
            expect(toast.presented.value).toBe(true);
        });

        it("starts with presented=false and result=null", () => {
            const toast = createToast();
            expect(toast.presented.value).toBe(false);
            expect(toast.result.value).toBe(null);
        });

        it("dismisses the active toast", async () => {
            const toast = createToast();
            await toast.present({ message: "Hi" });
            const dismissed = await toast.dismiss("data", "close");
            expect(dismissed).toBe(true);
        });

        it("dispose dismisses the active overlay", async () => {
            const toast = createToast();
            await toast.present({ message: "Hi" });
            expect(toast.presented.value).toBe(true);
            toast.dispose();
            expect(toast.presented.value).toBe(false);
        });

        it("dispose is safe to call multiple times", async () => {
            const toast = createToast();
            toast.dispose();
            toast.dispose();
            toast.dispose();
            expect(toast.presented.value).toBe(false);
        });

        it("present after dispose is a no-op", async () => {
            const toast = createToast();
            toast.dispose();
            await toast.present({ message: "test" });
            expect(toastController.create).not.toHaveBeenCalled();
        });
    });

    describe("createAlert", () => {
        it("creates and presents an alert", async () => {
            const alert = createAlert();
            await alert.present({ header: "Warning", message: "Are you sure?" });
            expect(alertController.create).toHaveBeenCalledWith({ header: "Warning", message: "Are you sure?" });
            expect(alert.presented.value).toBe(true);
        });
    });

    describe("createLoading", () => {
        it("creates and presents a loading overlay", async () => {
            const loading = createLoading();
            await loading.present({ message: "Loading..." });
            expect(loadingController.create).toHaveBeenCalledWith({ message: "Loading..." });
            expect(loading.presented.value).toBe(true);
        });
    });

    describe("createActionSheet", () => {
        it("creates and presents an action sheet", async () => {
            const sheet = createActionSheet();
            await sheet.present({ buttons: [{ text: "A" }, { text: "B" }] });
            expect(sheet.presented.value).toBe(true);
        });
    });

    describe("createPopover", () => {
        it("creates and presents a popover", async () => {
            const popover = createPopover();
            await popover.present({ component: "div" });
            expect(popover.presented.value).toBe(true);
        });
    });

    describe("createModal", () => {
        it("creates and presents a modal", async () => {
            const modal = createModal();
            await modal.present({ component: "div" });
            expect(modal.presented.value).toBe(true);
        });
    });

    describe("showToast (one-shot)", () => {
        it("creates and presents a toast without returning a controller", async () => {
            await showToast({ message: "Quick" });
            expect(toastController.create).toHaveBeenCalledWith({ message: "Quick" });
        });
    });

    describe("withLoading", () => {
        it("presents loading, runs task, then dismisses", async () => {
            const task = vi.fn(async () => 42);
            const result = await withLoading({ message: "Working" }, task);
            expect(result).toBe(42);
            expect(task).toHaveBeenCalled();
            expect(loadingController.create).toHaveBeenCalledWith({ message: "Working" });
        });

        it("dismisses loading even if task throws", async () => {
            const task = vi.fn(async () => { throw new Error("fail"); });
            await expect(withLoading({ message: "Working" }, task)).rejects.toThrow("fail");
            expect(loadingController.create).toHaveBeenCalled();
        });
    });

    describe("confirm", () => {
        it("creates an alert with confirm/cancel buttons", async () => {
            confirm({ header: "Sure?", message: "Really?" });
            expect(alertController.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    header: "Sure?",
                    message: "Really?",
                    buttons: expect.arrayContaining([
                        expect.objectContaining({ role: "cancel" }),
                        expect.objectContaining({ role: "confirm" }),
                    ]),
                }),
            );
        });
    });

    describe("createPicker", () => {
        it("creates and presents a picker via pickerController", async () => {
            const picker = createPicker();
            await picker.present({
                columns: [{
                    name: "size",
                    options: [
                        { text: "Small", value: "sm" },
                        { text: "Large", value: "lg" },
                    ],
                }],
                buttons: [{ text: "Done", role: "confirm" }],
            });
            expect(picker.presented.value).toBe(true);
        });

        it("dismisses the picker", async () => {
            const picker = createPicker();
            await picker.present({
                columns: [{ name: "c", options: [{ text: "A", value: "a" }] }],
                buttons: [{ text: "Done", role: "confirm" }],
            });
            expect(picker.presented.value).toBe(true);

            const dismissed = await picker.dismiss(undefined, "confirm");
            expect(dismissed).toBe(true);
            expect(picker.presented.value).toBe(false);
        });
    });

    describe("createElurDelegate", () => {
        it("creates a delegate with attachViewToDom and removeViewFromDom", () => {
            const delegate = createElurDelegate();
            expect(typeof delegate.attachViewToDom).toBe("function");
            expect(typeof delegate.removeViewFromDom).toBe("function");
        });

        it("mounts Elur content into a container", async () => {
            const delegate = createElurDelegate();
            const container = document.createElement("div");
            const component = () => html`<p data-testid="delegate-content">Hello</p>`;

            const el = await delegate.attachViewToDom(container, component);
            expect(container.contains(el)).toBe(true);
            expect(el.querySelector('[data-testid="delegate-content"]')).toBeTruthy();
        });

        it("cleans up content on removeViewFromDom", async () => {
            const delegate = createElurDelegate();
            const container = document.createElement("div");
            const component = () => html`<p data-testid="cleanup-test">Content</p>`;

            const el = await delegate.attachViewToDom(container, component);
            expect(container.contains(el)).toBe(true);

            await delegate.removeViewFromDom(container, el);
            expect(container.contains(el)).toBe(false);
        });

        it("applies cssClasses to the wrapper", async () => {
            const delegate = createElurDelegate();
            const container = document.createElement("div");
            const component = () => html`<p>Test</p>`;

            const el = await delegate.attachViewToDom(container, component, {}, ["custom-class", "another"]);
            expect(el.classList.contains("custom-class")).toBe(true);
            expect(el.classList.contains("another")).toBe(true);
        });
    });

    describe("createModalController", () => {
        it("presents a modal with Elur delegate", async () => {
            const modal = createModalController();
            await modal.present({
                component: () => html`<ion-content><p>Modal content</p></ion-content>`,
            });
            expect(modalController.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    delegate: expect.objectContaining({
                        attachViewToDom: expect.any(Function),
                        removeViewFromDom: expect.any(Function),
                    }),
                }),
            );
            expect(modal.presented.value).toBe(true);
        });

        it("accepts custom delegate", async () => {
            const customDelegate = createElurDelegate();
            const modal = createModalController(customDelegate);
            await modal.present({
                component: () => html`<p>Custom</p>`,
            });
            expect(modalController.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    delegate: customDelegate,
                }),
            );
        });

        it("passes through modal options", async () => {
            const modal = createModalController();
            await modal.present({
                component: () => html`<p>Test</p>`,
                backdropDismiss: false,
                showBackdrop: true,
                cssClasses: ["my-modal"],
            });
            expect(modalController.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    backdropDismiss: false,
                    showBackdrop: true,
                    cssClasses: ["my-modal"],
                }),
            );
        });
    });

    describe("createPopoverController", () => {
        it("presents a popover with Elur delegate", async () => {
            const popover = createPopoverController();
            await popover.present({
                component: () => html`<ion-content><p>Popover</p></ion-content>`,
            });
            expect(popoverController.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    delegate: expect.objectContaining({
                        attachViewToDom: expect.any(Function),
                        removeViewFromDom: expect.any(Function),
                    }),
                }),
            );
            expect(popover.presented.value).toBe(true);
        });
    });
});
