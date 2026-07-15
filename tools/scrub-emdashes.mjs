import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const EM_DASH = '\u2014';

export function replaceEmDashes(text) {
  return text.replaceAll(EM_DASH, '-');
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
