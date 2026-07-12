# Parallax Press — Site Generator

Generates the published Common Knowledge Project site **directly from the vault markdown**.
Markdown is the verbatim source of truth: edit the `.md` files, rebuild, and the styled pages
regenerate. Nothing in the generated HTML is hand-edited.

## Where things live

```
Common Knowledge Project/
├── Labor/ Capital/ The State/ …      ← vault domain folders (the content source)
└── parallax-press-live/              ← the git repo Cloudflare Pages serves
    ├── assets/press.css              ← CANONICAL design (single source of truth)
    ├── assets/controls.js
    ├── labor/<slug>/index.html       ← generated CKP entry pages live here (served root)
    ├── press/<slug>/index.html       ← generated Parallax Posts live here
    └── site/                         ← THIS generator
        ├── src/content.config.ts     ← loads ../../<Domain>/*.md
        ├── src/lib/entry.ts          ← markdown → template parser
        ├── src/layouts/Base.astro    ← masthead + footer chrome
        ├── src/pages/[domain]/[slug].astro  ← the CKP entry template
        └── src/pages/press/           ← the Parallax Post index + article template
```

The content loader reads an explicit publication manifest from the vault two levels up
(`base: '../..'`), so the build only runs where the full vault exists — i.e. locally on your
machine, not on Cloudflare. You build, then commit the generated HTML. The manifest prevents
malformed or incomplete working notes elsewhere in the CKP from breaking production builds.

## Build & deploy

```bash
cd site
npm install          # first time only
npm run deploy       # = build + copy generated entries into the served root (../)
cd ..
git add -A && git commit -m "Regenerate site" && git push   # Cloudflare redeploys
```

- `npm run build` → generates `site/dist/` (entries + a synced copy of the design assets).
- `npm run publish` → copies `dist/<domain>/<slug>/` into the repo root the site is served from.
- `npm run preview` → serve `dist/` locally to check before pushing.

`prebuild` automatically syncs `../assets` → `public/assets`, so **`assets/press.css` at the repo
root is the one place to change the design**; never edit a copy.

## Publishing an entry (the gate)

An entry goes live only when it is listed in `src/content.config.ts` **and** its frontmatter has
`publish: true`. To publish one, add its path to `PUBLISHED_SOURCES`, then add to its Markdown
frontmatter:

```yaml
publish: true
entry_number: 6                 # the № shown in the eyebrow (optional)
dek: One-line subtitle under the title.        # optional
published: 2026-05-12           # optional; shows in byline + citation
revised: 2026-05-28             # optional
```

Everything else is read from the body. Required body shape (the five canonical H2 sections):

```
## What It Is
## Why It Matters
## How It Works in Practice
## What They Say vs. What's True
## Further Reading

**Related:** [[Concept A]] · [[Concept B|alias]] · …
```

### Publishing a Parallax Post

Parallax Posts are CKP Layer 3 products rendered under `/press/<slug>/`. The publication manifest
accepts posts from case-study folders as well as the eight top-level domains. Their frontmatter
must include:

```yaml
layer: 3
status: draft
output-channel: parallax-press
format: parallax-post
publish: true
published: 2026-07-09
dek: A one-line description for the article header and Press index.
```

Unlike CKP reference entries, Posts may use audience-shaped headings. The Post template renders
the full Markdown body, retains provenance and claims-discipline sections, extracts the curated
`**Related:**` footer, and publishes a dedicated citation block.

### The §IV parallax convention
`## What They Say vs. What's True` may hold **one or many** say/true pairs. Each pair is:

```
**What they say:** "The claim, in their words."

**What's true:** The rebuttal.
```

Repeat the pair for multiple rows. The generator renders all three CSS treatments
(slab / margin / ledger) from these pairs.

### Links & weights
`[[Wikilinks]]` in the body resolve to other **published** entries (unresolved ones render inert).
The "N links" weight on the related rail counts citations across the **whole vault** (not just
published), so the number reflects true prominence. The visual size is √-compressed so a 146-link
concept doesn't blow up the layout.

## Finalized layout spec (do not regress)

`assets/press.css` is the Wikipedia (Vector 2022) skin. The design uses a system-sans body with
serif (Georgia) headings and loads no webfonts. These values define the approved layout:

| Knob | Value | Purpose |
|---|---|---|
| `--measure` | `46em` | reading-column ceiling (kept < full width for readability) |
| `--sidebar-w` | `11em` | left nav rail width |
| `--gutter` | `clamp(16px, 4vw, 40px)` | side margin so content never hugs the edge |
| shell `max-width` | `1400px` | header/content/footer width on large screens |
| `.entry-head` / `.ckp-sec` | `padding-top` only | must NOT use `padding: x 0 0` (that zeroes the gutter) |
| related `--links` | `round(sqrt(realWeight))`, cap 16 | compressed visual weight; label shows the true count |

`controls.js` carries only the runtime behaviors: theme toggle, mobile nav, search focus,
copy-citation, and TOC scroll-spy. There is no design-toggle playground.

## Status / roadmap
- ✅ Entry pages generate from markdown in the approved layout.
- ✅ Home page generates from `src/pages/index.astro` (the Main Page).
- ✅ Domain index pages generate from `src/pages/[domain]/index.astro`.

The homepage and domain indexes are no longer hand-built: they are Astro-generated and published
to the repo root by `npm run publish`, alongside the entry and Press pages.
