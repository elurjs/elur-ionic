import { describe, expect, it } from "vitest";
import { NavigationManager } from "../navigation";
import { getIonicDevtoolsSnapshot } from "../devtools";
import type { IonicDevtoolsSnapshot } from "../devtools";

type NavEntry = IonicDevtoolsSnapshot["navigation"][number];
type StackEntry = NavEntry["stacks"][number];

describe("devtools plugin", () => {
    it("exposes navigation managers as a JSON-safe snapshot", () => {
        const nav = new NavigationManager({ tabs: ["/home", "/search"] });

        const snapshot = getIonicDevtoolsSnapshot();
        const entry = snapshot.navigation.find((n: NavEntry) => n.tabPrefixes.includes("/home"));
        expect(entry).toBeDefined();
        expect(entry?.canGoBack).toBe(false);
        expect(entry?.isTransitioning).toBe(false);
        expect(entry?.stacks.some((s: StackEntry) => s.prefix === "/home")).toBe(true);
        expect(Array.isArray(snapshot.outlets)).toBe(true);

        expect(() => JSON.stringify(snapshot)).not.toThrow();
        void nav;
    });
});
