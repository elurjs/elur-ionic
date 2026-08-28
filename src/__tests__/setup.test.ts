import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@ionic/core/components", () => ({
    initialize: vi.fn(),
}));

vi.mock("@ionic/core/components/ion-app.js", () => ({
    defineCustomElement: vi.fn(() => {
        if (!customElements.get("ion-app")) {
            customElements.define("ion-app", class extends HTMLElement { });
        }
    }),
}));

vi.mock("@ionic/core/components/ion-router-outlet.js", () => ({
    defineCustomElement: vi.fn(() => {
        if (!customElements.get("ion-router-outlet")) {
            customElements.define("ion-router-outlet", class extends HTMLElement { });
        }
    }),
}));

vi.mock("@ionic/core/components/ion-back-button.js", () => ({
    defineCustomElement: vi.fn(() => {
        if (!customElements.get("ion-back-button")) {
            customElements.define("ion-back-button", class extends HTMLElement { });
        }
    }),
}));

vi.mock("ionicons/components/ion-icon.js", () => ({
    defineCustomElement: vi.fn(() => {
        if (!customElements.get("ion-icon")) {
            customElements.define("ion-icon", class extends HTMLElement { });
        }
    }),
}));

vi.mock("ionicons", () => ({
    addIcons: vi.fn(),
    setAssetPath: vi.fn(),
}));

vi.mock("ionicons/icons", () => ({
    arrowBack: "arrowBackIcon",
    arrowBackSharp: "arrowBackSharpIcon",
    chevronBack: "chevronBackIcon",
    chevronBackSharp: "chevronBackSharpIcon",
}));

import { addIcons as mockAddIcons, setAssetPath as mockSetAssetPath } from "ionicons";

describe("setupElurIonic (compat facade)", () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    async function loadSetup() {
        const mod = await import("../setup.js");
        return {
            setupElurIonic: mod.setupElurIonic,
            initializeElurIonic: mod.initializeElurIonic,
            registerIonicComponents: mod.registerIonicComponents,
            registerIonicons: mod.registerIonicons,
            exportedAddIcons: mod.addIcons,
        };
    }

    it("initializes with inline icons by default (no unpkg@latest)", async () => {
        const { setupElurIonic } = await loadSetup();
        setupElurIonic();
        // Should NOT set the old unpkg@latest default
        expect(mockSetAssetPath).toHaveBeenCalledWith("");
        expect((window as any).ionicons?.assets).not.toBe(
            "https://unpkg.com/ionicons@latest/dist/ionicons/svg/",
        );
    });

    it("uses custom icon asset path via iconAssetPath (compat)", async () => {
        const { setupElurIonic } = await loadSetup();
        setupElurIonic({ iconAssetPath: "/assets/icons/" });
        expect(mockSetAssetPath).toHaveBeenCalledWith("/assets/icons/");
    });

    it("registers core components and adds default icons", async () => {
        const { setupElurIonic } = await loadSetup();
        setupElurIonic();
        expect(mockAddIcons).toHaveBeenCalledWith(
            expect.objectContaining({
                "arrow-back": "arrowBackIcon",
                "arrow-back-sharp": "arrowBackSharpIcon",
                "chevron-back": "chevronBackIcon",
                "chevron-back-sharp": "chevronBackSharpIcon",
            }),
        );
    });

    it("registers extra components and merges icons", async () => {
        const { setupElurIonic } = await loadSetup();
        const customComponent = vi.fn();
        setupElurIonic({ components: [customComponent], icons: { home: "homeIcon" } });
        expect(customComponent).toHaveBeenCalled();
        // Default icons + custom icons should both be registered
        expect(mockAddIcons).toHaveBeenCalledWith(
            expect.objectContaining({
                "arrow-back": "arrowBackIcon",
            }),
        );
        expect(mockAddIcons).toHaveBeenCalledWith(
            expect.objectContaining({
                home: "homeIcon",
            }),
        );
    });

    it("re-exports addIcons", async () => {
        const { setupElurIonic, exportedAddIcons } = await loadSetup();
        setupElurIonic();
        expect(exportedAddIcons).toBe(mockAddIcons);
    });
});

describe("initializeElurIonic", () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    async function loadSetup() {
        return await import("../setup.js");
    }

    it("returns a handle with initialized=true on first call", async () => {
        const { initializeElurIonic } = await loadSetup();
        const handle = initializeElurIonic();
        expect(handle.initialized).toBe(true);
        expect(handle.diagnostics).toEqual([]);
    });

    it("returns initialized=false on second call (no-op)", async () => {
        const { initializeElurIonic } = await loadSetup();
        initializeElurIonic();
        const handle2 = initializeElurIonic();
        expect(handle2.initialized).toBe(false);
    });

    it("uses setAssetPath with empty string for inline mode", async () => {
        const { initializeElurIonic } = await loadSetup();
        initializeElurIonic({ icons: "inline" });
        expect(mockSetAssetPath).toHaveBeenCalledWith("");
    });

    it("uses setAssetPath with explicit path for assets mode", async () => {
        const { initializeElurIonic } = await loadSetup();
        initializeElurIonic({ icons: { mode: "assets", path: "/my/icons/" } });
        expect(mockSetAssetPath).toHaveBeenCalledWith("/my/icons/");
    });
});

describe("registerIonicComponents (incremental)", () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    async function loadSetup() {
        return await import("../setup.js");
    }

    it("registers components even after initializeElurIonic was called", async () => {
        const { initializeElurIonic, registerIonicComponents } = await loadSetup();
        initializeElurIonic();

        const extraDefiner = vi.fn(() => {
            if (!customElements.get("ion-button")) {
                customElements.define("ion-button", class extends HTMLElement { });
            }
        });

        // This MUST work — the old isInitialized flag would have blocked it.
        registerIonicComponents(extraDefiner);
        expect(extraDefiner).toHaveBeenCalled();
    });

    it("can be called multiple times with different definers", async () => {
        const { registerIonicComponents } = await loadSetup();
        const d1 = vi.fn(() => {
            if (!customElements.get("ion-datetime")) {
                customElements.define("ion-datetime", class extends HTMLElement { });
            }
        });
        const d2 = vi.fn(() => {
            if (!customElements.get("ion-modal")) {
                customElements.define("ion-modal", class extends HTMLElement { });
            }
        });

        registerIonicComponents(d1);
        registerIonicComponents(d2);
        expect(d1).toHaveBeenCalled();
        expect(d2).toHaveBeenCalled();
    });

    it("is idempotent — calling twice with same definer doesn't throw", async () => {
        const { registerIonicComponents } = await loadSetup();
        const d = vi.fn(() => {
            if (!customElements.get("ion-test-idem")) {
                customElements.define("ion-test-idem", class extends HTMLElement { });
            }
        });

        registerIonicComponents(d);
        // Second call — Ionic's definer guards internally, but we also catch.
        expect(() => registerIonicComponents(d)).not.toThrow();
    });
});

describe("registerIonicons (incremental)", () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    async function loadSetup() {
        return await import("../setup.js");
    }

    it("registers new icons after init", async () => {
        const { initializeElurIonic, registerIonicons } = await loadSetup();
        initializeElurIonic();

        registerIonicons({ home: "homeSvg", "home-outline": "homeOutlineSvg" });
        expect(mockAddIcons).toHaveBeenCalledWith(
            expect.objectContaining({
                home: "homeSvg",
                "home-outline": "homeOutlineSvg",
            }),
        );
    });

    it("warns on icon name collision but still overwrites", async () => {
        const { initializeElurIonic, registerIonicons } = await loadSetup();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => { });
        initializeElurIonic();

        // "arrow-back" is a default icon — registering again should warn.
        registerIonicons({ "arrow-back": "newArrowBack" });
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("arrow-back"),
        );
        expect(mockAddIcons).toHaveBeenCalledWith(
            expect.objectContaining({
                "arrow-back": "newArrowBack",
            }),
        );
        warn.mockRestore();
    });

    it("can be called multiple times with different icons", async () => {
        const { initializeElurIonic, registerIonicons } = await loadSetup();
        initializeElurIonic();

        registerIonicons({ star: "starSvg" });
        registerIonicons({ heart: "heartSvg" });

        expect(mockAddIcons).toHaveBeenCalledWith(expect.objectContaining({ star: "starSvg" }));
        expect(mockAddIcons).toHaveBeenCalledWith(expect.objectContaining({ heart: "heartSvg" }));
    });
});
