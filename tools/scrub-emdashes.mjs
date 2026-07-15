import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const EM_DASH = '\u2014';
const SUPPORTED_EXTENSIONS = new Set(['.md', '.astro', '.css', '.js', '.mjs', '.html']);

function replaceEmDashesWithCount(text) {
  const count = text.split(EM_DASH).length - 1;
  return { text: text.replaceAll(EM_DASH, '-'), count };
}

export function replaceEmDashes(text) {
  return replaceEmDashesWithCount(text).text;
}

function scrubWikilink(match, target, alias) {
  if (alias !== undefined) {
    const cleaned = replaceEmDashesWithCount(alias);
    return { text: `[[${target}|${cleaned.text}]]`, count: cleaned.count };
  }
  if (target.includes(EM_DASH)) {
    const cleaned = replaceEmDashesWithCount(target);
    return { text: `[[${target}|${cleaned.text}]]`, count: cleaned.count };
  }
  return { text: match, count: 0 };
}

function scrubMarkdownLine(line) {
  const tokens = [];
  let count = 0;
  const protect = (value, replacementCount = 0) => {
    const token = `\u0000${tokens.length}\u0000`;
    tokens.push(value);
    count += replacementCount;
    return token;
  };

  let visible = line.replace(/`+[^`]*`+/g, (value) => protect(value));
  visible = visible.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (match, target, alias) => {
      const cleaned = scrubWikilink(match, target, alias);
      return protect(cleaned.text, cleaned.count);
    },
  );
  visible = visible.replace(
    /\[([^\]]*)\]\(([^)]+)\)/g,
    (_match, label, destination) => {
      const cleaned = replaceEmDashesWithCount(label);
      return protect(`[${cleaned.text}](${destination})`, cleaned.count);
    },
  );
  visible = visible.replace(/https?:\/\/[^\s<>)\]]+/g, (value) => protect(value));
  const cleaned = replaceEmDashesWithCount(visible);
  count += cleaned.count;
  return {
    text: cleaned.text.replace(/\u0000(\d+)\u0000/g, (_match, index) => tokens[Number(index)]),
    count,
  };
}

function scrubMarkdownWithCount(markdown) {
  let fence = null;
  let count = 0;
  const text = markdown.split(/(\r?\n)/).map((part) => {
    if (/^\r?\n$/.test(part)) return part;
    const marker = part.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (marker[1][0] === fence) fence = null;
      return part;
    }
    if (fence) return part;
    const cleaned = scrubMarkdownLine(part);
    count += cleaned.count;
    return cleaned.text;
  }).join('');
  return { text, count };
}

export function scrubMarkdown(markdown) {
  return scrubMarkdownWithCount(markdown).text;
}

export function extractWikilinkTargets(markdown) {
  return [...markdown.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)]
    .map((match) => match[1]);
}

export function collectFiles(paths) {
  const files = new Set();
  const visit = (input) => {
    const absolute = resolve(input);
    if (!existsSync(absolute)) throw new Error(`Path not found: ${input}`);
    const stat = lstatSync(absolute);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(absolute, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        visit(resolve(absolute, entry.name));
      }
      return;
    }
    if (stat.isFile() && SUPPORTED_EXTENSIONS.has(extname(absolute).toLowerCase())) {
      files.add(absolute);
    }
  };
  for (const input of paths) visit(input);
  return [...files].sort((a, b) => a.localeCompare(b));
}

export function processFiles(paths, { write = false } = {}) {
  return collectFiles(paths).map((file) => {
    const before = readFileSync(file, 'utf8');
    const cleaned = extname(file).toLowerCase() === '.md'
      ? scrubMarkdownWithCount(before)
      : replaceEmDashesWithCount(before);
    if (write && cleaned.text !== before) writeFileSync(file, cleaned.text, 'utf8');
    return { file, count: cleaned.count, changed: cleaned.text !== before };
  });
}

function main(args) {
  const write = args.includes('--write');
  const check = args.includes('--check');
  const unknownFlags = args.filter((arg) => arg.startsWith('--') && arg !== '--write' && arg !== '--check');
  const paths = args.filter((arg) => !arg.startsWith('--'));

  if (write && check) {
    console.error('--write and --check are mutually exclusive');
    return 2;
  }
  if (unknownFlags.length > 0) {
    console.error(`Unknown option: ${unknownFlags[0]}`);
    return 2;
  }
  if (paths.length === 0) {
    console.error('Usage: node tools/scrub-emdashes.mjs <paths...> [--write|--check]');
    return 2;
  }

  try {
    const results = processFiles(paths, { write });
    for (const result of results) {
      console.log(`${result.file}: ${result.count} replacement${result.count === 1 ? '' : 's'}`);
    }
    const total = results.reduce((sum, result) => sum + result.count, 0);
    if (check && total > 0) return 1;
    return 0;
  } catch (error) {
    console.error(error.message);
    return 2;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
