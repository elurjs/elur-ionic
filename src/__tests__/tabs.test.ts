import { describe, it, expect, beforeEach, vi } from "vitest";
import { createRouter } from "@elurjs/core";
import { _resetRouter } from "@elurjs/core/router";
import { render, screen, fireEvent, cleanup, waitFor } from "@elurjs/core-testing";
import { createBottomTabBar } from "../tabs.js";
import "./mocks/ionic.js";

describe("createBottomTabBar", () => {
    beforeEach(() => {
        cleanup();
        document.body.innerHTML = "";
        history.replaceState(null, "", "/");
        _resetRouter();
        createRouter([
            { path: "/" },
            { path: "/home" },
            { path: "/profile" },
            { path: "/profile/edit" },
        ]);
    });

    it("renders a tab bar with tabs", () => {
        const tabs = [
            { path: "/home", label: "Home", icon: "home" },
            { path: "/profile", label: "Profile", icon: "person" },
        ];
        const template = createBottomTabBar(tabs);
        render(template);
        expect(screen.getByText("Home")).toBeTruthy();
        expect(screen.getByText("Profile")).toBeTruthy();
        expect(document.querySelector("ion-tab-bar")).toBeTruthy();
        expect(document.querySelectorAll("ion-tab-button").length).toBe(2);
    });

    it("marks active tab based on current path", async () => {
        const router = createRouter([
            { path: "/home" },
            { path: "/profile" },
        ]);
        const tabs = [
            { path: "/home", label: "Home", icon: "home" },
            { path: "/profile", label: "Profile", icon: "person" },
        ];
        render(createBottomTabBar(tabs));
        router.navigate("/profile", { direction: "none" });
        await waitFor(() => {
            const buttons = Array.from(document.querySelectorAll("ion-tab-button"));
            expect((buttons[1] as any).selected).toBe(true);
            expect((buttons[0] as any).selected).toBe(false);
        });
    });

    it("switches active icon when active", async () => {
        const router = createRouter([
            { path: "/home" },
            { path: "/profile" },
        ]);
        const tabs = [
            { path: "/home", label: "Home", icon: "home", activeIcon: "home-active" },
        ];
        render(createBottomTabBar(tabs));
        const icon = document.querySelector("ion-icon");
        expect(icon?.getAttribute("name")).toBe("home");
        router.navigate("/home", { direction: "none" });
        await waitFor(() => expect(icon?.getAttribute("name")).toBe("home-active"));
    });

    it("navigates on tab click", () => {
        const router = createRouter([
            { path: "/home" },
            { path: "/profile" },
        ]);
        const tabs = [
            { path: "/home", label: "Home", icon: "home" },
            { path: "/profile", label: "Profile", icon: "person" },
        ];
        render(createBottomTabBar(tabs));
        const profileButton = screen.getByText("Profile").closest("ion-tab-button") as HTMLElement;
        fireEvent.click(profileButton);
        expect(router.current.value).toBe("/profile");
    });

    it("replaces root when clicking active tab", () => {
        const router = createRouter([
            { path: "/home" },
            { path: "/home/nested" },
        ]);
        router.navigate("/home/nested", { direction: "forward" });
        const tabs = [{ path: "/home", label: "Home", icon: "home" }];
        render(createBottomTabBar(tabs));
        const button = screen.getByText("Home").closest("ion-tab-button") as HTMLElement;
        fireEvent.click(button);
        expect(router.current.value).toBe("/home");
    });

    it("supports hidden paths", async () => {
        const router = createRouter([
            { path: "/home" },
            { path: "/secret" },
        ]);
        const tabs = [{ path: "/home", label: "Home", icon: "home" }];
        render(createBottomTabBar(tabs, { hiddenPaths: ["/secret"] }));
        router.navigate("/secret", { direction: "none" });
        const bar = document.querySelector("ion-tab-bar") as HTMLElement;
        await waitFor(() => expect(bar.style.display).toBe("none"));
    });

    it("supports hideWhen predicate", async () => {
        const router = createRouter([
            { path: "/home" },
            { path: "/hidden" },
        ]);
        const tabs = [{ path: "/home", label: "Home", icon: "home" }];
        render(createBottomTabBar(tabs, { hideWhen: (p) => p === "/hidden" }));
        router.navigate("/hidden", { direction: "none" });
        const bar = document.querySelector("ion-tab-bar") as HTMLElement;
        await waitFor(() => expect(bar.style.display).toBe("none"));
    });

    it("supports hidden wildcard patterns", async () => {
        const router = createRouter([
            { path: "/home" },
            { path: "/secret/nested" },
        ]);
        const tabs = [{ path: "/home", label: "Home", icon: "home" }];
        render(createBottomTabBar(tabs, { hiddenPaths: ["/secret/*"] }));
        router.navigate("/secret/nested", { direction: "none" });
        const bar = document.querySelector("ion-tab-bar") as HTMLElement;
        await waitFor(() => expect(bar.style.display).toBe("none"));
    });

    it("supports exact matching", () => {
        const router = createRouter([
            { path: "/home" },
            { path: "/home/nested" },
        ]);
        const tabs = [{ path: "/home", label: "Home", icon: "home", exact: true }];
        render(createBottomTabBar(tabs));
        router.navigate("/home/nested", { direction: "none" });
        const button = document.querySelector("ion-tab-button") as HTMLElement;
        expect((button as any).selected).toBe(false);
    });

    it("supports tab id", () => {
        const tabs = [{ path: "/home", label: "Home", tabId: "custom-tab" }];
        render(createBottomTabBar(tabs));
        const button = document.querySelector("ion-tab-button") as HTMLElement;
        expect(button.getAttribute("tab")).toBe("custom-tab");
    });

    it("supports tab root path", async () => {
        const router = createRouter([
            { path: "/" },
            { path: "/home" },
        ]);
        const tabs = [{ path: "/", label: "Home", icon: "home" }];
        render(createBottomTabBar(tabs));
        const button = document.querySelector("ion-tab-button") as HTMLElement;
        expect(button.getAttribute("tab")).toBe("root");
        await waitFor(() => expect((button as any).selected).toBe(true));
        router.navigate("/home", { direction: "none" });
        await waitFor(() => expect((button as any).selected).toBe(false));
    });

    it("supports tab path with trailing slash", async () => {
        const router = createRouter([
            { path: "/home" },
        ]);
        const tabs = [{ path: "/home/", label: "Home", icon: "home" }];
        render(createBottomTabBar(tabs));
        router.navigate("/home", { direction: "none" });
        const button = document.querySelector("ion-tab-button") as HTMLElement;
        await waitFor(() => expect((button as any).selected).toBe(true));
    });

    it("supports custom slot and class names", () => {
        const tabs = [{ path: "/home", label: "Home" }];
        render(createBottomTabBar(tabs, { slot: "top", className: "custom-bar" }));
        const bar = document.querySelector("ion-tab-bar") as HTMLElement;
        expect(bar.getAttribute("slot")).toBe("top");
        expect(bar.classList.contains("custom-bar")).toBe(true);
    });

    it("supports custom navigation direction", () => {
        const router = createRouter([
            { path: "/home" },
            { path: "/profile" },
        ]);
        const tabs = [
            { path: "/home", label: "Home" },
            { path: "/profile", label: "Profile" },
        ];
        render(createBottomTabBar(tabs, { navigationDirection: "forward" }));
        const spy = vi.spyOn(router, "navigate");
        const button = screen.getByText("Profile").closest("ion-tab-button") as HTMLElement;
        fireEvent.click(button);
        expect(spy).toHaveBeenCalledWith("/profile", { direction: "forward" });
    });
});
