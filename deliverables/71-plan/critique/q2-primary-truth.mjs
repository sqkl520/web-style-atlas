// Q2 核心探针：app.js 把 palette[1] 印成「主色」，它真的是主色吗？
// 权威源：_CURRENT-VALUES.md 的「主色（当前）」列；该列写「见 _specs/Sxx.md」的，回落到 Sxx.md 字段 3。
// 这是本报告最重要的一条证据 —— 请独立复跑，不要信我。
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const P = join(ROOT, 'prototypes');

const win = { window: {} };
new Function('window', readFileSync(join(P, '_selection/data.js'), 'utf8'))(win.window);
const SCHEMES = win.window.SCHEMES || [];
const dM = new Map(SCHEMES.map((s) => [s.id, s]));

const cvLines = readFileSync(join(P, '_specs/_CURRENT-VALUES.md'), 'utf8').split(/\r?\n/);
const HEX = /#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/;

function authPrimary(id) {
  // 1) CV 表：| **S05** 名 | 背景 | 主色 | ...
  const row = cvLines.find((l) => new RegExp('\\|\\s*\\*\\*' + id + '\\*\\*').test(l));
  if (row) {
    const cells = row.split('|').map((x) => x.trim());
    const m = (cells[3] || '').match(HEX);
    if (m) return { hex: m[0].toUpperCase(), src: 'CV表' };
  }
  // 2) 回落：字段 3 里带「主色」角色的分句。排掉「反的是 …主色」这种否定语境。
  const md = readFileSync(join(P, '_specs', id + '.md'), 'utf8');
  const i = md.indexOf('配色系统');
  if (i < 0) return null;
  const p3 = md.slice(i, i + 900);
  const clause = p3.split(/[；。]/).find((c) => /主色/.test(c) && !/反的是|既不是|不采用/.test(c));
  if (!clause) return null;
  const m = clause.match(HEX);
  return m ? { hex: m[0].toUpperCase(), src: '规格字段3' } : null;
}

const rows = [];
for (const id of [...dM.keys()].sort()) {
  const a = authPrimary(id);
  if (!a) continue;
  const shown = String((dM.get(id).palette || [])[1] || '').toUpperCase();
  rows.push({ id, auth: a.hex, shown, src: a.src, ok: a.hex === shown });
}

const bad = rows.filter((r) => !r.ok);
console.log('=== app.js:963 把 palette[1] 印成「主色」，与权威主色比对 ===\n');
console.log('案     UI 印作「主色」   权威主色       来源');
console.log('-'.repeat(64));
for (const r of rows) {
  console.log(`${r.id}   ${r.shown}          ${r.auth}       ${r.src}  ${r.ok ? '' : '  ✗ 不符'}`);
}
console.log('-'.repeat(64));
console.log(`\n一致 ${rows.length - bad.length}/${rows.length}   不符 ${bad.length}/${rows.length}\n`);
if (bad.length) {
  console.log('!!! 不符的案（这些是「列错了」，不是「少列了」）:');
  for (const b of bad) console.log(`  ${b.id}  UI=${b.shown}  权威=${b.auth}  (${b.src})`);
  console.log('\n注意：这些案在 check-twolines.mjs 的 R1/R2/R3/R4 上全是绿的 —— 见 q6-tautology.mjs');
}
process.exit(bad.length ? 1 : 0);
