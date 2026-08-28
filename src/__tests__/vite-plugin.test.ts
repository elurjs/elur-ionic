import { describe, it, expect, vi } from "vitest";
import { elurIonic, generateRegistrationModule } from "../vite-plugin.js";
import type { ElurIonicPluginOptions } from "../vite-plugin.js";
import { tagToSubpath, tagToDefinerName } from "../components/manifest.js";

// Helper: simulate the plugin's transform + load cycle
async function runPlugin(
    files: Record<string, string>,
    options: ElurIonicPluginOptions = {},
): Promise<string> {
    const plugin = elurIonic(options);
    const ctx = {
        warn: vi.fn(),
    };

    // Transform phase: scan all files
    for (const [id, code] of Object.entries(files)) {
        const result = (plugin.transform as any).call(ctx, code, id);
        // transform returns null (scan only), but accumulates state
        void result;
    }

    // BuildStart phase: emit final diagnostics
    if (plugin.buildStart) {
        (plugin.buildStart as any).call(ctx);
    }

    // Load phase: generate virtual module
    const resolvedId = (plugin.resolveId as any).call(ctx, "virtual:elur-ionic/registration");
    if (!resolvedId) return "";

    const loaded = (plugin.load as any).call(ctx, resolvedId);
    return typeof loaded === "string" ? loaded : "";
}

describe("elurIonic Vite plugin", () => {
    describe("tag scanning", () => {
        it("detects <ion-button> in html`` template", async () => {
            const code = `
                import { html } from "@elurjs/core";
                const tpl = html\`<ion-button>Click</ion-button>\`;
            `;
            const output = await runPlugin({ "/src/app.ts": code });
            expect(output).toContain("defineIonButton");
            expect(output).toContain("@elurjs/ionic/components/button");
        });

        it("detects multiple tags in one template", async () => {
            const code = `
                import { html } from "@elurjs/core";
                const tpl = html\`
                    <ion-header><ion-toolbar><ion-title>App</ion-title></ion-toolbar></ion-header>
                    <ion-content><ion-button>Go</ion-button></ion-content>
                \`;
            `;
            const output = await runPlugin({ "/src/app.ts": code });
            expect(output).toContain("defineIonHeader");
            expect(output).toContain("defineIonToolbar");
            expect(output).toContain("defineIonTitle");
            expect(output).toContain("defineIonContent");
            expect(output).toContain("defineIonButton");
        });

        it("detects tags across multiple files", async () => {
            const files = {
                "/src/page1.ts": `import { html } from "@elurjs/core"; const t = html\`<ion-button>A</ion-button>\`;`,
                "/src/page2.ts": `import { html } from "@elurjs/core"; const t = html\`<ion-card>B</ion-card>\`;`,
            };
            const output = await runPlugin(files);
            expect(output).toContain("defineIonButton");
            expect(output).toContain("defineIonCard");
        });

        it("ignores non-ion tags", async () => {
            const code = `
                import { html } from "@elurjs/core";
                const t = html\`<div><span>hello</span></div>\`;
            `;
            const output = await runPlugin({ "/src/app.ts": code });
            expect(output).not.toContain("defineIon");
        });

        it("ignores legacy tags (ion-router, ion-route)", async () => {
            const code = `
                import { html } from "@elurjs/core";
                const t = html\`<ion-router><ion-route></ion-route></ion-router>\`;
            `;
            const output = await runPlugin({ "/src/app.ts": code });
            expect(output).not.toContain("defineIonRouter");
            expect(output).not.toContain("defineIonRoute");
        });
    });

    describe("icon scanning", () => {
        it("detects static icon names", async () => {
            const code = `
                import { html } from "@elurjs/core";
                const t = html\`<ion-icon name="heart"></ion-icon>\`;
            `;
            const output = await runPlugin({ "/src/app.ts": code });
            expect(output).toContain("heart");
            expect(output).toContain("ionicons/icons");
        });

        it("detects multiple icons", async () => {
            const code = `
                import { html } from "@elurjs/core";
                const t = html\`
                    <ion-icon name="star"></ion-icon>
                    <ion-icon name="home-outline"></ion-icon>
                \`;
            `;
            const output = await runPlugin({ "/src/app.ts": code });
            expect(output).toContain("star");
            expect(output).toContain("home-outline");
        });
    });

    describe("dynamic detection", () => {
        it("warns on dynamic tags", async () => {
            const code = `
                import { html } from "@elurjs/core";
                const tag = "button";
                const t = html\`<ion-\${tag}>Click</ion-\${tag}>\`;
            `;
            const warn = vi.fn();
            const plugin = elurIonic({ diagnostics: true });
            (plugin.transform as any).call({ warn }, code, "/src/dynamic.ts");
            expect(warn).toHaveBeenCalled();
        });

        it("warns on dynamic icon names", async () => {
            const code = `
                import { html } from "@elurjs/core";
                const icon = "heart";
                const t = html\`<ion-icon name=\${icon}></ion-icon>\`;
            `;
            const warn = vi.fn();
            const plugin = elurIonic({ diagnostics: true });
            (plugin.transform as any).call({ warn }, code, "/src/dynamic.ts");
            expect(warn).toHaveBeenCalled();
        });

        it("suppresses warnings when diagnostics=false", async () => {
            const code = `
                import { html } from "@elurjs/core";
                const tag = "button";
                const t = html\`<ion-\${tag}>Click</ion-\${tag}>\`;
            `;
            const warn = vi.fn();
            const plugin = elurIonic({ diagnostics: false });
            (plugin.transform as any).call({ warn }, code, "/src/dynamic.ts");
            expect(warn).not.toHaveBeenCalled();
        });
    });

    describe("allowlists", () => {
        it("allowTags are included in registration even if not detected", async () => {
            const output = await runPlugin(
                { "/src/app.ts": `import { html } from "@elurjs/core"; const t = html\`<div>hi</div>\`;` },
                { allowTags: ["ion-button", "ion-card"] },
            );
            expect(output).toContain("defineIonButton");
            expect(output).toContain("defineIonCard");
        });

        it("allowIcons are included in registration even if not detected", async () => {
            const output = await runPlugin(
                { "/src/app.ts": `import { html } from "@elurjs/core"; const t = html\`<div>hi</div>\`;` },
                { allowIcons: ["star", "heart"] },
            );
            expect(output).toContain("star");
            expect(output).toContain("heart");
        });
    });

    describe("virtual module", () => {
        it("resolveId returns resolved path for virtual module", () => {
            const plugin = elurIonic();
            const result = (plugin.resolveId as any).call({}, "virtual:elur-ionic/registration");
            expect(result).toBe("\0virtual:elur-ionic/registration");
        });

        it("resolveId returns null for non-virtual ids", () => {
            const plugin = elurIonic();
            const result = (plugin.resolveId as any).call({}, "other-module");
            expect(result).toBeFalsy();
        });

        it("load returns empty export when autoRegister=false", async () => {
            const output = await runPlugin(
                { "/src/app.ts": `import { html } from "@elurjs/core"; const t = html\`<ion-button>A</ion-button>\`;` },
                { autoRegister: false },
            );
            expect(output).toContain("autoRegister disabled");
        });
    });

    describe("generateRegistrationModule", () => {
        it("generates valid import statements", () => {
            const output = generateRegistrationModule(
                new Set(["ion-button", "ion-card"]),
                new Set(["heart"]),
                {},
            );
            expect(output).toContain(`import { defineIonButton } from "@elurjs/ionic/components/button"`);
            expect(output).toContain(`import { defineIonCard } from "@elurjs/ionic/components/card"`);
            expect(output).toContain("ionicons/icons");
            expect(output).toContain("initializeElurIonic");
            expect(output).toContain("registerIonicComponents");
            expect(output).toContain("registerIonicons");
        });

        it("generates empty registration when no tags/icons", () => {
            const output = generateRegistrationModule(new Set(), new Set(), {});
            expect(output).toContain("initializeElurIonic");
            // No component/icon calls (only the import is present)
            expect(output).not.toMatch(/registerIonicComponents\(/);
            expect(output).not.toMatch(/registerIonicons\(/);
        });

        it("skips core tags that initializeElurIonic already registers", () => {
            const output = generateRegistrationModule(
                new Set(["ion-app", "ion-router-outlet", "ion-back-button", "ion-icon", "ion-button"]),
                new Set(),
                {},
            );
            // ion-button should generate an import
            expect(output).toContain(`import { defineIonButton } from "@elurjs/ionic/components/button"`);
            // Core tags should NOT generate imports
            expect(output).not.toContain("components/app");
            expect(output).not.toContain("components/router-outlet");
            expect(output).not.toContain("components/back-button");
            // ion-icon is handled by registerIonicons, not components
            expect(output).not.toMatch(/import.*components\/icon/);
        });
    });

    describe("manifest helpers", () => {
        it("tagToSubpath and tagToDefinerName are consistent", () => {
            expect(tagToSubpath("ion-action-sheet")).toBe("action-sheet");
            expect(tagToDefinerName("ion-action-sheet")).toBe("defineIonActionSheet");
        });
    });
});
