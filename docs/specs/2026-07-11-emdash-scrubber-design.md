# Design Spec: Deterministic Em-Dash Scrubber

**Date:** 2026-07-11
**Revised:** 2026-07-13
**Status:** Approved design, pending implementation

> This document contains no Unicode em dashes. It is its own smoke test.

## Decision

Replace every user-visible Unicode em dash (`U+2014`) with one ASCII hyphen-minus (`-`, `U+002D`). Preserve the whitespace already surrounding the character. Do not rewrite sentences, call an LLM, or change en dashes.

The first application covers the currently published CKP Markdown sources and the Parallax Press site chrome. The command remains reusable for explicit paths elsewhere in the vault, but it never sweeps the whole Rhizome by default.

## Goals

1. Provide one deterministic transform whose output is always predictable.
2. Remove Unicode em dashes from user-visible published CKP and Parallax Press text.
3. Preserve filenames, Markdown structure, and Obsidian wikilink targets.
4. Support preview, write, and automated check workflows.
5. Verify that generated pages remain structurally sound after the replacement.

## Non-Goals

- No grammatical rewriting or punctuation selection.
- No LLM or network dependency.
- No en-dash replacement.
- No filename or directory renaming.
- No automatic vault-wide sweep.
- No external push or production deployment as part of the initial run.

## Transform Contract

The base transform is literal:

```text
input:  A clause - represented here with U+2014 in the actual test fixture - another clause
rule:   U+2014 -> U+002D
output: A clause - another clause
```

The implementation must use an actual `U+2014` fixture in tests. The prose example above is written without that character so this design document remains a smoke test.

Whitespace is not normalized. An unspaced em dash becomes an unspaced hyphen, and a spaced em dash retains its surrounding spaces.

## Markdown and Wikilink Safety

The scrubber operates on visible text while protecting structural targets.

### Plain prose and frontmatter

- Replace `U+2014` in Markdown prose.
- Replace `U+2014` in human-facing frontmatter values such as `title` and `dek`.
- Do not change path-bearing configuration values or filenames.

### Obsidian wikilinks

Wikilink targets must remain byte-for-byte unchanged.

- `[[Target U+2014 Topic]]` gains a cleaned visible alias while preserving the target: `[[Target U+2014 Topic|Target - Topic]]`.
- `[[Target U+2014 Topic|Visible U+2014 Label]]` keeps the target and cleans only the alias: `[[Target U+2014 Topic|Visible - Label]]`.
- A wikilink with no em dash in its visible text remains unchanged.

The implementation tests use actual `U+2014` characters for these cases.

### Other protected structures

- Do not alter fenced code blocks, inline code, URLs, or Markdown link destinations.
- Site source processing is limited to human-facing Astro templates and the canonical CSS and JavaScript chrome files. Parser contracts and publication-manifest paths are not bulk-rewritten.

## Command Interface

Create `tools/scrub-emdashes.mjs` as a Node ESM command with three modes:

```text
node tools/scrub-emdashes.mjs <paths...>
node tools/scrub-emdashes.mjs <paths...> --write
node tools/scrub-emdashes.mjs <paths...> --check
```

- Default mode is a dry run. It reports files and replacement counts without writing.
- `--write` applies exactly the changes reported by the dry run.
- `--check` writes nothing and exits nonzero if any replaceable user-visible em dash remains.
- Explicit paths are required. The command has no implicit vault-root target.

Add package scripts for the repository's approved Parallax source set so the common operation is reproducible without manually reconstructing paths.

## Initial Application

Run the command with `--write` against:

1. Every Markdown file named by `PUBLISHED_SOURCES` in `site/src/content.config.ts`.
2. Human-facing Parallax Press Astro templates under `site/src/pages/` and `site/src/layouts/`.
3. Canonical site chrome in `assets/press.css`, related canonical CSS files, and `assets/controls.js`.

Do not rename the published Markdown file even when its filename contains an em dash. Do not rewrite the path string in `content.config.ts`.

After source cleaning, regenerate the local static site with the existing deploy pipeline. This updates generated HTML in the repository but does not push or deploy it externally.

## Verification

Implementation follows test-driven development. Tests are written and observed failing before production code is added.

### Unit behavior

- Plain prose replaces every `U+2014` with `-`.
- Existing spaces are preserved exactly.
- En dashes remain unchanged.
- Fenced code, inline code, URLs, and link destinations remain unchanged.
- Wikilink targets remain byte-for-byte unchanged.
- Unaliased wikilinks with visible em dashes gain cleaned aliases.
- Existing wikilink aliases are cleaned without changing targets.
- Dry run writes nothing.
- Write mode changes only files with eligible replacements.
- Check mode returns success for clean inputs and nonzero for dirty inputs.

### Repository and site integrity

1. Run the scrubber test suite.
2. Run the existing Parallax generated-site checks.
3. Scan generated public HTML and fail if any user-visible `U+2014` remains.
4. Extract every wikilink target from changed Markdown before and after the run and assert the target sets are identical.
5. Scan the vault for unresolved wikilinks introduced by the changed published files.
6. Inspect the git diff to confirm no filenames, manifest paths, or unrelated vault files changed.

## Files

New:

- `tools/scrub-emdashes.mjs`
- `tools/scrub-emdashes.test.mjs`
- `tools/README.md`

Touched:

- `site/package.json`
- Published CKP Markdown sources that contain user-visible em dashes
- Parallax Press source chrome containing user-visible em dashes
- Locally regenerated static HTML

## Completion Criteria

The work is complete when the deterministic tool and tests pass, the approved source set has been cleaned, generated user-visible HTML contains no Unicode em dashes, all preexisting wikilink targets in changed Markdown are preserved, existing site checks pass, and the diff contains no filename changes or unrelated vault edits.
