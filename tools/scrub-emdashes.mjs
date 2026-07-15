import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const EM_DASH = '\u2014';

export function replaceEmDashes(text) {
  return text.replaceAll(EM_DASH, '-');
}

function scrubWikilink(match, target, alias) {
  if (alias !== undefined) {
    return `[[${target}|${replaceEmDashes(alias)}]]`;
  }
  return target.includes(EM_DASH)
    ? `[[${target}|${replaceEmDashes(target)}]]`
    : match;
}

function scrubMarkdownLine(line) {
  const tokens = [];
  const protect = (value) => {
    const token = `\u0000${tokens.length}\u0000`;
    tokens.push(value);
    return token;
  };

  let visible = line.replace(/`+[^`]*`+/g, protect);
  visible = visible.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (match, target, alias) => protect(scrubWikilink(match, target, alias)),
  );
  visible = visible.replace(
    /\[([^\]]*)\]\(([^)]+)\)/g,
    (_match, label, destination) => protect(`[${replaceEmDashes(label)}](${destination})`),
  );
  visible = visible.replace(/https?:\/\/[^\s<>)\]]+/g, protect);
  visible = replaceEmDashes(visible);
  return visible.replace(/\u0000(\d+)\u0000/g, (_match, index) => tokens[Number(index)]);
}

export function scrubMarkdown(markdown) {
  let fence = null;
  return markdown.split(/(\r?\n)/).map((part) => {
    if (/^\r?\n$/.test(part)) return part;
    const marker = part.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (marker[1][0] === fence) fence = null;
      return part;
    }
    return fence ? part : scrubMarkdownLine(part);
  }).join('');
}

export function extractWikilinkTargets(markdown) {
  return [...markdown.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)]
    .map((match) => match[1]);
}

function replacementCount(before, after) {
  return [...before].filter((char) => char === EM_DASH).length
    - [...after].filter((char) => char === EM_DASH).length;
}

function main(args) {
  if (args.length === 0) {
    console.error('Usage: node tools/scrub-emdashes.mjs <paths...> [--write|--check]');
    return 2;
  }

  for (const input of args) {
    const before = readFileSync(resolve(input), 'utf8');
    const after = replaceEmDashes(before);
    const count = replacementCount(before, after);
    console.log(`${input}: ${count} replacement${count === 1 ? '' : 's'}`);
  }
  return 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
