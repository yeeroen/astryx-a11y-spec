import { defineConfig } from 'tsdown'

// The upstream sources import without file extensions, which Node's ESM can't resolve, and Node
// won't run TypeScript from node_modules: the package ships a bundled build of each entry.
export default defineConfig({
    entry: {
        index: 'src/index.ts',
        'harness/chromium': 'src/harness/chromium.ts',
        'harness/jsdom': 'src/harness/jsdom.ts',
        storybook: 'src/storybook.ts',
    },
    format: 'esm',
    platform: 'node',
    target: 'node22',
    dts: true,
    clean: true,
    external: ['@playwright/test'],
})
