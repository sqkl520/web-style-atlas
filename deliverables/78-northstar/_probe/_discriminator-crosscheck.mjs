/* 阴性对照：判别值检验法自己在测什么？
 *
 * 主判据（_discriminator-check.mjs）说：每案产物命中自己提示词的判别值 64/64。
 * 但「命中」只要求产物里出现那个数字/色值。如果 60px 只是常见布局值，
 * 那么任何一份产物都可能「命中」它 —— 那样我量到的是巧合，不是知识。
 *
 * 本脚本做三件事：
 *   1. 交叉矩阵：A 案产物 × B 案判别值。对角线应远高于非对角线。
 *   2. 基线：判别值在「与本案无关的产物」里的随机命中率。
 *   3. 严格档：只算「只在这一份任务书里出现且本案产物含它的专属上下文」的强判别值。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BLIND = join(ROOT, 'deliverables/78-northstar/blind');
const STAGED = join(ROOT, 'deliverables/78-northstar/_probe/_staged');

const ids = readdirSync(BLIND, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}$/.test(d.name))
  .map((d) => d.name)
  .sort();

const tokensOf = (txt) => {
  const s = new Set();
  for (const m of txt.matchAll(/#[0-9A-Fa-f]{6}/g)) s.add(m[0].toUpperCase());
  for (const m of txt.matchAll(/\b\d+(?:\.\d+)?(?:px|vw|fr|mm|%)\b/g)) s.add(m[0]);
  return s;
};

const allTokens = {};
for (const id of ids) {
  const p = join(BLIND, id, 'task.txt');
  if (!existsSync(p)) continue;
  allTokens[id] = tokensOf(readFileSync(p, 'utf8'));
}

/* 判别值 */
const disc = {};
for (const id of Object.keys(allTokens)) {
  const others = new Set();
  for (const [o, s] of Object.entries(allTokens)) {
    if (o === id) continue;
    for (const t of s) others.add(t);
  }
  disc[id] = [...allTokens[id]].filter((t) => !others.has(t));
}

/* 产物 */
const artifactOf = (id) => {
  for (const n of [`${id}-sandbox.html`, `${id}-judge.html`, `${id}.html`]) {
    const f = join(STAGED, n);
    if (existsSync(f)) return readFileSync(f, 'utf8').toUpperCase();
  }
  return null;
};

const hitOne = (html, t) => {
  if (t.startsWith('#')) return html.includes(t);
  const num = t.replace(/[a-z%]+$/, '');
  const unit = t.slice(num.length);
  /* 单位必须一致 —— 详见 _discriminator-check.mjs 里同一函数的注释。
   * 这个 bug 是三份脚本共用的（check / crosscheck / evidence-gate），
   * 由 _discriminator-check 的自测用例先抓到。 */
  return new RegExp(`(^|[^\\d.])${num.replace('.', '\\.')}\\s*${unit}`, 'i').test(html);
};

const withArtifact = Object.keys(disc).filter((id) => artifactOf(id) && disc[id].length);

console.log('=== 1. 交叉矩阵：行=产物，列=他人判别值，格子=命中率 ===');
console.log('（对角线 = 自己命中自己；非对角线 = 巧合基线）\n');
const header = '产物\\判别'.padEnd(9) + withArtifact.map((x) => x.padStart(6)).join('');
console.log(header);
const diag = {}, offdiag = [];
for (const rowId of withArtifact) {
  const html = artifactOf(rowId);
  let line = rowId.padEnd(9);
  for (const colId of withArtifact) {
    const ts = disc[colId];
    const h = ts.filter((t) => hitOne(html, t)).length;
    const pct = Math.round((h / ts.length) * 100);
    if (rowId === colId) diag[rowId] = pct;
    else offdiag.push({ row: rowId, col: colId, h, n: ts.length, pct });
    line += `${h}/${ts.length}`.padStart(6);
  }
  console.log(line);
}

const diagAvg = Object.values(diag).reduce((a, b) => a + b, 0) / Object.values(diag).length;
const offH = offdiag.reduce((a, x) => a + x.h, 0);
const offN = offdiag.reduce((a, x) => a + x.n, 0);
const offAvg = (offH / offN) * 100;

console.log(`\n对角线（本案×本案）平均命中率: ${diagAvg.toFixed(1)}%`);
console.log(`非对角线（本案×他人）平均命中率: ${offAvg.toFixed(1)}%   [${offH}/${offN}]`);

/* 逐 token 的真实基线：每个判别值在多少份「无关产物」里出现 */
console.log('\n=== 2. 逐判别值基线：该值在无关产物里出现几次 ===');
const rows = [];
for (const id of withArtifact) {
  const html = artifactOf(id);
  for (const t of disc[id]) {
    const others = withArtifact.filter((x) => x !== id);
    const inOthers = others.filter((x) => hitOne(artifactOf(x), t)).length;
    rows.push({ id, t, inOthers, nOthers: others.length, inSelf: hitOne(html, t) });
  }
}
const coincidental = rows.filter((r) => r.inOthers > 0);
console.log(`判别值总数 ${rows.length}，其中在「别的产物」里也出现的 ${coincidental.length} 个：`);
for (const r of coincidental.sort((a, b) => b.inOthers - a.inOthers).slice(0, 25)) {
  console.log(`  ${r.id.padEnd(5)} ${r.t.padEnd(9)} 在 ${r.inOthers}/${r.nOthers} 份无关产物里出现   自身命中=${r.inSelf}`);
}
const cleanTotal = rows.filter((r) => r.inOthers === 0).length;
const cleanHit = rows.filter((r) => r.inOthers === 0 && r.inSelf).length;
console.log(`\n【干净判别值】（零份无关产物含它）: ${cleanTotal} 个`);
console.log(`  其中自身产物命中: ${cleanHit} 个 = ${((cleanHit / Math.max(1, cleanTotal)) * 100).toFixed(1)}%`);
console.log('  ← 这一行才是排除巧合后的真实证据强度');
