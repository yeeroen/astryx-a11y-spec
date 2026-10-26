#!/usr/bin/env node
// Brings the fork up to date with Astryx: replaces src/ and upstream/ with internal/a11y-spec at a
// given commit (default: the head of facebook/astryx main), records it in UPSTREAM.json and writes
// .sync/summary.md (the upstream commits that touched the package, and changed dev dependencies)
// for the sync PR. src/ is never edited by hand, so a sync is a plain replacement.
//
//   node scripts/sync.mjs [<commit>]

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const recorded = JSON.parse(readFileSync(join(root, 'UPSTREAM.json'), 'utf8'))
const { repository, path } = recorded
const url = `https://github.com/${repository}.git`
const run = (command, args, options = {}) =>
    execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...options }).trim()

const requested =
    process.argv[2] ?? run('git', ['ls-remote', url, 'refs/heads/main']).split(/\s+/)[0]
if (!/^[0-9a-f]{7,40}$/.test(requested)) throw new Error(`Not a commit: ${requested}`)
// A fetch needs the full SHA.
const target =
    requested.length === 40
        ? requested
        : run('gh', ['api', `repos/${repository}/commits/${requested}`, '--jq', '.sha'])

const work = join(root, '.sync')
const clone = join(work, 'astryx')
rmSync(work, { recursive: true, force: true })
mkdirSync(work, { recursive: true })
run('git', ['init', '-q', clone])
run('git', ['-C', clone, 'remote', 'add', 'origin', url])
run('git', ['-C', clone, 'sparse-checkout', 'set', '--no-cone', `/${path}/`, '/LICENSE', '/package.json'])
run('git', ['-C', clone, 'fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', target])
run('git', ['-C', clone, 'checkout', '-q', 'FETCH_HEAD'])
const commit = run('git', ['-C', clone, 'rev-parse', 'HEAD'])
const source = join(clone, path)
if (!existsSync(join(source, 'src', 'index.ts'))) throw new Error(`${path} has no src/index.ts at ${commit}`)

rmSync(join(root, 'src'), { recursive: true, force: true })
cpSync(join(source, 'src'), join(root, 'src'), { recursive: true })
for (const file of ['README.md', 'package.json', 'tsconfig.json']) {
    cpSync(join(source, file), join(root, 'upstream', file))
}
cpSync(join(clone, 'LICENSE'), join(root, 'LICENSE'))

writeFileSync(
    join(root, 'UPSTREAM.json'),
    `${JSON.stringify({ ...recorded, commit, syncedAt: new Date().toISOString().slice(0, 10) }, null, 4)}\n`,
)

// The upstream commits that touched the package since the last sync, from GitHub's API (the clone
// is shallow): the package's history after the recorded commit's date. Needs `gh`.
let commits = []
try {
    const since = run('gh', ['api', `repos/${repository}/commits/${recorded.commit}`, '--jq', '.commit.committer.date'])
    const listed = JSON.parse(
        run('gh', ['api', `repos/${repository}/commits?path=${path}&sha=${commit}&since=${since}&per_page=100`]),
    )
    commits = listed
        .filter((entry) => !entry.sha.startsWith(recorded.commit))
        .map((entry) => `- [\`${entry.sha.slice(0, 7)}\`](https://github.com/${repository}/commit/${entry.sha}) ${entry.commit.message.split('\n')[0]}`)
} catch {
    commits = [`- (gh unavailable) https://github.com/${repository}/compare/${recorded.commit}...${commit}`]
}

// Upstream pins the tools the self-proofs run on in its root package.json; the fork pins the same.
const ours = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).devDependencies
const theirs = JSON.parse(readFileSync(join(clone, 'package.json'), 'utf8')).devDependencies ?? {}
const dependencies = ['@playwright/test', 'jsdom', 'typescript', 'vitest']
    .filter((name) => theirs[name] && theirs[name].replace(/^[\^~]/, '') !== ours[name])
    .map((name) => `- \`${name}\`: upstream \`${theirs[name]}\`, ours \`${ours[name]}\``)

const summary = [
    `Syncs \`${path}\` from [${repository}](https://github.com/${repository}) \`${recorded.commit.slice(0, 7)}\` → \`${commit.slice(0, 7)}\`.`,
    '',
    '### Upstream commits touching the package',
    '',
    ...(commits.length ? commits : ['- none (only the recorded commit moved)']),
    '',
    '### Test tools upstream pins differently',
    '',
    ...(dependencies.length
        ? [...dependencies, '', 'Match them in `package.json` (upstream locks the exact versions in its pnpm-lock.yaml) and re-run the self-proofs.']
        : ['- none']),
    '',
]
writeFileSync(join(work, 'summary.md'), summary.join('\n'))
console.log(summary.join('\n'))
