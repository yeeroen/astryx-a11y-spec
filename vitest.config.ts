import { defineConfig } from 'vitest/config'

// The DOM-layer self-tests (*.jsdom.test.ts and the core tests), in jsdom as upstream runs them.
export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['src/**/*.test.ts'],
    },
})
