import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { html } from "@elurjs/core";
import { createRouter } from "@elurjs/core";
import { _resetRouter } from "@elurjs/core/router";
import { render, cleanup, waitFor } from "@elurjs/core-testing";
import { IonRouterOutlet, type CachePolicy } from "../IonRouterOutlet.js";
import "./mocks/ionic.js";

function flushMicrotasks() {
    return Promise.resolve();
}

function flushAnimationFrames() {
    return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });
}

describe("cache policies", () => {
    beforeEach(() => {
        cleanup();
        document.body.innerHTML = "";
        history.replaceState(null, "", "/");
        _resetRouter();
    });

    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
        history.replaceState(null, "", "/");
    });

    describe("max eviction (LRU)", () => {
        it("evicts least-recently-used entry when max is exceeded", async () => {
            const router = createRouter([
                { path: "/" },
                { path: "/a" },
                { path: "/b" },
                { path: "/c" },
            ]);

            const outlet = new IonRouterOutlet(
                [
                    { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                    { path: "/a", component: () => html`<div data-testid="page-a">A</div>` },
                    { path: "/b", component: () => html`<div data-testid="page-b">B</div>` },
                    { path: "/c", component: () => html`<div data-testid="page-c">C</div>` },
                ],
                { skipAutoBootstrap: true, cachePolicy: { max: 2, strategy: "lru" } },
            );

            render(outlet.render());
            await flushMicrotasks();
            await flushAnimationFrames();
            await waitFor(() => expect(document.querySelector('[data-testid="home"]')).toBeTruthy());

            // Navigate to /a — cache: {/, /a}
            router.navigate("/a", { direction: "forward" });
            await flushMicrotasks();
            await waitFor(() => expect(document.querySelector('[data-testid="page-a"]')).toBeTruthy());

            // Navigate to /b — cache: {/, /a, /b} → evict LRU (/)
            router.navigate("/b", { direction: "forward" });
            await flushMicrotasks();
            await waitFor(() => expect(document.querySelector('[data-testid="page-b"]')).toBeTruthy());

            // Navigate back to / — should create fresh (was evicted)
            router.navigate("/", { direction: "back" });
            await flushMicrotasks();
            await waitFor(() => expect(document.querySelector('[data-testid="home"]')).toBeTruthy());
        });
    });

    describe("TTL eviction", () => {
        it("evicts entries after TTL expires", async () => {
            const router = createRouter([{ path: "/" }, { path: "/page1" }]);

            let mountCount = 0;
            const outlet = new IonRouterOutlet(
                [
                    { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                    {
                        path: "/page1",
                        component: () => {
                            mountCount++;
                            return html`<div data-testid="page1">P1</div>`;
                        },
                    },
                ],
                { skipAutoBootstrap: true, cachePolicy: { ttl: 50 } },
            );

            render(outlet.render());
            await flushMicrotasks();
            await flushAnimationFrames();
            await waitFor(() => expect(document.querySelector('[data-testid="home"]')).toBeTruthy());

            // Visit /page1 — should mount
            router.navigate("/page1", { direction: "forward" });
            await flushMicrotasks();
            await waitFor(() => expect(document.querySelector('[data-testid="page1"]')).toBeTruthy());
            expect(mountCount).toBe(1);

            // Go back to /
            router.navigate("/", { direction: "back" });
            await flushMicrotasks();
            await waitFor(() => expect(document.querySelector('[data-testid="home"]')).toBeTruthy());

            // Wait for TTL to expire (real timers, 50ms)
            await new Promise((r) => setTimeout(r, 80));

            // Visit /page1 again — TTL expired, should mount fresh
            router.navigate("/page1", { direction: "forward" });
            await flushMicrotasks();
            await waitFor(() => expect(document.querySelector('[data-testid="page1"]')).toBeTruthy());
            expect(mountCount).toBe(2);
        });
    });

    describe("route-level cache override", () => {
        it("cache:false on a route disables caching for that route only", async () => {
            const router = createRouter([
                { path: "/" },
                { path: "/nocache" },
                { path: "/cached" },
            ]);

            let nocacheMountCount = 0;
            let cachedMountCount = 0;

            const outlet = new IonRouterOutlet(
                [
                    { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                    {
                        path: "/nocache",
                        cache: false,
                        component: () => {
                            nocacheMountCount++;
                            return html`<div data-testid="nocache">NoCache</div>`;
                        },
                    },
                    {
                        path: "/cached",
                        component: () => {
                            cachedMountCount++;
                            return html`<div data-testid="cached">Cached</div>`;
                        },
                    },
                ],
                { skipAutoBootstrap: true },
            );

            render(outlet.render());
            await flushMicrotasks();
            await flushAnimationFrames();

            // Visit /nocache twice — should mount twice (no cache)
            router.navigate("/nocache", { direction: "forward" });
            await flushMicrotasks();
            await waitFor(() => expect(document.querySelector('[data-testid="nocache"]')).toBeTruthy());
            expect(nocacheMountCount).toBe(1);

            router.navigate("/", { direction: "back" });
            await flushMicrotasks();
            await waitFor(() => expect(document.querySelector('[data-testid="home"]')).toBeTruthy());

            router.navigate("/nocache", { direction: "forward" });
            await flushMicrotasks();
            await waitFor(() => expect(document.querySelector('[data-testid="nocache"]')).toBeTruthy());
            expect(nocacheMountCount).toBe(2); // mounted again — not cached

            // Visit /cached twice — should mount once (cached)
            router.navigate("/cached", { direction: "forward" });
            await flushMicrotasks();
            await waitFor(() => expect(document.querySelector('[data-testid="cached"]')).toBeTruthy());
            expect(cachedMountCount).toBe(1);

            router.navigate("/", { direction: "back" });
            await flushMicrotasks();
            await waitFor(() => expect(document.querySelector('[data-testid="home"]')).toBeTruthy());

            router.navigate("/cached", { direction: "forward" });
            await flushMicrotasks();
            await waitFor(() => expect(document.querySelector('[data-testid="cached"]')).toBeTruthy());
            expect(cachedMountCount).toBe(1); // still 1 — cached
        });
    });

    describe("CachePolicy type", () => {
        it("accepts max, ttl, and strategy", () => {
            const policy: CachePolicy = { max: 5, ttl: 60000, strategy: "lru" };
            expect(policy.max).toBe(5);
            expect(policy.ttl).toBe(60000);
            expect(policy.strategy).toBe("lru");
        });

        it("accepts partial policy (only max)", () => {
            const policy: CachePolicy = { max: 3 };
            expect(policy.max).toBe(3);
            expect(policy.ttl).toBeUndefined();
        });

        it("accepts fifo strategy", () => {
            const policy: CachePolicy = { max: 3, strategy: "fifo" };
            expect(policy.strategy).toBe("fifo");
        });
    });
});
