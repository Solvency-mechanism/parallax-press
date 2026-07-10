import { readFileSync, existsSync } from 'node:fs';

const slug = 'the-bill-comes-due-in-the-body-health-and-environmental-costs-in-the-san-joaquin-valley';
const articlePath = `../press/${slug}/index.html`;
const pressIndexPath = '../press/index.html';
const homePath = '../index.html';

const checks = [
  [existsSync(articlePath), `article exists at /press/${slug}/`],
  [existsSync(pressIndexPath), 'Press index exists at /press/'],
  [readFileSync(articlePath, 'utf8').includes('Claims to Avoid'), 'article includes the evidence-discipline section'],
  [readFileSync(articlePath, 'utf8').includes('Cite this Post'), 'article includes a citation block'],
  [readFileSync(pressIndexPath, 'utf8').includes('The Bill Comes Due in the Body'), 'Press index links the first Post'],
  [readFileSync(homePath, 'utf8').includes(`/press/${slug}/`), 'homepage links the first Post'],
];

let failed = false;
for (const [ok, message] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${message}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
