// Probe 5: authoritative reconciliation of gate state.
// data.js (what the product DISPLAYS) vs on-disk reports (what the gate actually PRODUCED)
// vs verify-prototype.mjs (what the shipped checker reports).
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PROTO = 'prototypes';
const dirs = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

const rows = [];
for (const d of dirs) {
  const rp = join(PROTO, d, '.inspect', 'report.json');
  let fail = null, warn = null, at = null;
  if (existsSync(rp)) {
    const j = JSON.parse(readFileSync(rp, 'utf8').replace(/^\uFEFF/, ''));
    fail = (j.findings || []).filter((f) => f.level === 'FAIL').length;
    warn = (j.findings || []).filter((f) => f.level === 'WARN').length;
    at = j.at;
  }
  rows.push({ d, fail, warn, at });
}

// data.js values, in file order (mirrors SCHEMES array order == alphabetical dir order)
const dj = readFileSync(join(PROTO, '_selection', 'data.js'), 'utf8');
const dirNames = [...dj.matchAll(/"dir":\s*"([^"]+)"/g)].map((m) => m[1]);
const djFail = [...dj.matchAll(/"fail":\s*(\d+)/g)].map((m) => +m[1]);
const djWarn = [...dj.matchAll(/"warn":\s*(\d+)/g)].map((m) => +m[1]);
const djMap = new Map();
dirNames.forEach((n, i) => djMap.set(n, { fail: djFail[i], warn: djWarn[i] }));

console.log('dir                                     disk:FAIL/WARN   data.js:FAIL/WARN   match');
let diskFail = 0, diskClean = 0, djTotalFail = 0, mismatches = [];
for (const r of rows) {
  const dj2 = djMap.get(r.d);
  const ok = dj2 && dj2.fail === r.fail && dj2.warn === r.warn;
  if (!ok) mismatches.push(r.d);
  if (r.fail != null) { diskFail += r.fail; if (r.fail === 0) diskClean++; }
  if (dj2) djTotalFail += dj2.fail;
  console.log(
    `${r.d.padEnd(40)} ${String(r.fail)}/${String(r.warn)}`.padEnd(58) +
    `${dj2 ? dj2.fail + '/' + dj2.warn : 'MISSING'}`.padEnd(20) + (ok ? '' : ' <-- MISMATCH')
  );
}
console.log(`\nDISK   : clean(FAIL==0) = ${diskClean}/${rows.length}   total FAIL = ${diskFail}`);
console.log(`data.js: clean(FAIL==0) = ${djFail.filter((x) => x === 0).length}/${djFail.length}   total FAIL = ${djTotalFail}`);
console.log(`mismatches: ${mismatches.length} -> ${mismatches.join(', ') || '(none)'}`);
console.log(`\n=> the header on the selection page prints data.js's clean count, not disk truth.`);
