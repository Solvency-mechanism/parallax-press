import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Optional path allows the exact candidate to be checked before copying it.
const root = resolve(process.argv[2] || '..');
const guide = '/press/the-bill-comes-due-in-the-body-health-and-environmental-costs-in-the-san-joaquin-valley/';
const references = [
  '/capital/externalization/',
  '/the-state/disadvantaged-unincorporated-communities/',
  '/the-state/nitrate-and-arsenic-contamination-in-disadvantaged-communities/',
  '/the-state/human-right-to-water/',
  '/the-state/pesticide-exposure-in-the-san-joaquin-valley/',
  '/the-state/san-joaquin-valley-air-quality/',
];
const collection = '/collections/rural-california/';
const release = [collection, guide, ...references];
let failures = 0;
function check(ok, message) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${message}`);
  if (!ok) failures++;
}
function htmlAt(route) {
  const path = join(root, route, 'index.html');
  check(existsSync(path), `page exists: ${route}`);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}
const collectionHTML = htmlAt(collection);
for (const route of release) {
  const html = htmlAt(route);
  if (!html) continue;
  check(html.includes(`rel="canonical" href="https://parallaxpress.org${route}"`), `canonical URL: ${route}`);
  check(!/href=["']#["']|\[\[|\[todo:|editorial pass|Draft for use and revision/i.test(html), `no dead links, placeholders, or draft banner: ${route}`);
  if (route !== collection) {
    check(html.includes(`https://parallaxpress.org${route}`) && html.includes('id="citation"'), `citation uses served URL: ${route}`);
    check(collectionHTML.includes(`href="${route}"`), `collection links to ${route}`);
  }
  if (references.includes(route)) {
    for (const id of ['sec-0', 'sec-1', 'sec-2', 'sec-parallax', 'sec-reading']) {
      check(html.includes(`id="${id}"`), `${route} contains ${id}`);
    }
  }
}
check(htmlAt('/').includes(`href="${collection}"`), 'homepage discovers the collection');
const controls = readFileSync(join(root, 'assets/controls.js'), 'utf8');
check(collectionHTML.includes('id="nav-close"') && controls.includes('getElementById("nav-close")'), 'mobile navigation has a wired close control');
check(!/fonts?\.googleapis/.test(collectionHTML), 'approved system typography');

// Crawl the complete generated site, including navigation and anchors. A source
// can render successfully while still producing a broken public reading path.
function pages(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(item => {
    if (item.name.startsWith('.') || ['site', 'node_modules'].includes(item.name)) return [];
    const path = join(dir, item.name);
    return item.isDirectory() ? pages(path) : item.name.endsWith('.html') ? [path] : [];
  });
}
let links = 0;
for (const page of pages(root)) {
  const html = readFileSync(page, 'utf8');
  const route = '/' + page.slice(root.length + 1).replaceAll('\\', '/').replace(/index\.html$/, '');
  const url = new URL(route, 'https://parallaxpress.org');
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1].replaceAll('&amp;', '&');
    if (href === '#') check(false, `${route} contains a dead # anchor`);
    const target = new URL(href, url);
    if (target.origin !== url.origin) continue;
    const targetPath = join(root, decodeURIComponent(target.pathname), target.pathname.endsWith('/') ? 'index.html' : '');
    if (!existsSync(targetPath)) check(false, `${route} links to missing ${href}`);
    else if (target.hash) {
      const id = decodeURIComponent(target.hash.slice(1));
      const destination = readFileSync(targetPath, 'utf8');
      if (!destination.includes(`id="${id}"`)) check(false, `${route} links to missing fragment ${href}`);
    }
    links++;
  }
}
check(failures === 0, `${links} local links and fragments checked`);
if (failures) process.exit(1);
