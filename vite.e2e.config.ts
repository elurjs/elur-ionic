import { defineConfig } from "vite";
import { resolve } from "path";

/**
 * Vite config for E2E test server.
 * Serves the e2e/ app with real @ionic/core.
 * Uses project root so src/ imports work.
 */
export default defineConfig({
    root: resolve(__dirname),
    server: {
        port: 5174,
        strictPort: true,
    },
    resolve: {
        alias: {
            "@elurjs/ionic": resolve(__dirname, "src/index.ts"),
        },
    },
    optimizeDeps: {
        include: ["@ionic/core", "ionicons"],
    },
    build: {
        rollupOptions: {
            input: resolve(__dirname, "e2e/index.html"),
        },
    },
});
