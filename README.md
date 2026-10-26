# astryx-a11y-spec (unofficial fork)

> **This is a fork, not Astryx.** It packages [Astryx](https://github.com/facebook/astryx)'s internal
> accessibility spec-test contracts, `internal/a11y-spec`, so projects outside the Astryx monorepo can use them.
> Astryx keeps that package internal and unpublished. This repository is **not affiliated with, maintained by or
> endorsed by Meta** or the Astryx team. The code is Meta's, under the MIT licence (`LICENSE`); every source file
> keeps its `Copyright (c) Meta Platforms, Inc. and affiliates.` header. Report problems with the contracts
> themselves upstream; report packaging problems here.

| | |
|---|---|
| Upstream | [`facebook/astryx`](https://github.com/facebook/astryx) → [`internal/a11y-spec`](https://github.com/facebook/astryx/tree/main/internal/a11y-spec) |
| Synced commit | see [`UPSTREAM.json`](UPSTREAM.json) |
| Upstream docs | [`upstream/README.md`](upstream/README.md) (verbatim), and Astryx's specs `docs/specs/AST-020` and `AST-021` |
| Package | [`@yeeroen/astryx-a11y-spec`](https://www.npmjs.com/package/@yeeroen/astryx-a11y-spec) on npm, with provenance |

## What it is

Reusable accessibility contracts: one per WAI-ARIA pattern (button, checkbox, switch, radio group, text input,
modal dialog, alert dialog, status message, tabs, listbox, combobox, menu button, menu, toolbar, tooltip,
disclosure, accordion, breadcrumb, landmark, link, slider, spinbutton, progressbar, tree view, grid, carousel,
window splitter, …), each expectation traced to its WCAG or APG source and to the evidence layer that can observe
it (DOM, accessibility tree, real browser). A component **binds** a contract: it lists its states and what each
claims to be, and the contract asks a real browser what it actually exposes. See `upstream/README.md` for the model.

Entry points:

| Import | What |
|---|---|
| `@yeeroen/astryx-a11y-spec` | the contracts (`BUTTON_PATTERN`, `SWITCH_PATTERN`, …), `checkAccessibilitySpec`, `expectAccessibilitySpec`, reports |
| `@yeeroen/astryx-a11y-spec/chromium` | the Chromium harness (`createChromiumHarness`, `holdMotionStill`), for Playwright |
| `@yeeroen/astryx-a11y-spec/jsdom` | the DOM-only harness |
| `@yeeroen/astryx-a11y-spec/storybook` | `serveStorybook(dir)`, a static server over a built Storybook; pass `dir`, the default is Astryx's path |

## Install

```bash
pnpm add -D @yeeroen/astryx-a11y-spec
pnpm add -D @playwright/test   # peer, for the Chromium harness
```

The package ships a bundled build (`dist/`, ESM with types) because the upstream sources import without file
extensions, and Node won't run TypeScript from `node_modules`. The original sources are in `src/` too.

## How it differs from upstream

**`src/` is upstream's, byte for byte.** Nothing in it is edited here; a sync replaces it. What this repository adds:

- `package.json`, `tsconfig.json` (Astryx's root options without React), `tsdown.config.ts` (the build),
  `vitest.config.ts` and `playwright.config.ts` (how upstream runs the self-tests, standalone);
- the test tools pinned to the exact versions Astryx locks (`@playwright/test`, `jsdom`, `vitest`, `typescript`), so
  the self-proofs behave as they do upstream (a newer Chromium, for one, stops exposing a progressbar's
  `aria-valuetext`, which the progressbar fixtures expect);
- `upstream/` (the package's own README, `package.json` and `tsconfig.json`, verbatim) and `UPSTREAM.json`;
- `scripts/sync.mjs` and the workflows below.

## Staying in sync

- **`pnpm sync [<commit>]`** replaces `src/` and `upstream/` with `internal/a11y-spec` at a commit (default:
  Astryx's `main`), records it in `UPSTREAM.json` and writes `.sync/summary.md`: the upstream commits that touched
  the package since the last sync, and any test tool Astryx now pins differently.
- **`sync.yml`** runs it every Monday (and by hand with a commit). When something changed, it bumps the minor
  version, runs the type check, the DOM tests, the build and the Chromium self-proofs, and opens a PR with the
  summary and the results. Review the upstream commits, match any changed tool pin, merge.
- **`release.yml`**: a push to `main` with an unpublished version publishes it to npm through trusted publishing
  (OIDC from this workflow, no token stored, provenance attached) and as the GitHub Release `v<version>`.

Because `src/` is never edited here, a sync can't conflict. A fix to a contract goes upstream first; if it can't
wait, carry it as a patch in the consuming project (`pnpm patch`) rather than in `src/`.

## Development

```bash
pnpm install
pnpm exec playwright install chromium
pnpm typecheck && pnpm test && pnpm build && pnpm test:chromium
```

`pnpm test` runs the contracts' DOM-layer self-tests in jsdom; `pnpm test:chromium` runs each contract against its
conforming and violating fixtures in Chromium.
