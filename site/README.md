# Parallax Press Site Generator

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
(`base: '../..'`), so the build only runs where the full vault exists, i.e. locally on your
machine, not on Cloudflare. You build, then commit the generated HTML. The manifest prevents
malformed or incomplete working notes elsewhere in the CKP from breaking production builds.

## Prepare and review a release

Build from an isolated website task worktree inside the CKP folder. The source loader
reads the sibling vault notes; those notes must contain the exact selected metadata.
The current manifest selects thirteen sources for the Rural California collection: the
original field guide and six references, plus the water-consolidation path (four references,
one Layer 2 analysis and one Post). All must also declare `publish: true` or the collection
build deliberately fails.

```powershell
cd site
npm ci
npm run test:release
npm run test:scrub
npm run build
node scripts/check-built-site.mjs dist
npm run publish
npm run check
npm run preview
```

`npm run publish` only copies generated files into this local repository root.
It does not commit, push, or contact hosting. `npm run preview` serves `site/dist/`
for a human review of desktop and mobile reading. Stop it when review finishes.
Do not edit generated HTML. `prebuild` syncs `../assets` into `public/assets`;
`../assets/press.css` remains the canonical approved design.

Keep the source changes and generated root pages together for review. Inspect the diff,
source citations, internal reading paths, and revision dates before any external publication.
A push to the deployment-connected repository triggers hosting; pushing or deploying
requires explicit approval after review. The legacy `deploy` script is a local shortcut
for build/copy/check, but the separate commands above make the review boundaries clear.

`npm run test:release` exercises published-only links, alias, filename and `#heading` resolution,
source URL preservation, substantive Post headings, and complete reference sections. A reference
with prose outside the five rendered sections, a comparison section without `**What they say:**` /
`**What's true:**` pairs, a `**Related:**` line without the `---` rule above it, or a published
reference without a domain, fails the build rather than losing content or emitting a broken link.
`npm run check` verifies all fifteen collection pages, canonical/citation URLs, the reading order,
placeholders, and every internal `href`/`src` path and fragment across the generated site, compared
case-sensitively as Cloudflare serves them. These checks do not certify the factual claims or
remotely fetch cited sources.

### What Cloudflare serves

Cloudflare Pages serves this whole repository root, including `site/`, `docs/` and `tools/`.
`public/_redirects` (copied to the root by `npm run publish`) redirects those paths to an
unpublished address, so readers get the generated `404.html` with a 404 status instead of source
files. Redirect rules apply even when a file exists. `npm run check` fails if either file is
missing. Redirect matching is literal, so a deliberately percent-encoded path (for example
`/%73ite/README.md`) still reaches the file; verified on the 2026-10-19 preview. These files are
already public in this GitHub repository, so this is hygiene rather than a disclosure. Moving the
Pages output to a folder that holds only generated files would close it; that requires a
Cloudflare dashboard change.

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

### Publishing a Layer 2 analysis

A CKP note with `layer: 2` (and no `format: parallax-post`) is an argued interpretation, not a
reference. It renders at its domain path like a reference, but keeps its own headings: the body is
rendered in full like a Post, under an "Analysis" label, with the infobox citation and the curated
`**Related:**` footer as See also. Domain indexes mark it "Analysis". It needs `publish: true`, a
`domain`, and the `---` rule before `**Related:**`.

### The §IV parallax convention
`## What They Say vs. What's True` may hold **one or many** say/true pairs. Each pair is:

```
**What they say:** "The claim, in their words."

**What's true:** The rebuttal.
```

Repeat the pair for multiple rows. The generator renders all three CSS treatments
(slab / margin / ledger) from these pairs.

### Links & weights
`[[Wikilinks]]` in the body resolve to other **published** entries (unresolved ones render as plain text).
The "cited by N" weight on the See also list counts distinct **published** pages that link to the
target, excluding the target itself. Unpublished Related items show no gloss or weight. The visual
size is √-compressed so a heavily cited concept doesn't blow up the layout.

## Finalized layout spec (do not regress)

`assets/press.css` is the Wikipedia (Vector 2022) skin. The design uses a system-sans body with
serif (Georgia) headings and loads no webfonts. These values define the approved layout:

| Knob | Value | Purpose |
|---|---|---|
| `--measure` | `46em` | reading-column ceiling (kept < full width for readability) |
| `--sidebar-w` | `11em` | left nav rail width |
| `--gutter` | `clamp(16px, 4vw, 40px)` | side margin so content never hugs the edge |
| shell `max-width` | `1400px` | header/content/footer width on large screens |
| `.article-head` / `.article-section` | article header and section wrappers | Wikipedia article shell; `.article-section` has `overflow-x:auto` so wide tables never scroll the page |
| related `--links` | `round(sqrt(realWeight))`, cap 16 | compressed visual weight; label shows the true count |

`controls.js` carries only the runtime behaviors: theme toggle, mobile nav, search focus,
copy-citation, and TOC scroll-spy. There is no design-toggle playground.

## Status / roadmap
- ✅ Entry pages generate from markdown in the approved layout.
- ✅ Home page generates from `src/pages/index.astro` (the Main Page).
- ✅ Domain index pages generate from `src/pages/[domain]/index.astro`.

The homepage and domain indexes are no longer hand-built: they are Astro-generated and published
to the repo root by `npm run publish`, alongside the entry and Press pages.
