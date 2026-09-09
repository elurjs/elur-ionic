import { defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";
import { resolve } from "path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    plugins: [
        dts({
            tsconfigPath: "./tsconfig.lib.json",
            rollupTypes: true,
            insertTypesEntry: true,
        }),
    ],

    build: {
        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "ElurIonic",
            fileName: "index",
            formats: ["es", "cjs"],
        },
        rollupOptions: {
            external: ["@elurjs/core"],
            output: {
                globals: {
                    "@elurjs/core": "ElurJs",
                },
            },
        },
        // No minificar: la lib la bundlea el proyecto del usuario
        minify: false,
        sourcemap: true,
    },
    test: {
        environment: "happy-dom",
        globals: true,
        setupFiles: ["./src/__tests__/setup.ts"],
        exclude: ["node_modules/**", "e2e/**", "dist/**"],
        coverage: {
            provider: "v8",
            reporter: ["text", "text-summary", "lcov", "html"],
            include: ["src/**/*.ts"],
            exclude: [
                "src/**/*.d.ts",
                "src/__tests__/**",
                "src/**/__tests__/**",
            ],
        },
    },
});