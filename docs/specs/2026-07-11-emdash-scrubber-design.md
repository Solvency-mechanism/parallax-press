# Design Spec: Em-Dash Scrubber

**Date:** 2026-07-11
**Status:** Awaiting review
**Depends on:** nothing. Ships independently of the redesign, but shares the site repo.

> This document contains no em-dashes or en-dashes. It is its own smoke test.

## Problem

Sterling wants every em-dash removed from CKP copy and content. Two facts make this more than a find-and-replace:

1. **Removal must read grammatically.** An em-dash often marks a clause boundary. Deleting it, or blindly swapping a comma, can produce a comma splice, a run-on, or a dangling fragment. When a dash is "part of an article sentence," the sentence must be rewritten so it still reads correctly.
2. **Em-dashes live in two places:** authored article content (CKP markdown notes pulled into the build) and site chrome copy (strings in `.astro`, `.css` comments, `.js`, taglines). Both need scrubbing.

The build pipeline already exposes a text-transform seam: `smart()` in `site/src/lib/entry.ts` applies typography and today explicitly leaves em-dashes intact. That is the natural build-time integration point.

## Goals

1. Guarantee the PUBLISHED site contains zero em-dashes and en-dashes in prose.
2. Rewrite article sentences that contain a dash so they remain grammatical, not just dash-free.
3. Never silently mutate authored prose: source rewrites are human-in-the-loop (diff, then approve).
4. Ship as a reusable module usable across the vault, with a git hook as the primary trigger.

## Non-Goals

- Not a general typography linter. Scope is em-dashes and en-dashes in prose. Hyphens stay.
- Not a vault-wide forced rewrite. The default target is the site's content and chrome; it is pointable at any markdown folder, but it does not sweep the whole Rhizome unprompted.
- No new external service dependency beyond the vault's existing Venice API integration (`Meta/Venice API/`), and it degrades gracefully when no API key is present.

## Design: two tiers, two modes, one hook

### The engine module

`tools/scrub-emdashes.mjs` in the `parallax-press-live` repo (Node ESM, matching the Astro toolchain). Pure functions plus a CLI wrapper. Two tiers of transformation:

**Tier 1: deterministic typographic pass.** Handles unambiguous cases by rule, no network:
- Em/en-dash used as a hyphen inside a compound (`cost` dash `benefit`) becomes a hyphen.
- Numeric range (`1995` dash `2005`) becomes `1995 to 2005` (dashes gone, per the requirement).
- A spaced em-dash parenthetical that maps cleanly to a comma pair or a single comma is rewritten deterministically only when the surrounding tokens make a comma unambiguously correct (for example, a trailing dash before the final clause becomes a comma).
- Everything Tier 1 cannot prove safe is flagged as "hard" and left for Tier 2.

**Tier 2: LLM rewrite pass.** For clause-boundary dashes where a comma would splice or the correct replacement is ambiguous. The scrubber isolates the single sentence containing the dash and sends it to Venice/Kimi (per `Meta/Venice API/CLAUDE.md`: cheap, bulk, already wired via `kimi_vault_tools.py` / `venice_kimi.py`) with a tight instruction:

> Rewrite this sentence to remove the em-dash or en-dash. Preserve the exact meaning and register. The result must be grammatical. Prefer, in order: a comma, a semicolon, a colon, a parenthetical, or splitting into two sentences. Return only the rewritten sentence, nothing else.

The scrubber validates the return (still no dash present; length within a sane bound of the original) and, on failure, falls back to flagging the sentence for manual review rather than writing a bad rewrite.

### Mode A: source-clean CLI

```
node tools/scrub-emdashes.mjs <paths...> [--write] [--deterministic-only]
```
- Scans the given markdown (default target: the published CKP sources + the site's own source strings).
- Prints a colored, unified dry-run diff of every proposed change, grouped by file, labeled Tier 1 (deterministic) or Tier 2 (LLM), plus a list of any sentences flagged for manual review.
- Writes back ONLY with `--write`. Default is dry-run. This is the guard against silent prose mutation.
- `--deterministic-only` skips the LLM tier (fast, free, offline; leaves hard cases flagged).

### Mode B: build-time guard

A deterministic assertion in the Astro pipeline, wired at the existing seam:
- Extend `smart()` (or add a sibling transform in `entry.ts`) to run the Tier 1 pass on rendered content so any dash that slips through source cleaning is still removed from output.
- Add a `prebuild`/build assertion that scans generated content and FAILS the build if any em/en-dash survives in prose. Deterministic only: the build does no network calls and never calls the LLM. The LLM tier lives only in the authoring CLI.
- Net effect: even if an author commits a note with a raw dash, the published HTML is guaranteed dash-free (Tier 1 substitution), and the build screams if something unexpected survives.

### The hook

A git `pre-commit` hook in `parallax-press-live` that runs:
```
node tools/scrub-emdashes.mjs --check <staged .md .astro .css .js>
```
`--check` exits non-zero (blocking the commit) if any staged file contains an em-dash or en-dash, with a message pointing the author to run the CLI with `--write`. This gives Sterling all three of what he asked for: the hook (trigger), the module (engine), and the build backstop.

Installation: a tracked hook script under `tools/hooks/pre-commit` plus a one-line `git config core.hooksPath tools/hooks` (or an install note in the README), so the hook travels with the repo.

## Scope of what it scrubs

- Article body content: the published CKP markdown notes (respecting the same `PUBLISHED_SOURCES` manifest, extendable to any folder via CLI args).
- Site chrome copy: strings in `Base.astro`, the page templates, `assets/*.css` comments and content, `assets/controls.js`.
- Reusable: pointable at any markdown path in the vault for one-off cleaning, but it does not run vault-wide by default.

## Configuration

- Default policy: remove ALL em-dashes and en-dashes from prose. Hyphens are never touched.
- Optional allowlist file for any legitimate en-dash the project ever wants to keep (expected empty; Sterling wants them all gone).
- Venice API: read the key from the same place the vault's Venice toolkit reads it. If absent, Mode A runs `--deterministic-only` automatically and flags hard cases; the hook and build guard (deterministic) still function fully offline.

## Files

New:
- `tools/scrub-emdashes.mjs` (engine + CLI)
- `tools/hooks/pre-commit` (git hook)
- `tools/README.md` (usage + install)

Touched:
- `site/src/lib/entry.ts` (add the Tier 1 transform at the `smart()` seam)
- `site/package.json` (a `scrub` script; a build-time assertion step)
- root `README.md` or `tools/README.md` (hook install note)

## Verification

- Unit-level: a fixture set of sentences (compound, range, appositive, clause-boundary, dialogue) run through Tier 1 produces the expected deterministic output; hard cases are correctly flagged, not mangled.
- Tier 2: with a Venice key present, a handful of real clause-boundary sentences from actual CKP notes rewrite to grammatical, dash-free sentences; the validator rejects any return that still contains a dash.
- Mode A dry-run shows a correct diff and writes nothing; `--write` applies exactly what the diff showed.
- Build guard: introduce a raw em-dash in a test note, confirm the build either substitutes it (Tier 1) in output and/or fails the assertion as designed.
- Hook: staging a file containing an em-dash blocks the commit with the guidance message; staging a clean file commits normally.
- Self-check: both spec documents and all new prose in this work contain no em-dashes.

## Sequencing

Ship AFTER the redesign lands (or in parallel; they touch mostly disjoint files). The only shared file is `entry.ts`, and only the em-dash spec modifies its `smart()` internals, so a clean merge order is: redesign first, scrubber second.
