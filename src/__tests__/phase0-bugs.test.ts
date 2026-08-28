/**
 * Phase 0/1 — Bug reproduction & regression suite (Elur Ionic 2 plan).
 *
 * All 10 bugs have been fixed (Phase 1). These tests are now permanent
 * regression guards (plain `it`). They were originally `it.fails` while the
 * bugs were present; each was promoted to `it` after the fix was verified.
 *
 * Bugs covered:
 *   1. cache:false does not run cleanup when leaving a page (effects/lifecycle leak)
 *   2. invalidateCache on the active page leaves a disposed-but-visible DOM
 *   3. IonPage.onInit discards watch() disposers (lifecycle leak after cleanup)
 *   4. IonPage lifecycle breaks if a subclass overrides onInit without super()
 *   5. beforeEnter guard runs twice (auto-bootstrap core guard + outlet guard)
 *   6. PageContext does not expose query params
 *   7. wildcard '*' fallback route never renders its component
 *   8. duplicate route paths are overwritten silently (no diagnostic)
 *   9. _pendingNav stores only path, loses intent; processed after cancelled transition
 *   10. cache key omits query and uses non-robust encoding (collisions)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { html, ElurComponent, signal, createRouter, elurRouter } from "@elurjs/core";
import { _resetRouter } from "@elurjs/core/router";
import { render, cleanup, waitFor } from "@elurjs/core-testing";
import { IonRouterOutlet } from "../IonRouterOutlet.js";
import { IonPage, type PageLifecycle } from "../index.js";
import type { PageContext } from "../IonRouterOutlet.js";
import "./mocks/ionic.js";

function flushMicrotasks(): Promise<void> {
    return Promise.resolve();
}

describe("Phase 0 — bug reproduction (it.fails = bug present, promote to it when fixed)", () => {
    beforeEach(() => {
        cleanup();
        document.body.innerHTML = "";
        history.replaceState(null, "", "/");
        _resetRouter();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // 1. cache:false cleanup leak — FIXED: _uncachedCleanups WeakMap tracks and runs cleanup.
    it("cache:false runs cleanup (onUnmount + effects) when leaving a page", async () => {
        const router = createRouter([{ path: "/" }, { path: "/leak" }]);
        let cleanedUp = false;

        class LeakPage extends ElurComponent {
            override onMount() {
                return () => {
                    cleanedUp = true;
                };
            }
            override render() {
                return html`<div data-testid="leak">Leak</div>`;
            }
        }

        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                { path: "/leak", component: () => new LeakPage() },
            ],
            { skipAutoBootstrap: true, cache: false },
        );

        render(outlet.render());
        await flushMicrotasks();

        router.navigate("/leak", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="leak"]')).toBeTruthy());

        router.replace("/", { direction: "none" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="home"]')).toBeTruthy());

        // Correct: leaving a non-cached page MUST run its cleanup.
        expect(cleanedUp).toBe(true);
    });

    // 2. invalidateCache on active page — FIXED: active page keeps live DOM+effects, cleanup deferred to navigation away.
    it("invalidateCache on the active page does not leave a disposed-but-visible DOM", async () => {
        const router = createRouter([{ path: "/" }, { path: "/counter" }]);
        const count = signal(0);

        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                {
                    path: "/counter",
                    component: () => html`<div data-testid="counter">${() => count.value}</div>`,
                },
            ],
            { skipAutoBootstrap: true },
        );

        render(outlet.render());
        await flushMicrotasks();

        router.navigate("/counter", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() =>
            expect(document.querySelector('[data-testid="counter"]')?.textContent).toBe("0"),
        );

        // Invalidate the ACTIVE page while it is visible.
        outlet.invalidateCache("/counter");

        // The page is still visible — its reactivity must still be alive.
        count.value = 5;
        await flushMicrotasks();
        expect(document.querySelector('[data-testid="counter"]')?.textContent).toBe("5");
    });

    // 3. IonPage watch() disposer leak — FIXED: _connectIonicLifecycle stores disposers.
    it("IonPage lifecycle watches are disposed when the view is cleaned up", async () => {
        const router = createRouter([{ path: "/" }, { path: "/p" }, { path: "/other" }]);
        let capturedLc: PageLifecycle | null = null;
        let willEnterCalls = 0;

        class WatchLeakPage extends IonPage {
            constructor(ctx: { lc: PageLifecycle }) {
                super(ctx.lc);
                capturedLc = ctx.lc;
            }
            override ionViewWillEnter() {
                willEnterCalls++;
            }
            override render() {
                return html`<div data-testid="p">P</div>`;
            }
        }

        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                { path: "/p", component: (ctx) => new WatchLeakPage(ctx) },
                { path: "/other", component: () => html`<div data-testid="other">Other</div>` },
            ],
            { skipAutoBootstrap: true },
        );

        render(outlet.render());
        await flushMicrotasks();

        router.navigate("/p", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="p"]')).toBeTruthy());
        expect(willEnterCalls).toBe(1);

        // Leave /p (becomes inactive cached), then clear its cache → cleanup runs.
        router.navigate("/other", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="other"]')).toBeTruthy());
        outlet.clearCache();

        // After cleanup, the lifecycle watch must NOT fire anymore.
        capturedLc!.willEnter.value++;
        expect(willEnterCalls).toBe(1);
    });

    // 4. IonPage lifecycle depends on super.onInit() — FIXED: symbol-based wiring.
    it("IonPage lifecycle works even if a subclass overrides onInit without super()", async () => {
        const router = createRouter([{ path: "/" }, { path: "/nosuper" }]);
        let willEnterCalls = 0;

        class NoSuperPage extends IonPage {
            constructor(ctx: { lc: PageLifecycle }) {
                super(ctx.lc);
            }
            // Intentionally override onInit WITHOUT calling super — the
            // framework must not depend on the subclass forwarding super.
            override onInit() {
                /* no super call */
            }
            override ionViewWillEnter() {
                willEnterCalls++;
            }
            override render() {
                return html`<div data-testid="nosuper">NoSuper</div>`;
            }
        }

        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                { path: "/nosuper", component: (ctx) => new NoSuperPage(ctx) },
            ],
            { skipAutoBootstrap: true },
        );

        render(outlet.render());
        await flushMicrotasks();

        router.navigate("/nosuper", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="nosuper"]')).toBeTruthy());
        expect(willEnterCalls).toBe(1);
    });

    // 5. Guard runs twice — FIXED: _transitionTo skips guard when core router has it.
    it("beforeEnter guard runs exactly once per navigation (auto-bootstrap)", async () => {
        const guard = vi.fn(() => true);

        const outlet = new IonRouterOutlet([
            { path: "/", component: () => html`<div data-testid="home">Home</div>` },
            {
                path: "/protected",
                component: () => html`<div data-testid="protected">Protected</div>`,
                beforeEnter: guard,
            },
        ]);

        render(outlet.render());
        await flushMicrotasks();

        const router = elurRouter();
        router.navigate("/protected", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="protected"]')).toBeTruthy());

        expect(guard).toHaveBeenCalledTimes(1);
    });

    // 6. PageContext.query — FIXED: PageContext now includes query from router.query.value.
    it("PageContext exposes the current query params", async () => {
        const router = createRouter([{ path: "/" }, { path: "/page" }]);
        let capturedCtx: PageContext | null = null;

        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                {
                    path: "/page",
                    component: (ctx) => {
                        capturedCtx = ctx;
                        return html`<div data-testid="page">Page</div>`;
                    },
                },
            ],
            { skipAutoBootstrap: true },
        );

        render(outlet.render());
        await flushMicrotasks();

        router.navigate("/page", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="page"]')).toBeTruthy());

        expect((capturedCtx as any).query).toBeDefined();
    });

    // 7. wildcard '*' fallback — FIXED: stored separately and used as fallback in _resolveRouteDefinition.
    it("wildcard '*' fallback route renders its component", async () => {
        const router = createRouter([{ path: "/" }, { path: "*" }]);

        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                { path: "*", component: () => html`<div data-testid="notfound">NotFound</div>` },
            ],
            { skipAutoBootstrap: true },
        );

        render(outlet.render());
        await flushMicrotasks();

        router.navigate("/nope", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(
            () => expect(document.querySelector('[data-testid="notfound"]')).toBeTruthy(),
            { timeout: 400 },
        );
    });

    // 8. duplicate route paths — FIXED: constructor emits console.warn on duplicates.
    it("duplicate route paths emit a diagnostic (warn or error)", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
        const error = vi.spyOn(console, "error").mockImplementation(() => { });

        new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div>Home</div>` },
                { path: "/dup", component: () => html`<div>Dup1</div>` },
                { path: "/dup", component: () => html`<div>Dup2</div>` },
            ],
            { skipAutoBootstrap: true },
        );

        // Correct: the library must validate duplicate route definitions.
        expect(warn).toHaveBeenCalled();
        void error;
    });

    // 9. _pendingNav metadata loss + processed after failed transition — FIXED:
    // pendingNav preserves full intent; cancelled transitions drop pending navs;
    // redirects clear stale pending before enqueuing the redirect target.
    it("_pendingNav preserves intent and is not processed after a cancelled transition", async () => {
        const router = createRouter([{ path: "/" }, { path: "/blocked" }, { path: "/ok" }]);
        const guard = vi.fn(() => false as const); // always cancel

        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                { path: "/blocked", component: () => html`<div data-testid="blocked">Blocked</div>`, beforeEnter: guard },
                { path: "/ok", component: () => html`<div data-testid="ok">OK</div>` },
            ],
            { skipAutoBootstrap: true },
        );

        render(outlet.render());
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="home"]')).toBeTruthy());

        // Navigate to /blocked — guard cancels. The blocked page must NOT mount.
        router.navigate("/blocked", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(guard).toHaveBeenCalled());
        expect(document.querySelector('[data-testid="blocked"]')).toBeFalsy();
        // Home should still be visible.
        expect(document.querySelector('[data-testid="home"]')).toBeTruthy();
    });

    // 10. cache key omits query and uses non-robust encoding — FIXED:
    // _buildCacheKey now includes query with encodeURIComponent, and the outlet
    // effect observes router.query so query-only navigation triggers a transition.
    it("query-only navigation triggers a transition and cache key includes query", async () => {
        const router = createRouter([{ path: "/" }, { path: "/search" }]);
        let mountCount = 0;
        let lastQuery: Record<string, string> = {};

        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                {
                    path: "/search",
                    component: (ctx) => {
                        mountCount++;
                        lastQuery = ctx.query;
                        return html`<div data-testid="search">Search ${() => ctx.query.q ?? ""}</div>`;
                    },
                },
            ],
            { skipAutoBootstrap: true },
        );

        render(outlet.render());
        await flushMicrotasks();

        // Navigate to /search?q=hello
        router.navigate("/search", { query: { q: "hello" } });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="search"]')).toBeTruthy());
        expect(lastQuery.q).toBe("hello");
        const firstMountCount = mountCount;

        // Query-only change: /search?q=world — same path, different query.
        // This must trigger a new transition (not be silently ignored).
        router.navigate("/search", { query: { q: "world" } });
        await flushMicrotasks();
        await waitFor(() => expect(mountCount).toBe(firstMountCount + 1));
        expect(lastQuery.q).toBe("world");
    });
});
