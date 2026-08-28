import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signal } from "@elurjs/core";
import {
    createPageState,
    clearAllPageState,
    isSerializable,
} from "../page-state.js";

describe("page-state persistence", () => {
    beforeEach(() => {
        sessionStorage.clear();
        localStorage.clear();
    });

    afterEach(() => {
        sessionStorage.clear();
        localStorage.clear();
    });

    describe("isSerializable", () => {
        it("accepts primitives", () => {
            expect(isSerializable(42)).toBe(true);
            expect(isSerializable("hello")).toBe(true);
            expect(isSerializable(true)).toBe(true);
            expect(isSerializable(false)).toBe(true);
            expect(isSerializable(null)).toBe(true);
        });

        it("rejects undefined", () => {
            expect(isSerializable(undefined)).toBe(false);
        });

        it("rejects functions", () => {
            expect(isSerializable(() => { })).toBe(false);
            expect(isSerializable(function () { })).toBe(false);
        });

        it("rejects symbols", () => {
            expect(isSerializable(Symbol("test"))).toBe(false);
        });

        it("rejects bigint", () => {
            expect(isSerializable(BigInt(123))).toBe(false);
        });

        it("accepts plain arrays", () => {
            expect(isSerializable([1, 2, 3])).toBe(true);
            expect(isSerializable(["a", "b"])).toBe(true);
            expect(isSerializable([{ a: 1 }, { b: 2 }])).toBe(true);
        });

        it("rejects arrays with non-serializable elements", () => {
            expect(isSerializable([1, () => { }, 3])).toBe(false);
            expect(isSerializable([Symbol("x")])).toBe(false);
        });

        it("accepts plain objects", () => {
            expect(isSerializable({ a: 1, b: "hello" })).toBe(true);
            expect(isSerializable({ nested: { deep: [1, 2] } })).toBe(true);
        });

        it("rejects class instances", () => {
            class Foo { constructor(public x: number) { } }
            expect(isSerializable(new Foo(1))).toBe(false);
        });

        it("rejects DOM nodes", () => {
            expect(isSerializable(document.createElement("div"))).toBe(false);
            expect(isSerializable(document.createTextNode("hi"))).toBe(false);
        });

        it("rejects circular references", () => {
            const obj: any = { a: 1 };
            obj.self = obj;
            expect(isSerializable(obj)).toBe(false);
        });
    });

    describe("createPageState — save/restore", () => {
        it("saves and restores signal values", () => {
            const query = signal("hello");
            const count = signal(42);

            const state = createPageState("test-page", { query, count });

            state.save();
            expect(sessionStorage.getItem("elur-ionic:test-page")).toBeTruthy();

            // Change signals
            query.value = "changed";
            count.value = 0;

            // Restore
            const restored = state.restore();
            expect(restored).toBe(true);
            expect(query.value).toBe("hello");
            expect(count.value).toBe(42);
        });

        it("restore returns false when no saved state exists", () => {
            const sig = signal("initial");
            const state = createPageState("no-data", { sig });
            expect(state.restore()).toBe(false);
            expect(sig.value).toBe("initial");
        });

        it("clear removes saved state", () => {
            const sig = signal("value");
            const state = createPageState("clear-test", { sig });

            state.save();
            expect(sessionStorage.getItem("elur-ionic:clear-test")).toBeTruthy();

            state.clear();
            expect(sessionStorage.getItem("elur-ionic:clear-test")).toBeNull();
        });

        it("exposes the storage key", () => {
            const state = createPageState("my-page", { x: signal(1) });
            expect(state.key).toBe("elur-ionic:my-page");
        });
    });

    describe("non-serializable values", () => {
        it("skips non-serializable values with a warning", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
            const good = signal("serializable");
            const bad = signal(() => { }); // function — not serializable

            const state = createPageState("mixed", { good, bad });
            state.save();

            // Good value should be saved
            const raw = sessionStorage.getItem("elur-ionic:mixed");
            expect(raw).toBeTruthy();
            const data = JSON.parse(raw!);
            expect(data.good).toBe("serializable");
            expect(data.bad).toBeUndefined(); // skipped

            // Warning should have been emitted
            expect(warn).toHaveBeenCalledWith(
                expect.stringContaining("non-serializable"),
            );
            warn.mockRestore();
        });

        it("does not save anything if all values are non-serializable", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
            const bad1 = signal(Symbol("x"));
            const bad2 = signal(undefined);

            const state = createPageState("all-bad", { bad1, bad2 });
            state.save();

            expect(sessionStorage.getItem("elur-ionic:all-bad")).toBeNull();
            warn.mockRestore();
        });
    });

    describe("storage backends", () => {
        it("uses sessionStorage by default", () => {
            const sig = signal("data");
            const state = createPageState("default-storage", { sig });
            state.save();
            expect(sessionStorage.getItem("elur-ionic:default-storage")).toBeTruthy();
            expect(localStorage.getItem("elur-ionic:default-storage")).toBeNull();
        });

        it("uses localStorage when storage: 'local'", () => {
            const sig = signal("data");
            const state = createPageState("local-storage", { sig }, { storage: "local" });
            state.save();
            expect(localStorage.getItem("elur-ionic:local-storage")).toBeTruthy();
            expect(sessionStorage.getItem("elur-ionic:local-storage")).toBeNull();
        });

        it("restores from localStorage when storage: 'local'", () => {
            const sig = signal("initial");
            const state = createPageState("local-restore", { sig }, { storage: "local" });
            sig.value = "saved";
            state.save();
            sig.value = "changed";
            state.restore();
            expect(sig.value).toBe("saved");
        });
    });

    describe("namespace and key suffix", () => {
        it("uses custom namespace", () => {
            const sig = signal(1);
            const state = createPageState("page", { sig }, { namespace: "myapp" });
            state.save();
            expect(sessionStorage.getItem("myapp:page")).toBeTruthy();
            expect(state.key).toBe("myapp:page");
        });

        it("uses key suffix for user isolation", () => {
            const sig = signal(1);
            const state = createPageState("settings", { sig }, { keySuffix: "user-123" });
            state.save();
            expect(sessionStorage.getItem("elur-ionic:settings:user-123")).toBeTruthy();
            expect(state.key).toBe("elur-ionic:settings:user-123");
        });
    });

    describe("clearAllPageState", () => {
        it("clears all elur-ionic entries from sessionStorage", () => {
            sessionStorage.setItem("elur-ionic:page1", "{}");
            sessionStorage.setItem("elur-ionic:page2", "{}");
            sessionStorage.setItem("other-app:data", "{}");

            clearAllPageState();

            expect(sessionStorage.getItem("elur-ionic:page1")).toBeNull();
            expect(sessionStorage.getItem("elur-ionic:page2")).toBeNull();
            expect(sessionStorage.getItem("other-app:data")).toBeTruthy(); // untouched
        });

        it("clears from localStorage when backend: 'local'", () => {
            localStorage.setItem("elur-ionic:page1", "{}");
            localStorage.setItem("elur-ionic:page2", "{}");

            clearAllPageState("local");

            expect(localStorage.getItem("elur-ionic:page1")).toBeNull();
            expect(localStorage.getItem("elur-ionic:page2")).toBeNull();
        });

        it("respects custom namespace", () => {
            sessionStorage.setItem("myapp:page1", "{}");
            sessionStorage.setItem("elur-ionic:page2", "{}");

            clearAllPageState("session", "myapp");

            expect(sessionStorage.getItem("myapp:page1")).toBeNull();
            expect(sessionStorage.getItem("elur-ionic:page2")).toBeTruthy(); // untouched
        });
    });

    describe("corrupted data", () => {
        it("restore handles corrupted JSON gracefully", () => {
            sessionStorage.setItem("elur-ionic:corrupt", "{invalid json}");
            const sig = signal("initial");
            const state = createPageState("corrupt", { sig });
            expect(state.restore()).toBe(false);
            expect(sig.value).toBe("initial");
            // Corrupted data should be cleared
            expect(sessionStorage.getItem("elur-ionic:corrupt")).toBeNull();
        });
    });

    describe("restore with partial data", () => {
        it("only restores signals that have saved data", () => {
            const a = signal("a-initial");
            const b = signal("b-initial");

            // Save only 'a'
            const state1 = createPageState("partial", { a });
            a.value = "a-saved";
            state1.save();

            // Restore with both a and b
            const state2 = createPageState("partial", { a, b });
            a.value = "a-changed";
            b.value = "b-changed";
            state2.restore();

            expect(a.value).toBe("a-saved");
            expect(b.value).toBe("b-changed"); // not in saved data, unchanged
        });
    });
});
