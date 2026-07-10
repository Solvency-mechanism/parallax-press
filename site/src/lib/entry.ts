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
export const contentPath = (data: { title: string; domain?: string; format?: string }) =>
  data.format === 'parallax-post' ? postPath(data.title) : entryPath(data.domain || '', data.title);

// Smart typography to match the hand-built pages (curly quotes, em dashes already present).
function smart(s: string): string {
  return s
    .replace(/"([^"]*)"/g, '“$1”')
    .replace(/(\w)'(\w)/g, '$1’$2')
    .replace(/'/g, '’');
}

// Resolve [[Target]] / [[Target|alias]] to anchor tags. `resolve` maps a target
// title to a path; unknown targets render as a dead clink (matches current site).
function wikilinks(md: string, resolve: (t: string) => string | null): string {
  return md.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, alias) => {
    const text = (alias || target).trim();
    const href = resolve(target.trim()) || '#';
    return `<a class="clink" href="${href}">${text}</a>`;
  });
}

function inlineHTML(md: string, resolve: (t: string) => string | null): string {
  return marked.parse(wikilinks(smart(md), resolve)) as string;
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

export function renderPost(body: string, resolve: (t: string) => string | null) {
  // The page template owns the public H1 and dek. Vault notes retain their
  // authoring H1 and subtitle, so remove those two leading headings here.
  let text = body.replace(/^\s*#\s+.*\n+/, '');
  text = text.replace(/^\s*##\s+.*\n+/, '');
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
  const parts = text.split(/^##\s+/m).slice(1);
  const sec: Record<string, string> = {};
  let parallaxRaw = '';
  for (const p of parts) {
    const nl = p.indexOf('\n');
    const head = p.slice(0, nl).trim().toLowerCase();
    const bodyMd = p.slice(nl + 1).replace(/\n---\s*$/, '').trim();
    if (head.startsWith('what they say')) parallaxRaw = bodyMd;
    else if (HEAD_MAP[head]) sec[HEAD_MAP[head]] = bodyMd;
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
  // further reading: each bullet "Title — meta"
  const furtherReading: Reading[] = (sec.furtherReading || '')
    .split(/\n/).map(l => l.replace(/^[-*]\s+/, '').trim()).filter(Boolean)
    .map(line => {
      const i = line.indexOf(' — ');
      const [title, meta] = i >= 0 ? [line.slice(0, i), line.slice(i + 3)] : [line, ''];
      return { title: inlineHTML(smart(title), resolve), meta: inlineHTML(smart(meta), resolve) };
    });
  return {
    whatItIs: inlineHTML(sec.whatItIs || '', resolve),
    whyItMatters: inlineHTML(sec.whyItMatters || '', resolve),
    inPractice: inlineHTML(sec.inPractice || '', resolve),
    parallax, furtherReading, related,
  };
}
