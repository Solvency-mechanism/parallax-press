import { cpSync, readdirSync } from 'node:fs';
for (const d of readdirSync('dist', { withFileTypes: true })) {
  if (d.name === 'assets') continue;
  if (d.isDirectory()) {
    cpSync(`dist/${d.name}`, `../${d.name}`, { recursive: true });   // dist/labor -> ../labor
    console.log('published dir', d.name);
  } else {
    cpSync(`dist/${d.name}`, `../${d.name}`);                        // dist/index.html -> ../index.html
    console.log('published file', d.name);
  }
}
cpSync('dist/assets', '../assets', { recursive: true });
console.log('refreshed ../assets');
