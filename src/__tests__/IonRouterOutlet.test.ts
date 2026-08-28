import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { html, ElurComponent } from "@elurjs/core";
import { createRouter, elurRouter } from "@elurjs/core";
import { _resetRouter } from "@elurjs/core/router";
import { render, cleanup, waitFor } from "@elurjs/core-testing";
import { IonRouterOutlet, IonBackButton } from "../IonRouterOutlet.js";
import { IonPage, createPageLifecycle } from "../index.js";
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

describe("IonBackButton", () => {
    beforeEach(() => {
        cleanup();
        document.body.innerHTML = "";
        history.replaceState(null, "", "/");
        _resetRouter();
    });

    it("renders an ion-back-button with default-href", () => {
        const { container } = render(IonBackButton("/home"));
        const btn = container.querySelector("ion-back-button");
        expect(btn).toBeTruthy();
        expect(btn?.getAttribute("default-href")).toBe("/home");
    });

    it("calls router.back when canGoBack", () => {
        const router = createRouter([{ path: "/" }, { path: "/home" }]);
        router.navigate("/home", { direction: "forward" });
        const back = vi.spyOn(router, "back");
        const { container } = render(IonBackButton("/fallback"));
        const btn = container.querySelector("ion-back-button") as HTMLElement;
        btn.click();
        expect(back).toHaveBeenCalled();
    });

    it("replaces default-href when cannot go back", () => {
        const router = createRouter([{ path: "/" }, { path: "/home" }]);
        const replace = vi.spyOn(router, "replace");
        const { container } = render(IonBackButton("/fallback"));
        const btn = container.querySelector("ion-back-button") as HTMLElement;
        btn.click();
        expect(replace).toHaveBeenCalledWith("/fallback");
    });
});

describe("IonRouterOutlet", () => {
    beforeEach(() => {
        cleanup();
        document.body.innerHTML = "";
        history.replaceState(null, "", "/");
        _resetRouter();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("auto-bootstraps a router when none exists", () => {
        const outlet = new IonRouterOutlet([{ path: "/", component: () => html`<div>Home</div>` }]);
        expect(() => elurRouter()).not.toThrow();
        outlet.render();
    });

    it("auto-bootstraps a router with guards", () => {
        const guard = vi.fn(() => true);
        const outlet = new IonRouterOutlet([
            { path: "/", component: () => html`<div>Home</div>` },
            { path: "/protected", component: () => html`<div>Protected</div>`, beforeEnter: guard },
        ]);
        outlet.render();
        const router = elurRouter();
        router.navigate("/protected", { direction: "forward" });
        expect(guard).toHaveBeenCalled();
    });

    it("does not bootstrap when skipAutoBootstrap is true", () => {
        createRouter([{ path: "/" }]);
        const outlet = new IonRouterOutlet(
            [{ path: "/", component: () => html`<div>Home</div>` }],
            { skipAutoBootstrap: true },
        );
        expect(outlet).toBeTruthy();
    });

    it("renders an ion-router-outlet", () => {
        const outlet = new IonRouterOutlet([{ path: "/", component: () => html`<div>Home</div>` }]);
        const { container } = render(outlet.render());
        expect(container.querySelector("ion-router-outlet")).toBeTruthy();
    });

    it("mounts the initial route component", async () => {
        const outlet = new IonRouterOutlet([{ path: "/", component: () => html`<div data-testid="home">Home</div>` }]);
        const { getByTestId } = render(outlet.render());
        await flushMicrotasks();
        await flushAnimationFrames();
        expect(getByTestId("home")).toBeTruthy();
    });

    it("navigates to a new route", async () => {
        const router = createRouter([{ path: "/" }, { path: "/about" }]);
        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                { path: "/about", component: () => html`<div data-testid="about">About</div>` },
            ],
            { skipAutoBootstrap: true },
        );
        render(outlet.render());
        await flushMicrotasks();
        await flushAnimationFrames();
        router.navigate("/about", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="about"]')).toBeTruthy());
    });

    it("extracts route params", async () => {
        const router = createRouter([{ path: "/" }, { path: "/detail/:id" }]);
        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div>Home</div>` },
                {
                    path: "/detail/:id",
                    component: (ctx) => html`<div data-testid="detail">${ctx.params.id}</div>`,
                },
            ],
            { skipAutoBootstrap: true },
        );
        render(outlet.render());
        await flushMicrotasks();
        router.navigate("/detail/42", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() =>
            expect(document.querySelector('[data-testid="detail"]')?.textContent).toBe("42"),
        );
    });

    it("handles invalid encoded route params", async () => {
        const router = createRouter([{ path: "/" }, { path: "/detail/:id" }]);
        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div>Home</div>` },
                {
                    path: "/detail/:id",
                    component: (ctx) => html`<div data-testid="detail">${ctx.params.id}</div>`,
                },
            ],
            { skipAutoBootstrap: true },
        );
        render(outlet.render());
        await flushMicrotasks();
        router.navigate("/detail/abc%ZZ", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() =>
            expect(document.querySelector('[data-testid="detail"]')?.textContent).toBe("abc%ZZ"),
        );
    });

    it("caches views by default", async () => {
        const router = createRouter([{ path: "/" }, { path: "/other" }]);
        const mount = vi.fn(() => html`<div>Page</div>`);
        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                { path: "/other", component: mount },
            ],
            { skipAutoBootstrap: true },
        );
        render(outlet.render());
        await flushMicrotasks();
        router.navigate("/other", { direction: "forward" });
        await flushMicrotasks();
        router.navigate("/", { direction: "back" });
        await flushMicrotasks();
        router.navigate("/other", { direction: "forward" });
        await flushMicrotasks();
        // mount should be called only once because the view is cached
        expect(mount).toHaveBeenCalledTimes(1);
    });

    it("disables cache when cache:false", async () => {
        const router = createRouter([{ path: "/" }, { path: "/other" }]);
        const mount = vi.fn(() => html`<div data-testid="other">Page</div>`);
        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                { path: "/other", component: mount },
            ],
            { skipAutoBootstrap: true, cache: false },
        );
        render(outlet.render());
        await flushMicrotasks();
        router.navigate("/other", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="other"]')).toBeTruthy());
        router.replace("/", { direction: "none" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="home"]')).toBeTruthy());
        router.navigate("/other", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(mount).toHaveBeenCalledTimes(2));
    });

    it("runs beforeEnter guard and allows navigation", async () => {
        const guard = vi.fn(() => true);
        const router = createRouter([{ path: "/" }, { path: "/protected" }]);
        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div>Home</div>` },
                { path: "/protected", component: () => html`<div data-testid="protected">Protected</div>`, beforeEnter: guard },
            ],
            { skipAutoBootstrap: true },
        );
        render(outlet.render());
        await flushMicrotasks();
        router.navigate("/protected", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(guard).toHaveBeenCalled());
        expect(document.querySelector('[data-testid="protected"]')).toBeTruthy();
    });

    it("beforeEnter guard can redirect", async () => {
        const router = createRouter([{ path: "/" }, { path: "/protected" }, { path: "/login" }]);
        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div>Home</div>` },
                { path: "/protected", component: () => html`<div data-testid="protected">Protected</div>`, beforeEnter: () => ({ redirect: "/login" }) },
                { path: "/login", component: () => html`<div data-testid="login">Login</div>` },
            ],
            { skipAutoBootstrap: true },
        );
        render(outlet.render());
        await flushMicrotasks();
        router.navigate("/protected", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(router.current.value).toBe("/login"));
        expect(document.querySelector('[data-testid="login"]')).toBeTruthy();
    });

    it("beforeEnter guard allows navigation with default result", async () => {
        const router = createRouter([{ path: "/" }, { path: "/page" }]);
        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                { path: "/page", component: () => html`<div data-testid="page">Page</div>`, beforeEnter: () => ({}) as any },
            ],
            { skipAutoBootstrap: true },
        );
        render(outlet.render());
        await flushMicrotasks();
        router.navigate("/page", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="page"]')).toBeTruthy());
    });

    it("beforeEnter guard cancels page mount", async () => {
        const router = createRouter([{ path: "/" }, { path: "/protected" }]);
        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                { path: "/protected", component: () => html`<div data-testid="protected">Protected</div>`, beforeEnter: () => false },
            ],
            { skipAutoBootstrap: true },
        );
        render(outlet.render());
        await flushMicrotasks();
        router.navigate("/protected", { direction: "forward" });
        await flushMicrotasks();
        // The outlet guard prevents mounting; the router core may still update current.
        await waitFor(() => expect(document.querySelector('[data-testid="protected"]')).toBeFalsy());
        expect(document.querySelector('[data-testid="home"]')).toBeTruthy();
    });

    it("supports ElurComponent route components", async () => {
        const router = createRouter([{ path: "/" }, { path: "/class" }]);
        class ClassPage extends ElurComponent {
            override render() {
                return html`<div data-testid="class">Class Page</div>`;
            }
        }
        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div>Home</div>` },
                { path: "/class", component: () => new ClassPage() },
            ],
            { skipAutoBootstrap: true },
        );
        render(outlet.render());
        await flushMicrotasks();
        router.navigate("/class", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="class"]')).toBeTruthy());
    });

    it("supports IonPage lifecycle hooks", async () => {
        const router = createRouter([{ path: "/" }, { path: "/page" }]);
        const willEnter = vi.fn();
        const didEnter = vi.fn();
        const willLeave = vi.fn();
        const didLeave = vi.fn();
        class PageWithLifecycle extends IonPage {
            constructor(lc: ReturnType<typeof createPageLifecycle>) {
                super(lc);
            }
            override ionViewWillEnter() {
                willEnter();
            }
            override ionViewDidEnter() {
                didEnter();
            }
            override ionViewWillLeave() {
                willLeave();
            }
            override ionViewDidLeave() {
                didLeave();
            }
            override render() {
                return html`<div data-testid="lifecycle">Page</div>`;
            }
        }
        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                { path: "/page", component: (ctx) => new PageWithLifecycle(ctx.lc) },
            ],
            { skipAutoBootstrap: true },
        );
        render(outlet.render());
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="home"]')).toBeTruthy());
        router.navigate("/page", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="lifecycle"]')).toBeTruthy());
        expect(willEnter).toHaveBeenCalled();
        expect(didEnter).toHaveBeenCalled();
        router.navigate("/", { direction: "back" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="home"]')).toBeTruthy());
        expect(willLeave).toHaveBeenCalled();
        expect(didLeave).toHaveBeenCalled();
    });

    it("supports tabs with per-tab stacks", async () => {
        const router = createRouter([
            { path: "/home" },
            { path: "/home/detail" },
            { path: "/profile" },
        ]);
        const outlet = new IonRouterOutlet(
            [
                { path: "/home", component: () => html`<div data-testid="home">Home</div>` },
                { path: "/home/detail", component: () => html`<div data-testid="home-detail">Home Detail</div>` },
                { path: "/profile", component: () => html`<div data-testid="profile">Profile</div>` },
            ],
            { skipAutoBootstrap: true, tabs: ["/home", "/profile"] },
        );
        render(outlet.render());
        await flushMicrotasks();
        router.navigate("/home/detail", { direction: "forward" });
        await flushMicrotasks();
        router.navigate("/profile", { direction: "none" });
        await flushMicrotasks();
        router.navigate("/home", { direction: "none" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="home-detail"]')).toBeTruthy());
    });

    it("invalidates cache for a route", async () => {
        const router = createRouter([{ path: "/" }, { path: "/other" }]);
        const mount = vi.fn(() => html`<div data-testid="other">Page</div>`);
        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                { path: "/other", component: mount },
            ],
            { skipAutoBootstrap: true },
        );
        render(outlet.render());
        await flushMicrotasks();
        router.navigate("/other", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="other"]')).toBeTruthy());
        router.replace("/", { direction: "none" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="home"]')).toBeTruthy());
        outlet.invalidateCache("/other");
        router.navigate("/other", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(mount).toHaveBeenCalledTimes(2));
    });

    it("invalidates cache for the active route", async () => {
        const router = createRouter([{ path: "/" }, { path: "/other" }]);
        const mount = vi.fn(() => html`<div data-testid="other">Page</div>`);
        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div data-testid="home">Home</div>` },
                { path: "/other", component: mount },
            ],
            { skipAutoBootstrap: true },
        );
        render(outlet.render());
        await flushMicrotasks();
        router.navigate("/other", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="other"]')).toBeTruthy());
        outlet.invalidateCache("/other");
        router.navigate("/", { direction: "back" });
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="home"]')).toBeTruthy());
        router.navigate("/other", { direction: "forward" });
        await flushMicrotasks();
        await waitFor(() => expect(mount).toHaveBeenCalledTimes(2));
    });

    it("clearCache removes all inactive cached views", async () => {
        const router = createRouter([{ path: "/" }, { path: "/a" }, { path: "/b" }]);
        const outlet = new IonRouterOutlet(
            [
                { path: "/", component: () => html`<div>Home</div>` },
                { path: "/a", component: () => html`<div data-testid="a">A</div>` },
                { path: "/b", component: () => html`<div data-testid="b">B</div>` },
            ],
            { skipAutoBootstrap: true },
        );
        render(outlet.render());
        await flushMicrotasks();
        router.navigate("/a", { direction: "forward" });
        await flushMicrotasks();
        router.navigate("/b", { direction: "forward" });
        await flushMicrotasks();
        outlet.clearCache();
        // Active page is /b, so /a should be removed from cache
        const cachedA = document.querySelector('[data-testid="a"]');
        expect(cachedA).toBeFalsy();
    });

    it("unmount cleans up cache and outlet", async () => {
        createRouter([{ path: "/" }]);
        const outlet = new IonRouterOutlet(
            [{ path: "/", component: () => html`<div data-testid="home">Home</div>` }],
            { skipAutoBootstrap: true },
        );
        const { unmount } = render(outlet.render());
        await flushMicrotasks();
        await waitFor(() => expect(document.querySelector('[data-testid="home"]')).toBeTruthy());
        unmount();
        expect(document.querySelector("ion-router-outlet")).toBeFalsy();
    });
});
