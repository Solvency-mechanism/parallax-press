# Em-Dash Scrubber

`scrub-emdashes.mjs` replaces each user-visible Unicode em dash (`U+2014`) with one ASCII hyphen-minus (`-`, `U+002D`). It is deterministic, has no network dependency, and does not alter en dashes.

## Modes

```text
node tools/scrub-emdashes.mjs <paths...>
node tools/scrub-emdashes.mjs <paths...> --write
node tools/scrub-emdashes.mjs <paths...> --check
```

- The default is a dry run. It reports eligible replacements without writing.
- `--write` applies the reported changes.
- `--check` writes nothing and exits with status 1 when eligible em dashes remain.
- Input paths are always explicit. The command never defaults to the vault root.

Directories are scanned recursively. Supported files are Markdown, Astro, CSS, JavaScript, MJS, and HTML.

## Markdown safety

The Markdown transform preserves:

- fenced and inline code;
- raw URLs;
- Markdown link destinations;
- Obsidian wikilink targets.

When an unaliased wikilink target contains an em dash, the target remains unchanged and a cleaned visible alias is added. Existing aliases are cleaned without modifying their targets.

## Parallax Press

From `site/`:

```text
npm run test:scrub
npm run scrub
npm run scrub:write
npm run scrub:check
```

These scripts target the published CKP source named in the publication manifest, the human-facing Astro page and layout sources, and the canonical assets directory. They do not target `content.config.ts`, filenames, or the whole Rhizome.
