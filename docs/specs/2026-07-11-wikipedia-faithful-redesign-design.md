# Design Spec: Wikipedia-Faithful Redesign of the Common Knowledge Project

**Date:** 2026-07-11
**Status:** Awaiting review
**North Star:** Wikipedia (Vector 2022 skin), as literal as content structure allows.

> Note on style: this document contains no em-dashes or en-dashes, by design. The CKP house voice is dropping the dash. See the companion spec `2026-07-11-emdash-scrubber-design.md`.

## Problem

The current Parallax Press / CKP site reads as an art-directed magazine ("civic broadsheet"): large Libre Caslon display headlines, Spectral serif body on warm cream paper, a wax-seal logo, paper-grain texture, oxblood accent, roman-numeral section marks, and a bespoke multi-mode "What they say vs. what's true" layout wired to a `controls.js` design-toggle playground. That polish is precisely what reads as an "AI website."

Sterling wants the site to read like Wikipedia: utilitarian, dense, neutral, hyperlink-first, with the encyclopedia's information architecture (left sidebar nav, table of contents, right-hand infobox, references). Wikipedia's model already matches how he envisions Parallax Press, so the goal is faithful adoption, not novel design.

## Goals

1. Rebuild the visual identity to the Vector 2022 skin, faithfully, for both desktop and mobile.
2. Converge on ONE design model. Remove the design-toggle playground and its many alternate treatments.
3. Preserve all CKP content structure and governance (the five canonical sections, the "What they say vs. what's true" signature, citations, wikilinks and link weights).
4. Finish the pending Astro migration so there is a single source of truth: generate the homepage and domain-index pages instead of maintaining hand-built static HTML.

## Non-Goals

- No change to the content model, frontmatter schema, or the markdown authoring format.
- No new content. This is a reskin and structural migration of existing pages.
- No change to the publication gate (`PUBLISHED_SOURCES` + `publish: true`) or the Cloudflare Pages deploy target.
- The em-dash scrubber is a separate spec and separate implementation.

## Current State (verified)

- `assets/press.css` is the canonical design file. `prebuild` syncs `../assets` into `site/public/assets`. Never edit a copy.
- `assets/home.css`, `assets/post.css` are page-layer stylesheets loaded after `press.css`.
- `assets/controls.js` drives: theme toggle, mobile menu, search, copy-citation, AND a large design playground (`data-density`, `data-parallax`, `data-relational`, `data-domain-layout`, `data-domains`, `data-stats`, `data-search`). The playground is removed by this redesign.
- Astro source (`site/src/`):
  - `layouts/Base.astro`: masthead + footer chrome. Loads Google Fonts. Holds the seal SVG.
  - `pages/[domain]/[slug].astro`: the CKP entry template (lead, five sections, parallax in three CSS treatments, citation block, related rail).
  - `pages/press/index.astro`, `pages/press/[slug].astro`: the Parallax Post index and article.
  - `lib/entry.ts`: markdown parser. `parseEntry` returns structured `{ whatItIs, whyItMatters, inPractice, parallax: {say,truth}[], furtherReading, related }`. `smart()` applies curly quotes and (today) leaves em-dashes intact.
  - `content.config.ts`: the publication manifest. Currently one published source (a Parallax Post).
- Homepage (`index.html`) and domain index (`labor/index.html`) at the repo root are hand-built static files, NOT generated. The roadmap in `site/README.md` calls for migrating them.
- Because only one or two pages are live and the domain pages are static demos, the redesign is low-risk: we are reskinning templates and a couple of demo pages, not migrating hundreds of live URLs.

## Design Tokens (Wikipedia-faithful)

Replace the warm-cream token set in `press.css` with the Vector 2022 palette.

**Light (default):**
- `--paper` (page frame): `#f8f9fa`
- `--surface` (content bg): `#ffffff`
- `--ink`: `#202122`
- `--ink-2` (secondary): `#54595d`
- `--ink-3` (muted): `#72777d`
- `--border-strong`: `#a2a9b1`
- `--border`: `#c8ccd1`
- `--border-soft`: `#eaecf0`
- `--panel` (infobox / TOC / table header): `#f8f9fa`
- `--panel-head`: `#eaecf0`
- `--link`: `#3366cc`
- `--link-visited`: `#795cb2`
- `--link-red` (unresolved): `#ba0000`
- `--link-red-visited`: `#a55858`

**Dark (Wikipedia night mode):**
- `--paper`: `#101418`
- `--surface`: `#1c1f24`
- `--ink`: `#eaecf0`
- `--ink-2`: `#c8ccd1`
- `--ink-3`: `#a2a9b1`
- `--border-strong`: `#54595d`
- `--border`: `#43464a`
- `--border-soft`: `#2e3136`
- `--panel`: `#27292d`
- `--panel-head`: `#2e3136`
- `--link`: `#6699ff`
- `--link-visited`: `#a698dd`
- `--link-red`: `#e0787a`

**Type:**
- Body / UI: `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`, 16px, line-height 1.6.
- Headings h1 and h2: `"Linux Libertine", Georgia, "Times New Roman", serif`, with a `1px solid var(--border-strong)` bottom rule and generous top margin. h1 ~1.8rem, h2 ~1.5rem.
- Headings h3 to h6: the sans body stack, bold, no rule.
- Small UI (sidebar, infobox labels, references, captions): 0.875rem.
- Remove all Google Fonts `<link>` tags from `Base.astro`. No webfonts.

**Shell metrics:**
- Content reading measure: ~46em (about 720 to 800px), capped for line length.
- Left sidebar: ~11em, collapsible; sticky on scroll.
- Infobox: floats right at ~22em on desktop; stacks full-width directly after the lead on mobile.
- Links: blue, no underline at rest, underline on hover (Vector 2022 behavior). Unresolved wikilinks use `--link-red`.

## Chrome (`Base.astro`)

Replace the broadsheet masthead with the Vector 2022 header + sidebar shell.

1. **Top bar** (thin, sticky): small wordmark on the left ("Parallax Press" with "The Common Knowledge Project" as a subordinate line, or a compact seal glyph retained at ~24px), a search input in the center/right, a theme toggle. No large seal, no embossing.
2. **Left sidebar** (`<nav>`): the site's global navigation.
   - Primary: the domain list (Labor, Capital, The State, Ideology, History, Institutions), The Press.
   - Secondary: About & citation, Contribute, license note.
   - Collapsible via a hamburger on narrow screens; a persistent rail on wide screens.
3. **Content region:** `<slot />`, constrained to the reading measure with the infobox floating right on article pages.
4. **Footer:** a plain utilitarian footer (license `CC BY-SA 4.0`, "No tracking, no accounts", nav repeats). Drop the large seal + colophon grandeur; keep one small mark at most.

The `data-page`, `data-theme` attributes stay. Remove `data-parallax`, `data-relational`, `data-density`, `data-domain-layout`, `data-domains`, `data-stats`, `data-search` and the inline script that restores them.

## Article Page (`[domain]/[slug].astro`)

Restructure to a Wikipedia article. The parsed data (`parseEntry`) is unchanged; only the rendering changes.

- **Title block:** `h1` with the entry title and a bottom rule, plus a small "From The Common Knowledge Project" subtitle line under it (mirrors "From Wikipedia, the free encyclopedia"). The domain and entry number move into the infobox.
- **Lead:** the `dek` renders as an italic-free lead paragraph immediately under the title (Wikipedia lead style). The first section ("What it is") follows.
- **Contents box:** a classic bordered "Contents" TOC listing the sections (What it is, Why it matters, How it works in practice, What they say vs. what's true, Further reading, See also), numbered, placed after the lead. Collapsible on mobile. Generated from the known section set (no JS dependency required, but a small scroll-spy highlight is a nice-to-have in `controls.js`).
- **Sections:** each canonical section becomes an `h2` with an id + bottom rule, body below. Drop the left rail section-number marks and the roman numerals.
- **"What they say vs. what's true":** render the `parallax` pairs as a single `.wikitable` with two columns ("What they say" / "What's true"), one row per pair, with a `<caption>`. Remove the slab / margin / ledger multi-treatment rendering entirely. This section's CONTENT is non-negotiable per CKP governance; only its presentation is simplified.
- **Further reading:** render as a Wikipedia-style numbered references list (`ol.references`, small font).
- **See also (Related):** render `related` as a plain "See also" bulleted list of links. The link-weight ("cited by N") moves to the infobox as a single "Most-cited related concepts" note, or is shown as a muted count next to each item. Keep it plain; drop the √-scaled weight bars and the relational-density visualization.
- **Infobox (right):** a single `.infobox` panel absorbing today's byline rail + citation block + weights:
  - Domain, Entry № (if present)
  - Published, Last revised (if present)
  - Author: Parallax Press
  - "Cite this entry": the formatted citation text + a Copy button + the canonical URL (behavior preserved from the current `#copy-cite`).
  - Permalink.

## Press Pages

- `press/index.astro`: reskin the card list to a plain Wikipedia-style index (article links with dek and date, minimal chrome).
- `press/[slug].astro`: same article shell as CKP entries (title + rule, lead, TOC if long, sections, references, infobox with citation). Posts may keep audience-shaped headings; the TOC generates from whatever `h2`s exist.

## Homepage + Domain Index (finish the Astro migration)

- **`src/pages/index.astro` (Main Page):** rebuild the homepage as a Wikipedia Main Page:
  - A bordered welcome banner: "Welcome to The Common Knowledge Project, the free reference archive that anyone can cite," with live counts (N entries across M domains) computed from the corpus.
  - A two-column module grid of boxed sections with colored header bars (Vector Main-Page style): Featured entry, Did you know, From the record (the "On this day" analogue), and the domain directory.
  - Port the existing homepage module copy from the static `index.html` into these boxes.
- **`src/pages/[domain]/index.astro` (Domain page):** a category-style index listing that domain's published entries with glosses, styled like a Wikipedia category page. Ports the static `labor/index.html` demo.
- Retire the hand-built static `index.html` and `labor/index.html`: after migration, `npm run publish` regenerates them from Astro. Update the deploy step so generated homepage/domain pages replace the static ones. (Serving `site/dist/` directly, per the roadmap, is the clean end state, but copying generated output into the served root is acceptable to stay compatible with the current Cloudflare config; pick the lower-risk one at implementation time.)

## `controls.js` Rewrite

Keep ONLY: theme toggle (persist `pp-theme`), mobile sidebar toggle, search open/behavior, copy-citation. Add: optional TOC scroll-spy highlight. Remove: every design-playground toggle and the `pp-design` localStorage restore. Delete the corresponding attribute plumbing in `Base.astro`.

## Files Touched

Rewrites:
- `assets/press.css` (canonical skin: tokens, chrome, sidebar, TOC, infobox, typography, links, `.wikitable`, `.references`)
- `assets/home.css` (Main Page boxes)
- `assets/post.css` (article/press deltas)
- `assets/controls.js` (trim to essentials + TOC spy)
- `site/src/layouts/Base.astro` (Vector chrome; remove webfonts + playground attrs)
- `site/src/pages/[domain]/[slug].astro` (Wikipedia article + wikitable parallax + infobox)
- `site/src/pages/press/index.astro`, `site/src/pages/press/[slug].astro`

New:
- `site/src/pages/index.astro` (Main Page)
- `site/src/pages/[domain]/index.astro` (Domain index)

Possibly touched:
- `site/package.json` deploy scripts (if the served-root strategy changes)
- `site/README.md` (update the "Status / roadmap" and design-knob table to reflect the new skin)

Unchanged:
- `site/src/lib/entry.ts` parsing contract (the em-dash scrubber may later extend `smart()`, but that is the other spec).
- `site/src/content.config.ts` publication manifest and schema.
- Frontmatter and markdown authoring format.

## Verification

- `npm run build` succeeds and regenerates the published entry, the Press index/post, the new homepage, and the domain index.
- `npm run preview`: manual check at desktop (>=1200px), tablet (768px), and mobile (375px) widths, in both light and dark themes:
  - Left sidebar collapses to a hamburger on mobile; infobox stacks after the lead; wikitable and any wide content scroll inside their own container without causing horizontal page scroll.
  - Links are blue, unresolved wikilinks are red, headings are serif with rules, body is sans.
  - Contents box lists the correct sections and anchors jump correctly.
  - Copy-citation still works.
- Grep the built output for the retired identity: no Google Fonts requests, no `data-parallax`/`data-relational` attributes, no `Libre Caslon`/`Spectral` references.
- No console errors.

## Risks / Open Choices (resolved by judgment, flagged for review)

- **Serve strategy:** migrate Cloudflare to serve `site/dist/` directly (clean, roadmap-endorsed) vs. keep copying generated HTML into the served root (lower risk, no infra change). Default: keep the copy step for this pass; note the direct-serve migration as a follow-up.
- **Seal retention:** keep a small seal glyph in the wordmark as the sole brand mark vs. drop it entirely for pure Wikipedia neutrality. Default: keep it small in the wordmark; it does not read as "AI" at 24px and preserves press identity.
- **TOC placement:** classic in-article "Contents" box (chosen, most recognizable) vs. Vector 2022 sticky left-rail TOC. Default: classic box now; sticky rail is an easy later enhancement.
