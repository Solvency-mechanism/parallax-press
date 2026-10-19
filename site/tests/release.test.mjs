import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEntry, renderPost, makeResolver } from '../src/lib/entry.ts';

const resolve = makeResolver([
  { data: { title: 'Published \"water\"', domain: 'The State', publish: true, aliases: ['Water alias'] }, filePath: 'notes/Water source.md' },
  { data: { title: 'Private draft', domain: 'Capital', publish: false } },
]);

test('public reading links preserve exact identities and never create dead anchors', () => {
  const { html } = renderPost('# Guide\n\n## Evidence\n\n[[Published \"water\"|Read the source]] [[Water alias]] [[Water source]] [[Private draft]] [[Unknown]]', resolve);
  assert.match(html, /<h2>Evidence<\/h2>/);
  assert.equal((html.match(/href="\/the-state\/published-water\/"/g) || []).length, 3);
  assert.doesNotMatch(html, /href="#"/);
  assert.doesNotMatch(html, /\[\[/);
  assert.match(html, /<span class="unpublished-reference">Private draft<\/span>/);
});

test('citations retain apostrophes, query strings, and literal source quotations', () => {
  const { html } = renderPost(`# Guide\n\n[Study](https://example.org/O'Brien?kind=air&year=2024)\n\n"Exact quotation"`, resolve);
  const destination = html.match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&').replaceAll('&#39;', "'");
  assert.equal(destination, "https://example.org/O'Brien?kind=air&year=2024");
  assert.match(html, /&quot;Exact quotation&quot;/);
});

test('reference sections, editorial comparison, sources, and related reading survive rendering', () => {
  const entry = parseEntry(`# Water

## What It Is
Definition [[Water alias]].
## Why It Matters
Consequence.
## How It Works in Practice
Mechanism.
## What They Say vs. What's True
**What they say:** "A claim."
**What's true:** Evidence [Source](https://example.org/study).
## Further Reading
- [Original paper](https://example.org/paper) - dated context.

---
**Related:** [[Water source]] · [[Private draft]]`, resolve);
  assert.match(entry.whatItIs, /Definition/);
  assert.match(entry.whyItMatters, /Consequence/);
  assert.match(entry.inPractice, /Mechanism/);
  assert.equal(entry.parallax.length, 1);
  assert.match(entry.parallax[0].truth, /https:\/\/example.org\/study/);
  assert.equal(entry.furtherReading.length, 1);
  assert.deepEqual(entry.related.map(r => r.title), ['Water source', 'Private draft']);
});

test('a reference without a domain fails instead of emitting a protocol-relative link', () => {
  assert.throws(() => makeResolver([{ data: { title: 'Orphan', publish: true } }]), /no domain/);
});

test('heading and block targets resolve to their note; string aliases are not split into characters', () => {
  const r = makeResolver([
    { data: { title: 'Air', domain: 'The State', publish: true, aliases: 'Valley air' } },
    { data: { title: 'Water', domain: 'The State', publish: true, aliases: 'Valley water' } },
  ]);
  assert.equal(r('Air#Sources'), '/the-state/air/');
  assert.equal(r('Water^block'), '/the-state/water/');
  assert.equal(r('Valley air'), '/the-state/air/');
  assert.equal(r('V'), null);
});

test('reference content outside the five rendered sections fails the build instead of vanishing', () => {
  const sections = '## What It Is\nA.\n## Why It Matters\nB.\n## How It Works in Practice\nC.\n## What They Say vs. What\'s True\n**What they say:** x\n**What\'s true:** y\n## Further Reading\n- z\n';
  assert.throws(() => parseEntry(`# T\n\nStray prose.\n\n${sections}`, resolve), /before its first section/);
  assert.throws(() => parseEntry(`# T\n\n${sections}## Timeline\nLost.\n`, resolve), /cannot render: timeline/);
  assert.doesNotThrow(() => parseEntry(`# T\n\n${sections}`, resolve));
});
