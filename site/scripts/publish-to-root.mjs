import { cpSync, readdirSync } from 'node:fs';
for (const d of readdirSync('dist', { withFileTypes: true })) {
  if (!d.isDirectory() || d.name === 'assets') continue;
  cpSync(`dist/${d.name}`, `../${d.name}`, { recursive: true });   // dist/labor -> ../labor (repo root)
  console.log('published', d.name);
}
cpSync('dist/assets', '../assets', { recursive: true });
console.log('refreshed ../assets');
