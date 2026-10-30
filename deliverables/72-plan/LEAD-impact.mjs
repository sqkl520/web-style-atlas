/* 改动的影响面：29 个非 S14 案的配色句有没有被动到？ */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const R = new URL('../../prototypes/', import.meta.url);
const ps = readFileSync(new URL('_selection/prompts.js', R), 'utf8');
const sp = JSON.parse(ps.slice(ps.indexOf('{', ps.indexOf('window.STYLE_PROMPTS'))).replace(/;\s*$/, ''));

/* HEAD 版本的配色句（对比基准）*/
const headSrc = execSync('git show HEAD:prototypes/_selection/prompts.js', { cwd: 'D:/Web/style', encoding: 'utf8', maxBuffer: 1 << 28 });
const head = JSON.parse(headSrc.slice(headSrc.indexOf('{', headSrc.indexOf('window.STYLE_PROMPTS'))).replace(/;\s*$/, ''));

const hexOnly = (s) => (String(s).toUpperCase().match(/#[0-9A-F]{6}/g) || []).join(',');
const norm = (s) => String(s).replace(/\s*×\d+/g, '').trim();

let changed = 0;
const rows = [];
for (const s of sp.schemes) {
  const h = head.schemes.find((x) => x.id === s.id);
  const nowPal = norm(s.dna.palette);
  const oldPal = norm(h.dna.palette);
  const same = nowPal === oldPal;
  if (!same) changed++;
  rows.push({ id: s.id, same, oldPal, nowPal });
}
console.log(`配色句变化的案: ${changed}/30\n`);
for (const r of rows) if (!r.same) {
  console.log(`${r.id}`);
  console.log(`  旧: ${r.oldPal}`);
  console.log(`  新: ${r.nowPal}`);
}

console.log('\n═══ 全长变化 ═══');
const lenNow = sp.schemes.map((s) => s.text.length).sort((a, b) => a - b);
const lenOld = head.schemes.map((s) => s.text.length).sort((a, b) => a - b);
const stat = (a) => `min ${a[0]}  median ${a[Math.floor(a.length / 2)]}  max ${a[a.length - 1]}`;
console.log('  旧:', stat(lenOld));
console.log('  新:', stat(lenNow));
