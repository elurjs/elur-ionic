/**
 * Bundle measurement script for @elurjs/ionic.
 *
 * Builds each fixture in bundle-fixture/ with Vite and measures:
 *   - Raw JS size
 *   - Gzip size
 *   - Brotli size
 *   - Number of chunks
 *
 * Validates tree-shaking by checking that minimal fixtures don't include
 * code from unused components.
 *
 * Usage:
 *   node scripts/measure-bundles.mjs
 *   npm run measure-bundles
 */
import { build, defineConfig } from "vite";
import { resolve, join } from "path";
import { readdirSync, statSync, existsSync, rmSync } from "fs";
import { gzipSync, brotliCompressSync } from "zlib";

const FIXTURES_DIR = resolve("bundle-fixture");
const OUT_DIR = resolve("dist/bundle-measure");

const fixtures = readdirSync(FIXTURES_DIR).filter(
    (name) => {
        const p = join(FIXTURES_DIR, name);
        return statSync(p).isDirectory() && existsSync(join(p, "entry.ts"));
    },
);

console.log(`\n📦 Measuring ${fixtures.length} bundle fixtures...\n`);

const results = [];

for (const fixture of fixtures) {
    const entryPath = join(FIXTURES_DIR, fixture, "entry.ts");
    const outPath = join(OUT_DIR, fixture);

    // Clean previous output
    if (existsSync(outPath)) rmSync(outPath, { recursive: true });

    const config = defineConfig({
        configFile: false,
        mode: "production",
        resolve: {
            alias: [
                // Map all subpath imports to local src
                { find: /^@deijose\/elur-ionic\/components\/manifest$/, replacement: resolve("src/components/manifest.ts") },
                { find: /^@deijose\/elur-ionic\/components\/(.+)$/, replacement: resolve("src/components/$1.ts") },
                { find: /^@deijose\/elur-ionic\/components$/, replacement: resolve("src/components.ts") },
                { find: /^@deijose\/elur-ionic\/bundles\/(.+)$/, replacement: resolve("src/bundles/$1.ts") },
                { find: /^@deijose\/elur-ionic\/overlays$/, replacement: resolve("src/overlays.ts") },
                { find: /^@deijose\/elur-ionic\/capacitor$/, replacement: resolve("src/capacitor.ts") },
                { find: /^@deijose\/elur-ionic\/vite-plugin$/, replacement: resolve("src/vite-plugin.ts") },
                { find: /^@deijose\/elur-ionic\/page-state$/, replacement: resolve("src/page-state.ts") },
                { find: /^@deijose\/elur-ionic\/navigation$/, replacement: resolve("src/navigation.ts") },
                { find: /^@deijose\/elur-ionic\/tabs$/, replacement: resolve("src/tabs.ts") },
                { find: /^@deijose\/elur-ionic$/, replacement: resolve("src/index.ts") },
            ],
        },
        build: {
            outDir: outPath,
            emptyOutDir: true,
            lib: {
                entry: { index: entryPath },
                formats: ["es"],
                fileName: () => `index.js`,
            },
            rollupOptions: {
                external: [
                    "@elurjs/core",
                    /^@ionic\/core.*/,
                    /^ionicons.*/,
                    /^@capacitor\//,
                ],
            },
            minify: true,
            sourcemap: false,
        },
        logLevel: "warn",
    });

    try {
        await build(config);

        // Measure output files
        const jsFiles = readdirSync(outPath).filter((f) => f.endsWith(".js"));
        let totalRaw = 0;
        let totalGzip = 0;
        let totalBrotli = 0;

        for (const jsFile of jsFiles) {
            const filePath = join(outPath, jsFile);
            const content = await import("fs").then((fs) => fs.readFileSync(filePath));
            const raw = content.length;
            const gzip = gzipSync(content).length;
            const brotli = brotliCompressSync(content).length;
            totalRaw += raw;
            totalGzip += gzip;
            totalBrotli += brotli;
        }

        results.push({
            fixture,
            chunks: jsFiles.length,
            raw: totalRaw,
            gzip: totalGzip,
            brotli: totalBrotli,
        });
    } catch (err) {
        console.error(`  ✘ ${fixture}: build failed — ${err.message}`);
        results.push({ fixture, error: err.message });
    }
}

// Print results table
console.log("\n┌──────────────────┬────────┬──────────┬──────────┬──────────┐");
console.log("│ Fixture          │ Chunks │ Raw (KB) │ Gzip KB  │ BrotliKB │");
console.log("├──────────────────┼────────┼──────────┼──────────┼──────────┤");

for (const r of results) {
    if (r.error) {
        console.log(`│ ${r.fixture.padEnd(16)} │ ${"ERR".padEnd(6)} │ ${"-".padEnd(8)} │ ${"-".padEnd(8)} │ ${"-".padEnd(8)} │`);
    } else {
        const rawKB = (r.raw / 1024).toFixed(2).padStart(6);
        const gzipKB = (r.gzip / 1024).toFixed(2).padStart(6);
        const brotliKB = (r.brotli / 1024).toFixed(2).padStart(6);
        const chunks = String(r.chunks).padEnd(6);
        const name = r.fixture.padEnd(16);
        console.log(`│ ${name} │ ${chunks} │ ${rawKB}   │ ${gzipKB}   │ ${brotliKB}   │`);
    }
}
console.log("└──────────────────┴────────┴──────────┴──────────┴──────────┘");

// Tree-shaking validation
console.log("\n🔍 Tree-shaking validation:\n");

const minimal = results.find((r) => r.fixture === "minimal");
const full = results.find((r) => r.fixture === "full");
const capacitorOnly = results.find((r) => r.fixture === "capacitor-only");

if (minimal && full && !minimal.error && !full.error) {
    const ratio = (minimal.gzip / full.gzip * 100).toFixed(1);
    console.log(`  minimal vs full: ${ratio}% of full bundle size (gzip)`);
    if (minimal.gzip < full.gzip) {
        console.log("  ✓ Minimal fixture is smaller than full — tree-shaking works");
    } else {
        console.log("  ✘ WARNING: minimal fixture is not smaller than full");
    }
}

if (capacitorOnly && !capacitorOnly.error) {
    console.log(`  capacitor-only: ${capacitorOnly.gzip} bytes (gzip) — should be near-zero`);
    if (capacitorOnly.gzip < 1024) {
        console.log("  ✓ Capacitor subpath adds negligible weight to web bundle");
    } else {
        console.log("  ✘ WARNING: Capacitor subpath bundle is larger than expected");
    }
}

console.log("\n✅ Done.\n");
