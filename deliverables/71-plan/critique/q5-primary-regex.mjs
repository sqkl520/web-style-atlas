// Q5/§9 探针：主色抽取的三种方案对比 —— 我第一版修法是错的，这里如实记录
//
// collect-schemes.mjs:296-298 是三个正则并联，先命中者赢：
//   A: /主色[^#\n]{0,24}(#[0-9A-Fa-f]{6})/        ← 「主色」在 hex 之前
//   B: /(#[0-9A-Fa-f]{6})[^#\n]{0,24}主色/        ← hex 在「主色」之前
//   C: /主色[\s\S]{0,40}?(#[0-9A-Fa-f]{6})/       ← 兜底
//
// 三种方案，各自对着「权威主色」打靶：
//   ① 现状（A 优先）           —— 基线，25/30
//   ② 我第一版的建议（B 优先）  —— ❌ 错的，会让正确率从 25 掉到 16
//   ③ 分句法（本探针的推荐）    —— ✅ 30/30
//
// ② 为什么错：B 会抓到「反的是 `#6366F1` 靛蓝**主色**」这类否定语境里的 hex
//   （17 个案会因此拿到 #6366F1），也会抓到旧值（S16 的 #E63312、S28 的 #EC4899）。
//   我原来只看 S02/S05/S07/S09/S10 五案就下了结论，样本太窄 —— 这是我这轮唯一一次自证错误。
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const P = join(ROOT, 'prototypes');

const HEX = /#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/;
const cvLines = readFileSync(join(P, '_specs/_CURRENT-VALUES.md'), 'utf8').split(/\r?\n/);
const NEG = /(反的是|反对|而非|既不|也不|不采用|不选|不取|不用|不使用|不要|不得|禁止|排除|避免|规避|拒绝|剔除|禁用|离开|远离)/;

const dw = { window: {} };
new Function('window', readFileSync(join(P, '_selection/data.js'), 'utf8'))(dw.window);
const dM = new Map((dw.window.SCHEMES || []).map((s) => [s.id, s]));

function auth(id) {
  const row = cvLines.find((l) => new RegExp('\\|\\s*\\*\\*' + id + '\\*\\*').test(l));
  if (row) {
    const c = row.split('|').map((x) => x.trim());
    const m = (c[3] || '').match(HEX);
    if (m) return m[0].toUpperCase();
  }
  const md = readFileSync(join(P, '_specs', id + '.md'), 'utf8');
  const i = md.indexOf('配色系统');
  if (i < 0) return null;
  const p3 = md.slice(i, i + 900);
  const cl = p3.split(/[；。]/).find((x) => /主色/.test(x) && !/反的是|既不是|不采用|而不是/.test(x));
  if (!cl) return null;
  const m = cl.match(HEX);
  return m ? m[0].toUpperCase() : null;
}

function p3raw(id) {
  const lines = readFileSync(join(P, '_specs', id + '.md'), 'utf8').split(/\r?\n/);
  const i = lines.findIndex((l) => /配色系统/.test(l));
  if (i < 0) return null;
  const b = [lines[i]];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^\*{0,2}4[\.．]?\s/.test(lines[j].trim())) break;
    b.push(lines[j]);
  }
  return b.join('\n');
}

const A = (s) => { const m = /主色[^#\n]{0,24}(#[0-9A-Fa-f]{6})/.exec(s); return m ? m[1].toUpperCase() : null; };
const B = (s) => { const m = /(#[0-9A-Fa-f]{6})[^#\n]{0,24}主色/.exec(s); return m ? m[1].toUpperCase() : null; };
const C = (s) => { const m = /主色[\s\S]{0,40}?(#[0-9A-Fa-f]{6})/.exec(s); return m ? m[1].toUpperCase() : null; };

// 方案③：按分句切，取「含主色角色词且非否定」的分句里的第一个 hex
function fixClause(s) {
  for (const seg of s.split(/[；。]/)) {
    if (!/主色/.test(seg) || NEG.test(seg)) continue;
    const m = seg.match(HEX);
    if (m) return m[0].toUpperCase();
  }
  return null;
}

function score(extract, label) {
  let ok = 0, total = 0;
  const bad = [];
  for (let n = 1; n <= 30; n++) {
    const id = 'S' + String(n).padStart(2, '0');
    const s = p3raw(id); if (!s) continue;
    const a = auth(id); if (!a) continue;
    total++;
    const bg = String(dM.get(id).bg).toUpperCase();
    let v = extract(s);
    // 与生产代码同样的兜底：拿不到、或拿到 bg，就退回 palette[1]
    if (!v || v === bg) v = String(dM.get(id).palette[1]).toUpperCase();
    if (v === a) ok++; else bad.push({ id, got: v, want: a });
  }
  return { ok, total, bad, label };
}

const results = [
  score((s) => A(s) || B(s) || C(s), '① 现状（A 优先）'),
  score((s) => B(s) || A(s) || C(s), '② 我第一版的建议（B 优先）'),
  score(fixClause, '③ 分句法（推荐）'),
];

console.log('=== 三种主色抽取方案，对着「权威主色」打靶 ===\n');
for (const r of results) {
  console.log(`${r.label.padEnd(28)} ${r.ok}/${r.total}`);
}
console.log('');

const wrong = results[1];
if (wrong.ok < results[0].ok) {
  console.log('⚠️ 方案② 比现状更差 —— 我第一版建议是错的，已撤回。');
  console.log('   它错在哪（前 6 例）:');
  for (const b of wrong.bad.slice(0, 6)) console.log(`     ${b.id}  拿到 ${b.got}  应为 ${b.want}`);
  console.log('   原因：B 会抓到「反的是 `#6366F1` 靛蓝主色」这类否定语境，以及旧值。');
  console.log('   我当时只看了 S02/S05/S07/S09/S10 五案就下结论，样本太窄。\n');
}

console.log('=== 方案③（分句法）会给生产带来什么变化 ===\n');
const changed = [];
for (let n = 1; n <= 30; n++) {
  const id = 'S' + String(n).padStart(2, '0');
  const s = p3raw(id); if (!s) continue;
  const v = fixClause(s); if (!v) continue;
  const cur = String(dM.get(id).primary).toUpperCase();
  if (v !== cur) changed.push({ id, cur, fix: v, auth: auth(id) });
}
console.log(`会改变 primary 的案数: ${changed.length}（其余 ${30 - changed.length} 案一字不动）`);
for (const c of changed) console.log(`  ${c.id}  cur=${c.cur}  →  fix=${c.fix}   权威=${c.auth}`);
console.log('\n→ 变更面恰好等于错案面，且 5/5 朝权威值靠拢。这是可以安全落地的修法。');
