import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const tool = fileURLToPath(new URL('./scrub-emdashes.mjs', import.meta.url));

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

test('rejects mutually exclusive modes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'emdash-'));
  const file = join(dir, 'sample.md');
  writeFileSync(file, 'alpha—beta\n', 'utf8');
  try {
    const run = spawnSync(process.execPath, [tool, file, '--write', '--check'], { encoding: 'utf8' });
    assert.equal(run.status, 2);
    assert.match(run.stderr, /mutually exclusive/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
