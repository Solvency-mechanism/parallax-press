import { marked } from 'marked';

marked.setOptions({ mangle: false, headerIds: false } as any);

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export function slug(s: string): string {
  return s.toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
export const domainSlug = (d: string) => slug(d);
export const entryPath = (domain: string, title: string) => `/${domainSlug(domain)}/${slug(title)}/`;
export const postPath = (title: string) => `/press/${slug(title)}/`;
export const contentPath = (data: { title: string; domain?: string; format?: string }) => {
  if (data.format === 'parallax-post') return postPath(data.title);
  // Without a domain the path would be protocol-relative (//slug/), a link to another host.
  if (!data.domain) throw new Error(`Published reference has no domain: ${data.title}`);
  return entryPath(data.domain, data.title);
};

// [[Target#Heading]] and [[Target^block]] point at the Target note.
export const linkTarget = (target: string) => target.replace(/[#^].*$/, '').trim();

// Markdown is preserved verbatim: changing quotes before parsing corrupts link
// destinations, code, and exact wikilink identities.
const escapeHTML = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function makeResolver(entries: any[]) {
  const paths = new Map<string, string>();
  for (const entry of entries.filter(e => e.data.publish === true && e.data.title)) {
    const aliases = entry.data.aliases;
    const names = [entry.data.title, ...(typeof aliases === 'string' ? [aliases] : aliases || [])];
    if (entry.filePath) names.push(entry.filePath.replace(/\\/g, '/').split('/').pop().replace(/\.md$/i, ''));
    for (const name of names) {
      const path = contentPath(entry.data);
      if (paths.has(name) && paths.get(name) !== path) throw new Error(`Ambiguous published name: ${name}`);
      paths.set(name, path);
    }
  }
  return (target: string) => paths.get(linkTarget(target)) || null;
}

function wikilinks(md: string, resolve: (t: string) => string | null): string {
  return md.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => {
    const text = escapeHTML((alias || target).trim());
    const href = resolve(target.trim());
    return href ? `<a class="clink" href="${escapeHTML(href)}">${text}</a>` : `<span class="unpublished-reference">${text}</span>`;
  });
}

function inlineHTML(md: string, resolve: (t: string) => string | null): string {
  return marked.parse(wikilinks(md, resolve)) as string;
}

function pullRelated(text: string) {
  const related: { title: string; alias?: string }[] = [];
  const body = text.replace(/\n---\s*\n+\*\*Related:\*\*\s*(.+)$/s, (_m, list) => {
    const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g; let mm;
    while ((mm = re.exec(list))) related.push({ title: mm[1].trim(), alias: mm[2]?.trim() });
    return '';
  });
  return { body, related };
}

// CKP Layer 2 notes are argued interpretations. They keep their own headings,
// so they render like a Post body at their domain path rather than as a reference.
export const isAnalysis = (data: { layer?: unknown; format?: string }) => Number(data.layer) === 2 && data.format !== 'parallax-post';

export function renderPost(body: string, resolve: (t: string) => string | null) {
  // The page template owns the public H1. Preserve all substantive headings.
  let text = body.replace(/^\s*#\s+.*\n+/, '');
  // An italic subtitle is part of the public body; retain every substantive H2.
  const extracted = pullRelated(text);
  return {
    html: inlineHTML(extracted.body.trim(), resolve),
    related: extracted.related,
  };
}

const HEAD_MAP: Record<string, string> = {
  'what it is': 'whatItIs',
  'why it matters': 'whyItMatters',
  'how it works in practice': 'inPractice',
  'further reading': 'furtherReading',
};

export interface ParallaxPair { say: string; truth: string; }
export interface Reading { title: string; meta: string; }
export interface ParsedEntry {
  whatItIs: string; whyItMatters: string; inPractice: string;
  parallax: ParallaxPair[]; furtherReading: Reading[];
  related: { title: string; alias?: string }[];
}

export function parseEntry(body: string, resolve: (t: string) => string | null): ParsedEntry {
  // drop a leading H1 if present
  let text = body.replace(/^\s*#\s+.*\n/, '');
  // pull the **Related:** line out first
  const extracted = pullRelated(`\n---\n${text}`);
  text = extracted.body;
  const related = extracted.related;
  // split on ## headings
  const [preamble, ...parts] = text.split(/^##\s+/m);
  // The template renders only the canonical sections, so anything else would vanish silently.
  if (preamble.replace(/^\s*---\s*$/m, '').trim()) throw new Error('Reference has prose before its first section');
  const sec: Record<string, string> = {};
  let parallaxRaw = '';
  for (const p of parts) {
    const nl = p.indexOf('\n');
    const head = p.slice(0, nl).trim().toLowerCase();
    const bodyMd = p.slice(nl + 1).replace(/\n---\s*$/, '').trim();
    if (head.startsWith('what they say')) parallaxRaw = bodyMd;
    else if (HEAD_MAP[head]) sec[HEAD_MAP[head]] = bodyMd;
    else throw new Error(`Reference has a section the template cannot render: ${head}`);
  }
  // parallax pairs: split on "**What they say:**"
  const parallax: ParallaxPair[] = [];
  for (const chunk of parallaxRaw.split(/\*\*What they say:\*\*/i).slice(1)) {
    const [say, truth] = chunk.split(/\*\*What['’]s true:\*\*/i);
    if (say && truth) parallax.push({
      say: inlineHTML(say.trim(), resolve),
      truth: inlineHTML(truth.trim(), resolve),
    });
  }
  // Other labels (e.g. "**Public framing:**") match no pair, so the section would vanish.
  if (parallaxRaw && parallax.length === 0) throw new Error('Reference comparison needs **What they say:** / **What\'s true:** pairs');
  // Without the --- rule the Related footer would render as a source in Further reading.
  if (/\*\*Related:\*\*/.test(sec.furtherReading || '')) throw new Error('Reference **Related:** line needs a --- rule before it');
  // further reading: each bullet "Title — meta"
  const furtherReading: Reading[] = (sec.furtherReading || '')
    .split(/\n/).map(l => l.replace(/^[-*]\s+/, '').trim()).filter(Boolean)
    .map(line => {
      const i = line.indexOf(' — ');
      const [title, meta] = i >= 0 ? [line.slice(0, i), line.slice(i + 3)] : [line, ''];
      return { title: inlineHTML(title, resolve), meta: inlineHTML(meta, resolve) };
    });
  return {
    whatItIs: inlineHTML(sec.whatItIs || '', resolve),
    whyItMatters: inlineHTML(sec.whyItMatters || '', resolve),
    inPractice: inlineHTML(sec.inPractice || '', resolve),
    parallax, furtherReading, related,
  };
}
