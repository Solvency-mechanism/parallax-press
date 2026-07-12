import { readFileSync, existsSync } from 'node:fs';

const slug = 'the-bill-comes-due-in-the-body-health-and-environmental-costs-in-the-san-joaquin-valley';
const articlePath = `../press/${slug}/index.html`;
const pressIndexPath = '../press/index.html';
const homePath = '../index.html';

const checks = [
  [existsSync(articlePath), `article exists at /press/${slug}/`],
  [existsSync(pressIndexPath), 'Press index exists at /press/'],
  [existsSync(homePath), 'homepage exists at /'],
  [readFileSync(articlePath, 'utf8').includes('Cite this Post'), 'article includes a citation block'],
  [readFileSync(pressIndexPath, 'utf8').includes('The Bill Comes Due in the Body'), 'Press index links the first Post'],
  [readFileSync(homePath, 'utf8').includes('Welcome to The Common Knowledge Project'), 'homepage renders the Main Page welcome'],
  [!/font[s]?\.googleapis/.test(readFileSync(homePath, 'utf8')), 'homepage loads no webfonts'],
];

let failed = false;
for (const [ok, message] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${message}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
