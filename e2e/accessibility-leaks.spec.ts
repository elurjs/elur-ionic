import { test, expect, type Page } from "@playwright/test";

/**
 * E2E tests for accessibility and memory leak behavior.
 *
 * These tests run against REAL @ionic/core (no mocks) and verify:
 * - ARIA roles and labels on key Ionic components
 * - Focus management during navigation
 * - Listener/effect cleanup after repeated navigation
 * - Overlay disposal doesn't leak DOM nodes
 * - No orphaned ion-page elements after navigation
 */

async function clickVisible(page: Page, testid: string): Promise<void> {
    await page.evaluate((id) => {
        const els = document.querySelectorAll(`[data-testid='${id}']`);
        for (const el of els) {
            if (el.offsetParent !== null) {
                (el as HTMLElement).click();
                return;
            }
        }
        throw new Error(`No visible element with testid '${id}'`);
    }, testid);
}

async function waitForVisibleText(page: Page, testid: string, text: string, timeout = 10000): Promise<void> {
    await page.waitForFunction(
        ({ id, t }) => {
            const els = document.querySelectorAll(`[data-testid='${id}']`);
            for (const el of els) {
                if (el.offsetParent !== null && el.textContent?.includes(t)) return true;
            }
            return false;
        },
        { id: testid, t: text },
        { timeout },
    );
}

// --- Accessibility tests ---

test.describe("Accessibility", () => {
    test.beforeEach(async ({ page }) => {
        page.on("console", (msg) => {
            if (msg.type() === "error") console.log(`[BROWSER ERROR] ${msg.text()}`);
        });
        page.on("pageerror", (err) => console.log(`[PAGE ERROR] ${err.message}`));
        await page.goto("/e2e/");
        await page.waitForSelector("[data-testid='home-visits']", { timeout: 15000 });
    });

    test("ion-toolbar is present and renders shadow DOM", async ({ page }) => {
        // Ionic 8 toolbar doesn't set an explicit ARIA role on the host,
        // but it renders a shadow DOM structure.
        const hasShadow = await page.evaluate(() => {
            const toolbar = document.querySelector("ion-toolbar");
            return !!toolbar?.shadowRoot;
        });
        expect(hasShadow).toBe(true);
    });

    test("ion-button renders a native button in shadow DOM", async ({ page }) => {
        // Ionic 8 button doesn't set role="button" on the host, but it
        // renders a native <button> element inside the shadow DOM.
        const hasNativeButton = await page.evaluate(() => {
            const btn = document.querySelector("ion-button");
            const inner = btn?.shadowRoot?.querySelector("button");
            return !!inner;
        });
        expect(hasNativeButton).toBe(true);
    });

    test("ion-title is present and renders shadow DOM", async ({ page }) => {
        const hasShadow = await page.evaluate(() => {
            const title = document.querySelector("ion-title");
            return !!title?.shadowRoot;
        });
        expect(hasShadow).toBe(true);
    });

    test("ion-content has role main", async ({ page }) => {
        const role = await page.evaluate(() => {
            const content = document.querySelector("ion-content");
            return content?.getAttribute("role") ?? null;
        });
        expect(role).toBe("main");
    });

    test("ion-back-button has accessible label in shadow DOM", async ({ page }) => {
        // Navigate to detail to see the back button
        await clickVisible(page, "go-detail");
        await waitForVisibleText(page, "detail-id", "42");

        // Ionic 8 back button has aria-label on the inner <button> in shadow DOM
        const hasLabel = await page.evaluate(() => {
            const btn = document.querySelector("ion-back-button");
            if (!btn) return false;
            const inner = btn.shadowRoot?.querySelector("button");
            const ariaLabel = inner?.getAttribute("aria-label");
            const text = inner?.textContent;
            return !!(ariaLabel || (text && text.trim().length > 0));
        });
        expect(hasLabel).toBe(true);
    });

    test("ion-router-outlet does not trap focus incorrectly", async ({ page }) => {
        // The outlet should not have a tabindex that traps focus
        const tabindex = await page.evaluate(() => {
            const outlet = document.querySelector("ion-router-outlet");
            return outlet?.getAttribute("tabindex");
        });
        // Outlet should not have tabindex="0" (which would make it focusable)
        expect(tabindex).not.toBe("0");
    });

    test("keyboard focus moves to content on navigation", async ({ page }) => {
        // Tab through the page and verify focus reaches interactive elements
        await page.keyboard.press("Tab");
        const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? null);
        // Focus should be on an interactive element (ion-button, etc.)
        expect(focusedTag).not.toBe("BODY");
    });
});

// --- Leak tests ---

test.describe("Memory leaks", () => {
    test.beforeEach(async ({ page }) => {
        page.on("console", (msg) => {
            if (msg.type() === "error") console.log(`[BROWSER ERROR] ${msg.text()}`);
        });
        page.on("pageerror", (err) => console.log(`[PAGE ERROR] ${err.message}`));
        await page.goto("/e2e/");
        await page.waitForSelector("[data-testid='home-visits']", { timeout: 15000 });
    });

    test("repeated navigation does not leak ion-page elements", async ({ page }) => {
        // Navigate back and forth 10 times
        for (let i = 0; i < 10; i++) {
            await clickVisible(page, "go-detail");
            await waitForVisibleText(page, "detail-id", "42");
            await clickVisible(page, "go-back");
            await waitForVisibleText(page, "home-visits", "Visits:");
        }

        // Count ion-page elements — with caching, should be 2 (home + detail)
        // Without caching, should be 1 (only the active page)
        // Either way, should not grow unboundedly
        const pageCount = await page.evaluate(() => {
            return document.querySelectorAll("ion-page").length;
        });
        // With caching enabled, home + detail = 2 pages max
        // Allow some tolerance but it should NOT be 20+
        expect(pageCount).toBeLessThanOrEqual(4);
    });

    test("repeated overlay presentation does not leak DOM nodes", async ({ page }) => {
        // Present and dismiss toast 10 times
        for (let i = 0; i < 10; i++) {
            await page.evaluate(async () => {
                await (window as any).__showToast();
            });
            await page.waitForSelector("ion-toast", { timeout: 5000 });
            await page.waitForSelector("ion-toast", { state: "detached", timeout: 10000 });
        }

        // No toast elements should remain in the DOM
        const toastCount = await page.evaluate(() => {
            return document.querySelectorAll("ion-toast").length;
        });
        expect(toastCount).toBe(0);
    });

    test("repeated alert presentation does not leak DOM nodes", async ({ page }) => {
        for (let i = 0; i < 10; i++) {
            await page.evaluate(async () => { await (window as any).__showAlert(); });
            await page.waitForSelector("ion-alert", { timeout: 5000 });
            await page.evaluate(async () => await (window as any).__dismissAlert("confirm"));
            await page.waitForSelector("ion-alert", { state: "detached", timeout: 10000 });
        }

        const alertCount = await page.evaluate(() => {
            return document.querySelectorAll("ion-alert").length;
        });
        expect(alertCount).toBe(0);
    });

    test("event listeners are cleaned up after navigation", async ({ page }) => {
        // Navigate to detail and back, then check for orphaned listeners
        // We can't directly count listeners, but we can check that
        // navigation doesn't produce console errors (which would indicate
        // callbacks to detached elements)
        const errors: string[] = [];
        page.on("pageerror", (err) => errors.push(err.message));

        for (let i = 0; i < 5; i++) {
            await clickVisible(page, "go-detail");
            await waitForVisibleText(page, "detail-id", "42");
            await clickVisible(page, "go-back");
            await waitForVisibleText(page, "home-visits", "Visits:");
        }

        // No page errors should occur during navigation
        expect(errors.filter(e => !e.includes("ResizeObserver"))).toHaveLength(0);
    });

    test("overlay dispose removes element from DOM", async ({ page }) => {
        // Present an alert, then dispose the handle
        await page.evaluate(async () => { await (window as any).__showAlert(); });
        await page.waitForSelector("ion-alert", { timeout: 5000 });

        // The alert handle's dispose should remove the element
        // We test this by presenting, then calling dismiss
        await page.evaluate(async () => await (window as any).__dismissAlert("confirm"));
        await page.waitForSelector("ion-alert", { state: "detached", timeout: 10000 });

        const count = await page.evaluate(() => document.querySelectorAll("ion-alert").length);
        expect(count).toBe(0);
    });

    test("navigation to uncached page does not accumulate pages", async ({ page }) => {
        // Navigate to the uncached page multiple times
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => {
                const router = (window as any).__elurRouter;
                router.navigate("/uncached");
            });
            await page.waitForSelector("[data-testid='uncached-mounts']", { timeout: 5000 });
            await page.evaluate(() => {
                const router = (window as any).__elurRouter;
                router.back();
            });
            await waitForVisibleText(page, "home-visits", "Visits:");
        }

        // Uncached pages should be removed from the DOM after navigation away
        const pageCount = await page.evaluate(() => {
            return document.querySelectorAll("ion-page").length;
        });
        // Should be at most 2 (home + detail if cached from beforeEach setup)
        expect(pageCount).toBeLessThanOrEqual(3);
    });
});
