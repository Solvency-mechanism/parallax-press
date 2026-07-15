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
