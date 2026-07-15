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
