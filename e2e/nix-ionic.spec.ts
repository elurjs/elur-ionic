import { test, expect, type Page } from "@playwright/test";

/**
 * Helper: click a testid element that is currently visible (offsetParent !== null).
 * Needed because cached pages keep multiple elements with the same testid in the DOM.
 */
async function clickVisible(page: import("@playwright/test").Page, testid: string): Promise<void> {
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

/**
 * Wait for a visible element with the given testid to contain text.
 * Checks offsetParent to only consider visible (non-cached) pages.
 */
async function waitForVisibleText(page: import("@playwright/test").Page, testid: string, text: string, timeout = 10000): Promise<void> {
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

/**
 * E2E tests with REAL @ionic/core — no mocks.
 *
 * These tests exercise the actual ion-router-outlet.commit(), lifecycle
 * events, transitions, and overlay controllers.
 */

test.beforeEach(async ({ page }) => {
    // Capture console errors for debugging
    page.on("console", (msg) => {
        if (msg.type() === "error") console.log(`[BROWSER ERROR] ${msg.text()}`);
    });
    page.on("pageerror", (err) => console.log(`[PAGE ERROR] ${err.message}`));
    await page.goto("/e2e/");
    // Wait for the app to mount
    await page.waitForSelector("[data-testid='home-visits']", { timeout: 15000 });
});

test.describe("Navigation", () => {
    test("forward navigation shows detail page", async ({ page }) => {
        await clickVisible(page, "go-detail");
        await waitForVisibleText(page, "detail-id", "42");
    });

    test("back navigation returns to home", async ({ page }) => {
        await clickVisible(page, "go-detail");
        await waitForVisibleText(page, "detail-id", "42");
        await clickVisible(page, "go-back");
        await waitForVisibleText(page, "home-visits", "Visits");
    });

    test("deep navigation preserves stack", async ({ page }) => {
        await clickVisible(page, "go-detail");
        await waitForVisibleText(page, "detail-id", "42");

        await clickVisible(page, "go-deeper");
        await waitForVisibleText(page, "detail-id", "99");

        await clickVisible(page, "go-back");
        await waitForVisibleText(page, "detail-id", "42");
    });
});

test.describe("Page lifecycle", () => {
    test("ionViewWillEnter fires on every visit (cached)", async ({ page }) => {
        // Initial visit — count should be 1
        await waitForVisibleText(page, "home-visits", "1");

        // Navigate away
        await clickVisible(page, "go-detail");
        await waitForVisibleText(page, "detail-id", "42");

        // Navigate back via router.back() — the E2E app sets initial hash
        // to "#/" so back() from "#/detail/42" to "#/" fires hashchange.
        await page.evaluate(() => (window as any).__elurRouter.back());

        // ionViewWillEnter should fire again from cache. The exact count
        // depends on whether Ionic's commit() also dispatches the event
        // (which varies with prefers-reduced-motion), so we check for > 1.
        await page.waitForFunction(
            () => {
                const els = document.querySelectorAll("[data-testid='home-visits']");
                for (const el of els) {
                    if (el.offsetParent !== null) {
                        const m = el.textContent?.match(/Visits:\s*(\d+)/);
                        if (m && parseInt(m[1], 10) > 1) return true;
                    }
                }
                return false;
            },
            { timeout: 10000 },
        );
    });

    test("cached page preserves state on return", async ({ page }) => {
        await clickVisible(page, "go-detail");
        await waitForVisibleText(page, "detail-enters", "1");

        // Go deeper and back — should be same cached instance
        await clickVisible(page, "go-deeper");
        await waitForVisibleText(page, "detail-id", "99");

        await clickVisible(page, "go-back");
        await waitForVisibleText(page, "detail-id", "42");
        // Should still be 1 — same cached instance
        await waitForVisibleText(page, "detail-enters", "1");
    });

    test("uncached page remounts on every visit", async ({ page }) => {
        // Navigate to uncached page via URL
        await page.evaluate(() => {
            (window as any).__elurRouter.navigate("/uncached");
        });
        await waitForVisibleText(page, "uncached-mounts", "1");

        // Go back and navigate again — should remount
        await page.evaluate(() => {
            (window as any).__elurRouter.navigate("/");
        });
        await waitForVisibleText(page, "home-visits", "Visits");

        await page.evaluate(() => {
            (window as any).__elurRouter.navigate("/uncached");
        });
        await waitForVisibleText(page, "uncached-mounts", "1");
    });
});

test.describe("Overlays", () => {
    test("toast presents and auto-dismisses", async ({ page }) => {
        await clickVisible(page, "go-toast");
        // Toast should appear
        await page.waitForSelector("ion-toast", { timeout: 5000 });
        const toast = page.locator("ion-toast");
        await expect(toast).toBeVisible();
        // Wait for auto-dismiss (duration: 1500ms)
        await page.waitForSelector("ion-toast", { state: "detached", timeout: 5000 });
    });

    test("modal presents with Elur content and dismisses", async ({ page }) => {
        await clickVisible(page, "go-modal");
        // Modal should appear with Elur content
        await page.waitForSelector("[data-testid='modal-content']", { timeout: 5000 });
        await expect(page.locator("[data-testid='modal-content']")).toHaveText("Modal content from Elur");

        // Close modal
        await page.click("[data-testid='modal-close']");
        await page.waitForSelector("[data-testid='modal-content']", { state: "detached", timeout: 5000 });
    });

    test("alert presents and dismisses via dismiss()", async ({ page }) => {
        // Present the alert and await the full present() promise
        await page.evaluate(async () => { await (window as any).__showAlert(); });
        await page.waitForSelector("ion-alert", { timeout: 5000 });
        await expect(page.locator("ion-alert")).toBeVisible();

        // Dismiss the alert via the overlay handle
        const dismissed = await page.evaluate(async () => await (window as any).__dismissAlert("confirm"));
        expect(dismissed).toBe(true);
        await page.waitForSelector("ion-alert", { state: "detached", timeout: 10000 });
    });

    test("alert cancel role dismisses", async ({ page }) => {
        await page.evaluate(async () => { await (window as any).__showAlert(); });
        await page.waitForSelector("ion-alert", { timeout: 5000 });

        const dismissed = await page.evaluate(async () => await (window as any).__dismissAlert("cancel"));
        expect(dismissed).toBe(true);
        await page.waitForSelector("ion-alert", { state: "detached", timeout: 10000 });
    });

    test("loading presents and auto-dismisses", async ({ page }) => {
        await page.evaluate(async () => { await (window as any).__showLoading(); });
        await page.waitForSelector("ion-loading", { timeout: 5000 });
        await expect(page.locator("ion-loading")).toBeVisible();
        // Wait for auto-dismiss (duration: 1500ms)
        await page.waitForSelector("ion-loading", { state: "detached", timeout: 10000 });
    });

    test("action sheet presents and dismisses via dismiss()", async ({ page }) => {
        await page.evaluate(async () => { await (window as any).__showActionSheet(); });
        await page.waitForSelector("ion-action-sheet", { timeout: 5000 });
        await expect(page.locator("ion-action-sheet")).toBeVisible();

        const dismissed = await page.evaluate(async () => await (window as any).__dismissActionSheet("cancel"));
        expect(dismissed).toBe(true);
        await page.waitForSelector("ion-action-sheet", { state: "detached", timeout: 10000 });
    });

    test("action sheet has header text", async ({ page }) => {
        await page.evaluate(async () => { await (window as any).__showActionSheet(); });
        await page.waitForSelector("ion-action-sheet", { timeout: 5000 });

        // Verify the action sheet header via shadow DOM piercing
        const header = page.locator("ion-action-sheet").locator(".action-sheet-title");
        await expect(header).toHaveText("E2E Action Sheet");

        // Cleanup
        await page.evaluate(async () => await (window as any).__dismissActionSheet("cancel"));
        await page.waitForSelector("ion-action-sheet", { state: "detached", timeout: 10000 });
    });

    test("picker presents and dismisses via dismiss()", async ({ page }) => {
        await page.evaluate(async () => { await (window as any).__showPicker(); });
        await page.waitForSelector("ion-picker", { timeout: 5000 });
        await expect(page.locator("ion-picker")).toBeVisible();

        const dismissed = await page.evaluate(async () => await (window as any).__dismissPicker("confirm"));
        expect(dismissed).toBe(true);
        await page.waitForSelector("ion-picker", { state: "detached", timeout: 10000 });
    });

    test("picker has column options", async ({ page }) => {
        await page.evaluate(async () => { await (window as any).__showPicker(); });
        await page.waitForSelector("ion-picker", { timeout: 5000 });

        // In Ionic 8, picker renders columns internally via the `columns` property.
        // Verify the columns property is set correctly.
        const columns = await page.evaluate(() => {
            const picker = document.querySelector("ion-picker") as any;
            return picker?.columns ?? null;
        });
        expect(columns).not.toBeNull();
        expect(columns.length).toBeGreaterThan(0);
        expect(columns[0].name).toBe("color");
        expect(columns[0].options.length).toBe(3);

        // Cleanup
        await page.evaluate(async () => await (window as any).__dismissPicker("confirm"));
        await page.waitForSelector("ion-picker", { state: "detached", timeout: 10000 });
    });
});

test.describe("Back button", () => {
    test("back button navigates to previous page", async ({ page }) => {
        await clickVisible(page, "go-detail");
        await waitForVisibleText(page, "detail-id", "42");

        // Click the visible ion-back-button
        await page.evaluate(() => {
            const btns = document.querySelectorAll("ion-back-button");
            for (const btn of btns) {
                if (btn.offsetParent !== null) {
                    (btn as HTMLElement).click();
                    return;
                }
            }
        });
        await waitForVisibleText(page, "home-visits", "Visits");
    });
});

test.describe("Real Ionic Core contract", () => {
    test("ion-router-outlet is defined as a custom element", async ({ page }) => {
        const isDefined = await page.evaluate(() => {
            return !!window.customElements.get("ion-router-outlet");
        });
        expect(isDefined).toBe(true);
    });

    test("ion-page elements are created in the outlet", async ({ page }) => {
        const pageCount = await page.evaluate(() => {
            const outlet = document.querySelector("ion-router-outlet");
            if (!outlet) return 0;
            return outlet.querySelectorAll("ion-page").length;
        });
        expect(pageCount).toBeGreaterThanOrEqual(1);
    });

    test("no unpkg.com URLs in network requests", async ({ page }) => {
        const unpkgRequests: string[] = [];
        page.on("request", (req) => {
            if (req.url().includes("unpkg.com")) {
                unpkgRequests.push(req.url());
            }
        });
        // Reload to capture all requests
        await page.reload();
        await page.waitForSelector("[data-testid='home-visits']", { timeout: 15000 });
        expect(unpkgRequests).toHaveLength(0);
    });
});
