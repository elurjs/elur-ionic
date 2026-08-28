import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config for elur-ionic.
 *
 * Tests run against a Vite dev server serving a real app with @ionic/core
 * installed (no mocks). The server starts on port 5174.
 */
export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false, // Ionic transitions need sequential execution
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1, // Single worker — shared DOM state
    reporter: process.env.CI ? "github" : "list",
    timeout: 30000,
    expect: {
        timeout: 10000,
    },
    use: {
        baseURL: "http://localhost:5174",
        trace: "on-first-retry",
        // Mobile viewport for realistic testing
        viewport: { width: 390, height: 844 },
        // Force reduced motion to avoid animation timing issues
        // (set via context options since `reducedMotion` is not in UseOptions)
        launchOptions: {
            args: ["--force-prefers-reduced-motion"],
        },
    },
    projects: [
        {
            name: "chromium-mobile",
            use: {
                ...devices["Desktop Chrome"],
                viewport: { width: 390, height: 844 },
                isMobile: true,
                hasTouch: true,
            },
        },
    ],
    webServer: {
        command: "npm run e2e:serve",
        url: "http://localhost:5174/e2e/",
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
    },
});
