// check-stale.mjs runs its CLI body on import, so replicate the EXTRA arithmetic instead
// (same formula, same files) and prove the branch would fire on a 6-day-old stamp.
import { readFileSync, statSync, existsSync } from 'node:fs';

const P = 'D:/Web/style/prototypes/';
const rep = P + '_selection/.inspect/report.json';
const at = new Date(JSON.parse(readFileSync(rep, 'utf8').replace(/^\uFEFF/, '')).at).getTime();
const now = Date.now();
console.log('report.at      ', new Date(at).toISOString(), '(UTC)');
console.log('report age     ', ((now - at) / 60000).toFixed(1), 'min');

const SRC = ['index.html', 'style.css', 'app.js', 'prompt-copy.js', 'data.js', 'prompts.js', 'wizard.html', 'wizard.css', 'wizard.js'];
console.log('\nsource file             mtime(UTC)                 delta vs report.at (min)');
let newest = 0, which = '';
for (const f of SRC) {
  const p = P + '_selection/' + f;
  if (!existsSync(p)) { console.log(`  ${f.padEnd(20)} MISSING`); continue; }
  const m = statSync(p).mtimeMs;
  if (m > newest) { newest = m; which = f; }
  console.log(`  ${f.padEnd(20)} ${new Date(m).toISOString()}  ${((m - at) / 60000).toFixed(1)}`);
}
const gap = (newest - at) / 60000;
console.log(`\nnewest source   = ${which}`);
console.log(`gapMin (now)    = ${gap.toFixed(1)}  => > 1 ? ${gap > 1}  => stale? ${gap > 1}`);

const origAt = new Date('2026-10-21T19:51:17Z').getTime();
const origGap = (newest - origAt) / 60000;
console.log(`\n[proof the new branch fires] with the ORIGINAL stamp 2026-10-21T19:51:17Z:`);
console.log(`  gapMin = ${origGap.toFixed(0)} min (= ${(origGap / 1440).toFixed(2)} days) => > 1 => WOULD report _selection stale: ${origGap > 1}`);
