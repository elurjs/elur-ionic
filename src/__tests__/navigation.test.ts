import { describe, it, expect, vi } from "vitest";
import { NavigationManager, StackManager } from "../navigation.js";
import type { NavigationIntent } from "@elurjs/core";

const forwardIntent: NavigationIntent = {
    direction: "forward",
    action: "push",
};

const backIntent: NavigationIntent = {
    direction: "back",
    action: "pop",
};

const replaceIntent: NavigationIntent = {
    direction: "root",
    action: "replace",
};

describe("StackManager", () => {
    it("creates a default empty stack", () => {
        const sm = new StackManager(undefined);
        expect(sm.stackDepth()).toBe(0);
        expect(sm.stackTop()).toBeNull();
    });

    it("creates per-tab stacks", () => {
        const sm = new StackManager(["/home", "/search"]);
        expect(sm.tabPrefixes).toContain("/home");
        expect(sm.tabPrefixes).toContain("/search");
    });

    it("keyForPath matches tab prefixes", () => {
        const sm = new StackManager(["/home", "/search"]);
        expect(sm.keyForPath("/home")).toBe("/home");
        expect(sm.keyForPath("/home/detail")).toBe("/home");
        expect(sm.keyForPath("/search")).toBe("/search");
        expect(sm.keyForPath("/other")).toBe("");
    });

    it("apply pushes to stack on forward navigation", () => {
        const sm = new StackManager(undefined);
        sm.apply("/page1", { ...forwardIntent });
        sm.apply("/page2", { ...forwardIntent });
        expect(sm.stackDepth()).toBe(2);
        expect(sm.stackTop()).toBe("/page2");
    });

    it("apply pops on back navigation", () => {
        const sm = new StackManager(undefined);
        sm.apply("/page1", { ...forwardIntent });
        sm.apply("/page2", { ...forwardIntent });
        const dir = sm.apply("/page1", { ...backIntent });
        expect(dir).toBe("back");
        expect(sm.stackDepth()).toBe(1);
        expect(sm.stackTop()).toBe("/page1");
    });

    it("apply replaces on replace/root", () => {
        const sm = new StackManager(undefined);
        sm.apply("/page1", { ...forwardIntent });
        const dir = sm.apply("/page2", { ...replaceIntent });
        expect(dir).toBe("root");
        expect(sm.stackDepth()).toBe(1);
        expect(sm.stackTop()).toBe("/page2");
    });

    it("apply switches tabs and returns none", () => {
        const sm = new StackManager(["/home", "/search"]);
        sm.apply("/home", { ...forwardIntent });
        const dir = sm.apply("/search", { ...forwardIntent });
        expect(dir).toBe("none");
        expect(sm.activeTabKey).toBe("/search");
    });

    it("stackEntries returns a copy", () => {
        const sm = new StackManager(undefined);
        sm.apply("/a", { ...forwardIntent });
        const entries = sm.stackEntries();
        entries.push("/b");
        expect(sm.stackEntries()).toEqual(["/a"]);
    });

    it("resetTab clears a specific tab", () => {
        const sm = new StackManager(["/home", "/search"]);
        sm.apply("/home", { ...forwardIntent });
        sm.apply("/home/detail", { ...forwardIntent });
        sm.apply("/search", { ...forwardIntent });

        sm.resetTab("/home");
        expect(sm.stackDepth("/home")).toBe(0);
        expect(sm.stackDepth("/search")).toBe(1);
    });

    it("resetAll clears everything", () => {
        const sm = new StackManager(["/home", "/search"]);
        sm.apply("/home", { ...forwardIntent });
        sm.apply("/search", { ...forwardIntent });

        sm.resetAll();
        expect(sm.stackDepth("/home")).toBe(0);
        expect(sm.stackDepth("/search")).toBe(0);
    });
});

describe("NavigationManager", () => {
    it("creates with tabs", () => {
        const nav = new NavigationManager({ tabs: ["/home", "/search"] });
        expect(nav.tabPrefixes).toContain("/home");
        expect(nav.tabPrefixes).toContain("/search");
    });

    it("exposes stack manager", () => {
        const nav = new NavigationManager({});
        expect(nav.stacks).toBeInstanceOf(StackManager);
    });

    describe("transition state", () => {
        it("tracks isTransitioning", () => {
            const nav = new NavigationManager({});
            expect(nav.isTransitioning).toBe(false);
            nav.beginTransition();
            expect(nav.isTransitioning).toBe(true);
            nav.endTransition();
            expect(nav.isTransitioning).toBe(false);
        });

        it("tracks pendingNav", () => {
            const nav = new NavigationManager({});
            expect(nav.pendingNav).toBeNull();
            nav.setPendingNav("/test", forwardIntent);
            expect(nav.pendingNav).toEqual({ path: "/test", intent: forwardIntent });
            const consumed = nav.consumePendingNav();
            expect(consumed).toEqual({ path: "/test", intent: forwardIntent });
            expect(nav.pendingNav).toBeNull();
        });

        it("clearPendingNav removes pending", () => {
            const nav = new NavigationManager({});
            nav.setPendingNav("/test", forwardIntent);
            nav.clearPendingNav();
            expect(nav.pendingNav).toBeNull();
        });
    });

    describe("beforeNav hooks", () => {
        it("calls hooks before navigation", async () => {
            const nav = new NavigationManager({});
            const hook = vi.fn(() => { });
            nav.beforeNav(hook);
            await nav.runBeforeNav("/test", forwardIntent);
            expect(hook).toHaveBeenCalledWith("/test", forwardIntent);
        });

        it("cancels navigation when hook returns false", async () => {
            const nav = new NavigationManager({});
            nav.beforeNav(() => false);
            const allowed = await nav.runBeforeNav("/test", forwardIntent);
            expect(allowed).toBe(false);
        });

        it("allows navigation when hook returns true", async () => {
            const nav = new NavigationManager({});
            nav.beforeNav(() => true);
            const allowed = await nav.runBeforeNav("/test", forwardIntent);
            expect(allowed).toBe(true);
        });

        it("allows navigation when hook returns void", async () => {
            const nav = new NavigationManager({});
            nav.beforeNav(() => { });
            const allowed = await nav.runBeforeNav("/test", forwardIntent);
            expect(allowed).toBe(true);
        });

        it("supports async hooks", async () => {
            const nav = new NavigationManager({});
            nav.beforeNav(async () => false);
            const allowed = await nav.runBeforeNav("/test", forwardIntent);
            expect(allowed).toBe(false);
        });

        it("calls multiple hooks in order", async () => {
            const nav = new NavigationManager({});
            const order: number[] = [];
            nav.beforeNav(() => { order.push(1); });
            nav.beforeNav(() => { order.push(2); });
            nav.beforeNav(() => { order.push(3); });
            await nav.runBeforeNav("/test", forwardIntent);
            expect(order).toEqual([1, 2, 3]);
        });

        it("unsubscribe removes the hook", async () => {
            const nav = new NavigationManager({});
            const hook = vi.fn();
            const unsub = nav.beforeNav(hook);
            unsub();
            await nav.runBeforeNav("/test", forwardIntent);
            expect(hook).not.toHaveBeenCalled();
        });

        it("hook errors do not block navigation", async () => {
            const nav = new NavigationManager({});
            nav.beforeNav(() => { throw new Error("hook error"); });
            const allowed = await nav.runBeforeNav("/test", forwardIntent);
            expect(allowed).toBe(true);
        });
    });

    describe("afterNav hooks", () => {
        it("calls hooks after navigation", () => {
            const nav = new NavigationManager({});
            const hook = vi.fn();
            nav.afterNav(hook);
            nav.runAfterNav("/test", "forward");
            expect(hook).toHaveBeenCalledWith("/test", "forward");
        });

        it("unsubscribe removes the hook", () => {
            const nav = new NavigationManager({});
            const hook = vi.fn();
            const unsub = nav.afterNav(hook);
            unsub();
            nav.runAfterNav("/test", "forward");
            expect(hook).not.toHaveBeenCalled();
        });

        it("hook errors do not throw", () => {
            const nav = new NavigationManager({});
            nav.afterNav(() => { throw new Error("fail"); });
            expect(() => nav.runAfterNav("/test", "forward")).not.toThrow();
        });
    });

    describe("onTabChange hooks", () => {
        it("fires when tab changes", () => {
            const nav = new NavigationManager({ tabs: ["/home", "/search"] });
            const hook = vi.fn();
            nav.onTabChange(hook);
            nav.runTabChangeIfNeeded("/search");
            expect(hook).toHaveBeenCalledWith("/search", null);
        });

        it("does not fire when tab stays the same", () => {
            const nav = new NavigationManager({ tabs: ["/home", "/search"] });
            const hook = vi.fn();
            nav.runTabChangeIfNeeded("/home"); // first call fires
            nav.onTabChange(hook);
            nav.runTabChangeIfNeeded("/home/detail"); // same tab, no fire
            expect(hook).not.toHaveBeenCalled();
        });

        it("fires with previous tab on second change", () => {
            const nav = new NavigationManager({ tabs: ["/home", "/search"] });
            const hook = vi.fn();
            nav.runTabChangeIfNeeded("/home");
            nav.onTabChange(hook);
            nav.runTabChangeIfNeeded("/search");
            expect(hook).toHaveBeenCalledWith("/search", "/home");
        });

        it("unsubscribe removes the hook", () => {
            const nav = new NavigationManager({ tabs: ["/home", "/search"] });
            const hook = vi.fn();
            const unsub = nav.onTabChange(hook);
            unsub();
            nav.runTabChangeIfNeeded("/search");
            expect(hook).not.toHaveBeenCalled();
        });
    });

    describe("switchTab", () => {
        it("returns the target path for a different tab", () => {
            const nav = new NavigationManager({ tabs: ["/home", "/search"] });
            nav.stacks.apply("/home", { ...forwardIntent });
            const target = nav.switchTab("/search");
            expect(target).toBe("/search"); // empty stack → prefix
        });

        it("returns null for the same tab", () => {
            const nav = new NavigationManager({ tabs: ["/home", "/search"] });
            nav.stacks.apply("/home", { ...forwardIntent });
            const target = nav.switchTab("/home");
            expect(target).toBeNull();
        });

        it("returns stack top when stack is non-empty", () => {
            const nav = new NavigationManager({ tabs: ["/home", "/search"] });
            nav.stacks.apply("/home", { ...forwardIntent });
            nav.stacks.apply("/home/detail", { ...forwardIntent });
            // Switch to home tab then back to search
            nav.stacks.apply("/search", { ...forwardIntent });
            const target = nav.switchTab("/home");
            expect(target).toBe("/home/detail"); // stack top
        });
    });

    describe("cache invalidation", () => {
        it("registerInvalidationHandler + invalidateRoute", () => {
            const nav = new NavigationManager({});
            const handler = vi.fn();
            nav.registerInvalidationHandler("/user/:id", handler);
            nav.invalidateRoute("/user/:id", { id: "42" });
            expect(handler).toHaveBeenCalledWith({ id: "42" });
        });

        it("invalidateRoute without params calls handler with undefined", () => {
            const nav = new NavigationManager({});
            const handler = vi.fn();
            nav.registerInvalidationHandler("/search", handler);
            nav.invalidateRoute("/search");
            expect(handler).toHaveBeenCalledWith(undefined);
        });

        it("invalidatePattern with wildcard", () => {
            const nav = new NavigationManager({});
            const h1 = vi.fn();
            const h2 = vi.fn();
            const h3 = vi.fn();
            nav.registerInvalidationHandler("/admin/users", h1);
            nav.registerInvalidationHandler("/admin/settings", h2);
            nav.registerInvalidationHandler("/home", h3);
            nav.invalidatePattern("/admin/*");
            expect(h1).toHaveBeenCalled();
            expect(h2).toHaveBeenCalled();
            expect(h3).not.toHaveBeenCalled();
        });

        it("invalidatePattern with exact match", () => {
            const nav = new NavigationManager({});
            const h1 = vi.fn();
            const h2 = vi.fn();
            nav.registerInvalidationHandler("/search", h1);
            nav.registerInvalidationHandler("/home", h2);
            nav.invalidatePattern("/search");
            expect(h1).toHaveBeenCalled();
            expect(h2).not.toHaveBeenCalled();
        });

        it("invalidatePattern with /* matches everything", () => {
            const nav = new NavigationManager({});
            const h1 = vi.fn();
            const h2 = vi.fn();
            nav.registerInvalidationHandler("/search", h1);
            nav.registerInvalidationHandler("/home", h2);
            nav.invalidatePattern("/*");
            expect(h1).toHaveBeenCalled();
            expect(h2).toHaveBeenCalled();
        });

        it("unregister invalidation handler", () => {
            const nav = new NavigationManager({});
            const handler = vi.fn();
            const unsub = nav.registerInvalidationHandler("/test", handler);
            unsub();
            nav.invalidateRoute("/test");
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe("dispose", () => {
        it("resets all state", () => {
            const nav = new NavigationManager({ tabs: ["/home"] });
            nav.stacks.apply("/home", { ...forwardIntent });
            nav.beforeNav(() => { });
            nav.afterNav(() => { });
            nav.onTabChange(() => { });
            nav.setPendingNav("/test", forwardIntent);
            nav.beginTransition();

            nav.dispose();

            expect(nav.isTransitioning).toBe(false);
            expect(nav.pendingNav).toBeNull();
            expect(nav.stackDepth()).toBe(0);
        });
    });

    describe("canGoBack signal", () => {
        it("starts as false", () => {
            const nav = new NavigationManager({});
            expect(nav.canGoBack.value).toBe(false);
        });

        it("updates to true when stack depth > 1", () => {
            const nav = new NavigationManager({});
            nav.stacks.apply("/page1", { ...forwardIntent });
            nav.stacks.apply("/page2", { ...forwardIntent });
            nav.updateCanGoBack();
            expect(nav.canGoBack.value).toBe(true);
        });

        it("updates to false when stack depth <= 1", () => {
            const nav = new NavigationManager({});
            nav.stacks.apply("/page1", { ...forwardIntent });
            nav.stacks.apply("/page2", { ...forwardIntent });
            nav.updateCanGoBack();
            expect(nav.canGoBack.value).toBe(true);
            // Go back
            nav.stacks.apply("/page1", { ...backIntent });
            nav.updateCanGoBack();
            expect(nav.canGoBack.value).toBe(false);
        });

        it("reflects per-tab state after tab switch", () => {
            const nav = new NavigationManager({ tabs: ["/home", "/search"] });
            // Home tab: push 2 pages
            nav.stacks.apply("/home", { ...forwardIntent });
            nav.stacks.apply("/home/detail", { ...forwardIntent });
            // Search tab: push 1 page
            nav.stacks.apply("/search", { ...forwardIntent });

            // Active tab is search (last applied) — depth 1
            nav.updateCanGoBack();
            expect(nav.canGoBack.value).toBe(false);

            // Switch back to home tab — depth 2
            nav.stacks.apply("/home/detail", { ...forwardIntent });
            nav.updateCanGoBack();
            expect(nav.canGoBack.value).toBe(true);
        });

        it("is reactive (can be used in effects)", async () => {
            const { effect } = await import("@elurjs/core");
            const nav = new NavigationManager({});
            const values: boolean[] = [];

            const dispose = effect(() => {
                values.push(nav.canGoBack.value);
            });

            nav.stacks.apply("/page1", { ...forwardIntent });
            nav.stacks.apply("/page2", { ...forwardIntent });
            nav.updateCanGoBack();

            nav.stacks.apply("/page1", { ...backIntent });
            nav.updateCanGoBack();

            // Wait for effects to flush
            await new Promise(r => setTimeout(r, 0));

            expect(values).toContain(true);
            expect(values).toContain(false);
            dispose();
        });
    });

    describe("clearTabStack", () => {
        it("clears a specific tab's stack and returns entries", () => {
            const sm = new StackManager(["/home", "/search"]);
            sm.apply("/home", { ...forwardIntent });
            sm.apply("/home/detail", { ...forwardIntent });
            sm.apply("/search", { ...forwardIntent });

            const cleared = sm.clearTabStack("/home");
            expect(cleared).toEqual(["/home", "/home/detail"]);
            expect(sm.stackDepth("/home")).toBe(0);
            expect(sm.stackDepth("/search")).toBe(1);
        });

        it("returns empty array for unknown tab", () => {
            const sm = new StackManager(["/home"]);
            const cleared = sm.clearTabStack("/nonexistent");
            expect(cleared).toEqual([]);
        });
    });
});
