import { defineConfig } from "vite";
import { resolve } from "path";
import { readdirSync } from "fs";

// ── Library build configuration ───────────────────────────────────────────────
//
//   npm run build:lib
//
// Produces:
//   dist/lib/elur-ionic.js         — ES module  (primary)
//   dist/lib/elur-ionic.cjs        — CommonJS   (legacy Node.js / bundlers)
//   dist/lib/components.js        — Component barrel re-exports
//   dist/lib/components/manifest.js — Typed manifest
//   dist/lib/components/<name>.js — Direct subpath per component (tree-shakeable)
//   dist/lib/bundles/*.js         — Category bundles
//   dist/lib/tabs.js              — Bottom tab helpers
//   dist/lib/*.d.ts               — Type declarations (generated separately by tsc)

// Auto-discover individual component entry files
const componentFiles = readdirSync(resolve("src/components"))
    .filter((f) => f.endsWith(".ts") && f !== "manifest.ts")
    .map((f) => f.replace(/\.ts$/, ""));

export default defineConfig({
    // Do not copy the public/ folder into the library output
    publicDir: false,

    build: {
        outDir: "dist/lib",
        // vite clears the dir before building JS — tsc adds .d.ts files after
        emptyOutDir: true,
        sourcemap: true,

        lib: {
            entry: {
                "elur-ionic": resolve("src/index.ts"),
                "devtools": resolve("src/devtools.ts"),
                "components": resolve("src/components.ts"),
                "components/manifest": resolve("src/components/manifest.ts"),
                "bundles/layout": resolve("src/bundles/layout.ts"),
                "bundles/forms": resolve("src/bundles/forms.ts"),
                "bundles/lists": resolve("src/bundles/lists.ts"),
                "bundles/feedback": resolve("src/bundles/feedback.ts"),
                "bundles/buttons": resolve("src/bundles/buttons.ts"),
                "bundles/overlays": resolve("src/bundles/overlays.ts"),
                "bundles/navigation": resolve("src/bundles/navigation.ts"),
                "bundles/all": resolve("src/bundles/all.ts"),
                "tabs": resolve("src/tabs.ts"),
                "overlays": resolve("src/overlays.ts"),
                "vite-plugin": resolve("src/vite-plugin.ts"),
                "capacitor": resolve("src/capacitor.ts"),
                "page-state": resolve("src/page-state.ts"),
                "navigation": resolve("src/navigation.ts"),
                // Per-component direct subpaths
                ...Object.fromEntries(
                    componentFiles.map((name) => [
                        `components/${name}`,
                        resolve(`src/components/${name}.ts`),
                    ]),
                ),
            },
            formats: ["es", "cjs"],
            fileName: (format, entryName) =>
                format === "cjs" ? `${entryName}.cjs` : `${entryName}.js`,
        },

        rollupOptions: {
            // elur-ionic depends on elur, @ionic/core, and ionicons (all peer deps)
            external: ["@elurjs/core", /^@ionic\/core.*/, /^ionicons.*/],
            output: {
                // Preserve module structure for better tree-shaking in ES builds
                preserveModules: false,
                globals: {
                    "@elurjs/core": "ElurJs",
                },
            },
        },
    },
});
