# Deterministic Em-Dash Scrubber Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and run a deterministic command that replaces user-visible Unicode em dashes with ASCII hyphens while preserving Obsidian wikilink targets and protected Markdown structures.

**Architecture:** A dependency-free Node ESM module owns both the pure Markdown transform and the filesystem CLI. Markdown is processed line by line so fenced code remains untouched; inline code, URLs, Markdown link destinations, and wikilink targets are protected before visible text is replaced. The existing Astro generator then republishes the cleaned source, and independent checks compare wikilink targets and scan visible generated HTML.

**Tech Stack:** Node.js ESM, `node:test`, Astro 5, Obsidian Markdown, PowerShell verification commands.

## Global Constraints

- Replace only Unicode em dash `U+2014` with ASCII hyphen-minus `U+002D`.
- Preserve all surrounding whitespace exactly.
- Do not change en dashes.
- Do not rename files or directories.
- Preserve wikilink targets byte-for-byte.
- Do not alter fenced code, inline code, raw URLs, or Markdown link destinations.
- Require explicit input paths; never default to the vault root.
- Do not push or deploy externally.

## File Map

- Create `tools/scrub-emdashes.mjs`: pure transforms, file discovery, CLI modes, and target extraction.
- Create `tools/scrub-emdashes.test.mjs`: unit and real-filesystem CLI coverage using `node:test`.
- Create `tools/README.md`: command syntax, safety rules, and Parallax usage.
- Modify `site/package.json`: test, dry-run, write, and check scripts for the approved Parallax source set.
- Modify the published CKP source and any Parallax chrome files only by running the new tool.
- Regenerate root static HTML through the existing `site` deploy pipeline.

---

### Task 1: Establish the test harness and literal transform

**Files:**
- Create: `tools/scrub-emdashes.test.mjs`
- Create: `tools/scrub-emdashes.mjs`

**Interfaces:**
- Produces: `replaceEmDashes(text: string): string`
- Produces CLI dry run: `node tools/scrub-emdashes.mjs <paths...>`

- [ ] **Step 1: Write the first failing CLI test**

Create `tools/scrub-emdashes.test.mjs` with a temporary Markdown file containing an actual `U+2014`, spawn the not-yet-created CLI, and assert a successful dry-run report without a file write:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const tool = resolve('tools/scrub-emdashes.mjs');

test('dry run reports a replaceable em dash without writing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'emdash-'));
  const file = join(dir, 'sample.md');
  writeFileSync(file, 'alpha—beta\n', 'utf8');
  try {
    const run = spawnSync(process.execPath, [tool, file], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /1 replacement/);
    assert.equal(readFileSync(file, 'utf8'), 'alpha—beta\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the test and observe the expected failure**

Run: `node --test tools/scrub-emdashes.test.mjs`

Expected: FAIL because `tools/scrub-emdashes.mjs` does not exist and the spawned process exits nonzero.

- [ ] **Step 3: Implement the minimum literal dry-run command**

Create `tools/scrub-emdashes.mjs` with `EM_DASH`, `replaceEmDashes()`, explicit path validation, UTF-8 file reading, replacement counting, and a dry-run report. Use `pathToFileURL(resolve(process.argv[1])).href === import.meta.url` for direct-execution detection.

```js
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const EM_DASH = '\u2014';
export const replaceEmDashes = (text) => text.replaceAll(EM_DASH, '-');

function replacementCount(before, after) {
  return [...before].filter((char) => char === EM_DASH).length
    - [...after].filter((char) => char === EM_DASH).length;
}

function main(args) {
  if (args.length === 0) {
    console.error('Usage: node tools/scrub-emdashes.mjs <paths...> [--write|--check]');
    return 2;
  }
  for (const input of args) {
    const before = readFileSync(resolve(input), 'utf8');
    const after = replaceEmDashes(before);
    const count = replacementCount(before, after);
    console.log(`${input}: ${count} replacement${count === 1 ? '' : 's'}`);
  }
  return 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
```

- [ ] **Step 4: Run the test and observe it passing**

Run: `node --test tools/scrub-emdashes.test.mjs`

Expected: 1 test passes, 0 fails.

- [ ] **Step 5: Commit the first vertical slice**

```powershell
git add -- tools/scrub-emdashes.mjs tools/scrub-emdashes.test.mjs
git commit -m "feat: add deterministic em-dash dry run"
```

---

### Task 2: Make the transform Markdown-aware and wikilink-safe

**Files:**
- Modify: `tools/scrub-emdashes.test.mjs`
- Modify: `tools/scrub-emdashes.mjs`

**Interfaces:**
- Consumes: `replaceEmDashes(text: string): string`
- Produces: `scrubMarkdown(markdown: string): string`
- Produces: `extractWikilinkTargets(markdown: string): string[]`

- [ ] **Step 1: Add failing pure-transform tests**

Append tests that dynamically import `scrubMarkdown` and `extractWikilinkTargets`, then assert:

```js
test('scrubs visible Markdown while preserving protected structures', async () => {
  const { scrubMarkdown } = await import('./scrub-emdashes.mjs');
  const input = [
    'plain—text and spaced — text and range 1999–2001',
    '`code—value`',
    '```js',
    'const value = "keep—this";',
    '```',
    '[label—text](https://example.com/a—b)',
    'https://example.com/raw—a',
  ].join('\n');
  const output = scrubMarkdown(input);
  assert.match(output, /plain-text and spaced - text and range 1999–2001/);
  assert.match(output, /`code—value`/);
  assert.match(output, /keep—this/);
  assert.match(output, /\[label-text\]\(https:\/\/example\.com\/a—b\)/);
  assert.match(output, /https:\/\/example\.com\/raw—a/);
});

test('preserves wikilink targets and cleans their visible labels', async () => {
  const { scrubMarkdown, extractWikilinkTargets } = await import('./scrub-emdashes.mjs');
  const input = '[[Target—Topic]] and [[Other—Target|Visible—Label]]';
  const output = scrubMarkdown(input);
  assert.equal(output, '[[Target—Topic|Target-Topic]] and [[Other—Target|Visible-Label]]');
  assert.deepEqual(extractWikilinkTargets(output), extractWikilinkTargets(input));
});
```

- [ ] **Step 2: Run the tests and observe the expected export failure**

Run: `node --test tools/scrub-emdashes.test.mjs`

Expected: FAIL because `scrubMarkdown` and `extractWikilinkTargets` are not exported.

- [ ] **Step 3: Implement protected-token and fenced-code handling**

Add these focused functions and change Markdown files to use `scrubMarkdown()`:

```js
function scrubWikilink(match, target, alias) {
  if (alias !== undefined) return `[[${target}|${replaceEmDashes(alias)}]]`;
  return target.includes(EM_DASH)
    ? `[[${target}|${replaceEmDashes(target)}]]`
    : match;
}

function scrubMarkdownLine(line) {
  const tokens = [];
  const protect = (value) => {
    const token = `\u0000${tokens.length}\u0000`;
    tokens.push(value);
    return token;
  };
  let visible = line.replace(/`+[^`]*`+/g, protect);
  visible = visible.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (match, target, alias) => protect(scrubWikilink(match, target, alias)));
  visible = visible.replace(/\[([^\]]*)\]\(([^)]+)\)/g,
    (_match, label, destination) => protect(`[${replaceEmDashes(label)}](${destination})`));
  visible = visible.replace(/https?:\/\/[^\s<>)\]]+/g, protect);
  visible = replaceEmDashes(visible);
  return visible.replace(/\u0000(\d+)\u0000/g, (_match, index) => tokens[Number(index)]);
}

export function scrubMarkdown(markdown) {
  let fence = null;
  return markdown.split(/(\r?\n)/).map((part) => {
    if (/^\r?\n$/.test(part)) return part;
    const marker = part.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (marker[1][0] === fence) fence = null;
      return part;
    }
    return fence ? part : scrubMarkdownLine(part);
  }).join('');
}

export function extractWikilinkTargets(markdown) {
  return [...markdown.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)].map((match) => match[1]);
}
```

- [ ] **Step 4: Run the tests and observe all tests passing**

Run: `node --test tools/scrub-emdashes.test.mjs`

Expected: 3 tests pass, 0 fail.

- [ ] **Step 5: Commit Markdown safety**

```powershell
git add -- tools/scrub-emdashes.mjs tools/scrub-emdashes.test.mjs
git commit -m "feat: preserve wikilinks during em-dash scrubbing"
```

---

### Task 3: Complete recursive CLI modes and project scripts

**Files:**
- Modify: `tools/scrub-emdashes.test.mjs`
- Modify: `tools/scrub-emdashes.mjs`
- Create: `tools/README.md`
- Modify: `site/package.json`

**Interfaces:**
- Produces: `collectFiles(paths: string[]): string[]`
- Produces: `processFiles(paths: string[], options: { write?: boolean, check?: boolean }): Result[]`
- CLI modes: dry-run, `--write`, `--check`

- [ ] **Step 1: Add failing filesystem and mode tests**

Add tests that create nested `.md` and `.astro` fixtures, verify recursive discovery, verify `--write` changes only supported files, and verify `--check` exits 1 before cleaning and 0 after cleaning. Also assert that supplying both `--write` and `--check` exits 2.

```js
test('write and check modes operate recursively on supported files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'emdash-'));
  const nested = join(dir, 'nested');
  mkdirSync(nested);
  const markdown = join(dir, 'entry.md');
  const astro = join(nested, 'page.astro');
  const ignored = join(nested, 'data.bin');
  writeFileSync(markdown, 'alpha—beta\n', 'utf8');
  writeFileSync(astro, '<p>gamma—delta</p>\n', 'utf8');
  writeFileSync(ignored, 'keep—binary\n', 'utf8');
  try {
    const dirty = spawnSync(process.execPath, [tool, dir, '--check'], { encoding: 'utf8' });
    assert.equal(dirty.status, 1);
    const write = spawnSync(process.execPath, [tool, dir, '--write'], { encoding: 'utf8' });
    assert.equal(write.status, 0, write.stderr);
    assert.equal(readFileSync(markdown, 'utf8'), 'alpha-beta\n');
    assert.equal(readFileSync(astro, 'utf8'), '<p>gamma-delta</p>\n');
    assert.equal(readFileSync(ignored, 'utf8'), 'keep—binary\n');
    const clean = spawnSync(process.execPath, [tool, dir, '--check'], { encoding: 'utf8' });
    assert.equal(clean.status, 0, clean.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the tests and observe the expected mode failure**

Run: `node --test tools/scrub-emdashes.test.mjs`

Expected: FAIL because directory recursion and `--write`/`--check` are not implemented.

- [ ] **Step 3: Implement recursive discovery and modes**

Use `readdirSync(..., { withFileTypes: true })`, a supported-extension set of `.md`, `.astro`, `.css`, `.js`, `.mjs`, and `.html`, sorted unique absolute paths, `scrubMarkdown()` for `.md`, and `replaceEmDashes()` for approved site source types. `--write` uses `writeFileSync`; `--check` returns 1 when the total eligible replacement count is nonzero. Reject missing paths and mutually exclusive modes with exit code 2.

- [ ] **Step 4: Add reproducible package scripts and documentation**

Add scripts to `site/package.json`:

```json
"test:scrub": "node --test ../tools/scrub-emdashes.test.mjs",
"scrub": "node ../tools/scrub-emdashes.mjs \"../../Case Studies/Rural California Political Economy/The Bill Comes Due in the Body — Health and Environmental Costs in the San Joaquin Valley.md\" src/pages src/layouts ../assets",
"scrub:write": "npm run scrub -- --write",
"scrub:check": "npm run scrub -- --check"
```

Document the three CLI modes, explicit-path rule, protected structures, and the Parallax package scripts in `tools/README.md`.

- [ ] **Step 5: Run the focused and existing checks**

Run:

```powershell
node --test tools/scrub-emdashes.test.mjs
Push-Location site
npm.cmd run check
Pop-Location
```

Expected: all scrubber tests pass and all existing site checks print PASS.

- [ ] **Step 6: Commit the completed command**

```powershell
git add -- tools/scrub-emdashes.mjs tools/scrub-emdashes.test.mjs tools/README.md site/package.json
git commit -m "feat: add reusable em-dash scrubber command"
```

---

### Task 4: Apply the scrubber and verify the vault and generated site

**Files:**
- Modify: the published CKP source named in `site/src/content.config.ts`
- Process and modify only when replacements are reported: `site/src/pages/**`, `site/src/layouts/**`, `assets/*.css`, `assets/controls.js`
- Regenerate: root published HTML and synced assets through `npm run deploy`

**Interfaces:**
- Consumes: `npm run scrub`, `npm run scrub:write`, `npm run scrub:check`
- Produces: dash-clean visible Parallax output with unchanged wikilink targets

- [ ] **Step 1: Capture the pre-write wikilink targets and dry-run report**

Use a Node one-liner importing `extractWikilinkTargets()` to serialize the published source target list to a temporary file outside the repository, then run `npm.cmd run scrub` from `site` and inspect every reported file and count.

- [ ] **Step 2: Apply the approved source transformation**

Run from `site`:

```powershell
npm.cmd run scrub:write
npm.cmd run scrub:check
```

Expected: write mode reports replacements; check mode reports zero eligible em dashes and exits 0.

- [ ] **Step 3: Assert wikilink target identity**

Extract the post-write target list with the same `extractWikilinkTargets()` function and compare it byte-for-byte with the pre-write list.

Expected: exact match. Also run a repository search over the changed source to confirm all newly created aliases contain hyphens while their targets retain original title punctuation.

- [ ] **Step 4: Regenerate and check the local static site**

Run from `site`:

```powershell
npm.cmd run deploy
```

Expected: Astro build succeeds, generated files publish to the repository root, and every existing check prints PASS.

- [ ] **Step 5: Scan visible generated HTML and inspect the diff**

Strip `script` and `style` blocks plus HTML tags from `index.html`, `press/index.html`, and the published article, then assert no visible `U+2014` remains. Run `git diff --check`, `git status --short`, and `git diff --name-status`; confirm no rename status and no unrelated paths.

- [ ] **Step 6: Run the full verification set again**

```powershell
node --test tools/scrub-emdashes.test.mjs
Push-Location site
npm.cmd run scrub:check
npm.cmd run check
Pop-Location
git diff --check
```

Expected: all tests and checks pass, the scrub check exits 0, and the diff check emits no errors.

- [ ] **Step 7: Commit tracked generated and source changes**

Stage only the Parallax repository files changed by generation and the tool. The CKP source lives outside the nested Parallax git repository, so report it separately rather than attempting to stage it in this repository.

```powershell
git add -- assets index.html press site tools
git commit -m "content: replace published em dashes with hyphens"
```

Do not push. Finish with `git status -sb` and report the commits plus the external CKP source path changed.
