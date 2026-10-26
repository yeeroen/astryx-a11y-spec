import { defineConfig, devices } from '@playwright/test'

// Each contract's Chromium self-proof: every expectation passes against its conforming fixtures
// and fails against each violating one. Upstream runs these from its root playwright.config.ts.
const ci = (process.env.CI ?? '') !== ''

export default defineConfig({
    testDir: 'src',
    testMatch: '**/*.chromium.spec.ts',
    workers: 1,
    fullyParallel: false,
    timeout: 60_000,
    forbidOnly: ci,
    reporter: ci ? [['list'], ['github']] : [['list']],
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
