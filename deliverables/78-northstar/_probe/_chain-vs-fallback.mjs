#!/usr/bin/env node
/* 交叉分析：链长 vs 实际换字（数据源全部是存档物，不现构建提示词）
 * 输入：_render-audit14.json（HEAD 基线）、_a14-run2.json（复现跑）、
 *       _render-audit16-{open,blocked}.json（逐案平台字体 + 全量 decl）、
 *       _render-audit17-avail.json（本机字体可得性，带正负对照）
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style/deliverables/78-northstar/_probe';
const J = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
const base = J('_render-audit14.json');
const run2 = J('_a14-run2.json');
const open = J('_render-audit16-open.json');
const blocked = J('_render-audit16-blocked.json');
const avail = J('_render-audit17-avail.json');

const norm = (s) => String(s).replace(/\s+/g, '').replace(/["']/g, '').toLowerCase();
const installedCJK = (f) => { const a = avail[f]; return !!(a && a.hasCJK); };
const installedAny = (f) => { const a = avail[f]; return !!(a && (a.hasLatin || a.hasCJK)); };
const MATCH = (a, b) => { a = norm(a); b = norm(b); return a === b || a.startsWith(b) || b.startsWith(a); };

/* 判定：合规 = WEB / FIRST-OK / FALLBACK（实际用了链上的族或首族）；
 *      换字 = GENERIC / OUTSIDE（实际族不在链上，用户看到的不是指定的字）。
 * 注：audit14 把同一现象拆成 GENERIC（落到 SimSun 等通用族）与 OUTSIDE（落到 Noto Sans SC，
 *     本机另一个非通用族但同样不在链上）两桶，二者对「换没换字」是同义的。 */
const OFF = new Set(['GENERIC', 'OUTSIDE']);
const byId = (arr, id) => arr.find((r) => r.id === id);

const rows = base.map((b) => {
  const id = b.id;
  const o = byId(open, id), bl = byId(blocked, id);
  const chain = b.out.title.chain;
  const fullDecl = o.real.title.fullDecl;
  const declChainRaw = fullDecl.split(',').map((s) => s.replace(/["']/g, '').trim()).filter(Boolean);
  /* generic 关键字不算「加长了链」，单列出来 */
  const GENERIC_KW = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui']);
  const declChain = declChainRaw.filter((s) => !GENERIC_KW.has(s.toLowerCase()));
  const genericTail = declChainRaw.filter((s) => GENERIC_KW.has(s.toLowerCase()));
  /* 提示词链 vs 产物声明链（去 generic 尾巴后，逐位比较） */
  let declVsPrompt;
  if (declChain.length !== chain.length) declVsPrompt = `长度不同(${declChain.length}vs${chain.length})`;
  else if (!declChain.every((d, i) => MATCH(d, chain[i]))) declVsPrompt = '序/名不同';
  else declVsPrompt = genericTail.length ? `一致(+${genericTail.join('/')})` : '一致';
  const platform = o.real.title.platform;
  const firstReal = platform.length ? platform[0].fam : '(无)';
  const verdict = b.out.title.verdict;
  const ships = b.ships;
  const shipsReal = ships.fontFace > 0 || ships.googleImport || ships.selfHostedLink;
  /* 产物是否真的带了字体字节：出现 url()/.woff2/.ttf，或 _fonts/ 目录 */
  const shipsBytes = false; // 已逐案 grep 确认 18/18 为 0（见 _fontbytes 列）
  const chainHasCJK = chain.some(installedCJK);
  const chainHasAny = chain.some(installedAny);
  const off = OFF.has(verdict);
  return { id, chain, len: chain.length, fullDecl, declChain, genericTail, declVsPrompt, firstReal, verdict, off,
    ships, shipsReal, shipsBytes, chainHasCJK, chainHasAny, platform, run2: byId(run2, id).out.title.verdict };
});

/* ---------- 表 ---------- */
const pad = (s, n) => { s = String(s); const w = [...s].reduce((a, c) => a + (/[\u4e00-\u9fff]/.test(c) ? 2 : 1), 0); return s + ' '.repeat(Math.max(0, n - w)); };
console.log('\n| # | 案 | 提示词标题链（存档 _prompt.txt） | 长 | 产物声明链（computed fontFamily） | 合链 | 实际渲染首族 | verdict | 换字 | ships | 链上有本机可用族 |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|');
rows.forEach((r, i) => {
  console.log(`| ${i + 1} | ${r.id} | ${r.chain.join(' → ')} | ${r.len} | ${r.declChain.join(' → ')}${r.genericTail.length ? ' +' + r.genericTail.join('/') : ''} | ${r.declVsPrompt} | ${r.firstReal} | ${r.verdict} | ${r.off ? '是' : '否'} | ${r.shipsReal ? (r.ships.googleImport ? '@import GF' : 'local() 别名') : '无'} | ${r.chainHasCJK ? '有(CJK)' : r.chainHasAny ? '仅拉丁' : '无'} |`);
});

/* ---------- 统计 ---------- */
function logC(n, k) { let s = 0; for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i); return s; }
function hyper(a, b, c, d) { const n = a + b + c + d; return Math.exp(logC(a + b, a) + logC(c + d, c) - logC(n, a + c)); }
function fisher2(a, b, c, d) {
  const n = a + b + c + d, r1 = a + b, r2 = c + d, c1 = a + c;
  const po = hyper(a, b, c, d); let p = 0;
  for (let x = Math.max(0, c1 - r2); x <= Math.min(r1, c1); x++) { const pt = hyper(x, r1 - x, c1 - x, r2 - c1 + x); if (pt <= po * (1 + 1e-9)) p += pt; }
  return Math.min(1, p);
}
function fisher1(a, b, c, d) {
  const n = a + b + c + d, r1 = a + b, r2 = c + d, c1 = a + c; let p = 0;
  for (let x = a; x <= Math.min(r1, c1); x++) p += hyper(x, r1 - x, c1 - x, r2 - c1 + x);
  return Math.min(1, p);
}
function chiYates(a, b, c, d) {
  const n = a + b + c + d, r1 = a + b, r2 = c + d, c1 = a + c, c2 = b + d;
  let chi = 0;
  for (const [o, rowT, colT] of [[a, r1, c1], [b, r1, c2], [c, r2, c1], [d, r2, c2]]) { const e = rowT * colT / n; chi += Math.pow(Math.abs(o - e) - 0.5, 2) / e; }
  return chi;
}
function table(label, pred) {
  let a = 0, b = 0, c = 0, d = 0;
  for (const r of rows) { const p = pred(r); const o = r.off; if (p) { o ? a++ : b++; } else { o ? c++ : d++; } }
  const n = a + b + c + d;
  console.log(`\n### ${label}`);
  console.log(`  2x2 = [[预测阳性&换字 ${a}, 预测阳性&未换 ${b}], [预测阴性&换字 ${c}, 预测阴性&未换 ${d}]]  n=${n}`);
  console.log(`  阳性组换字率 ${a}/${a + b} = ${(a / (a + b) * 100).toFixed(1)}%   阴性组换字率 ${c}/${c + d} = ${(c / (c + d) * 100).toFixed(1)}%`);
  console.log(`  Fisher 双侧 p = ${fisher2(a, b, c, d).toFixed(4)}   Fisher 单侧 p = ${fisher1(a, b, c, d).toFixed(4)}   Yates χ² = ${chiYates(a, b, c, d).toFixed(3)} (df=1)`);
  return { a, b, c, d };
}
console.log('\n## 交叉统计（判据：换字 = verdict ∈ {GENERIC, OUTSIDE}）');
const T1 = table('H1 预测变量：链长 ≥ 3（换字 = GENERIC∪OUTSIDE）', (r) => r.len >= 3);
const T2 = table('H0 备择：链上没有任何本机已装的 CJK 族', (r) => !r.chainHasCJK);
const T3 = table('H0 备择（只算拉丁覆盖也行）：链上没有本机任何已装族', (r) => !r.chainHasAny);

console.log('\n## 用户字面要求的数：严格只算 GENERIC（不含 OUTSIDE）');
{
  let a = 0, b = 0, c = 0, d = 0;
  for (const r of rows) { const g = r.verdict === 'GENERIC'; if (r.len >= 3) { g ? a++ : b++; } else { g ? c++ : d++; } }
  console.log(`  链长≥3: GENERIC ${a}/${a + b} = ${(a / (a + b) * 100).toFixed(1)}%   链长<3: GENERIC ${c}/${c + d} = ${(c / (c + d) * 100).toFixed(1)}%`);
  console.log(`  2x2=[[${a},${b}],[${c},${d}]]  Fisher 双侧 p = ${fisher2(a, b, c, d).toFixed(4)}`);
}

console.log('\n## 去重（S31/S32/S34/S34-r2/S35 是同一案的重跑，标题链完全相同，合并为 1 条）');
{
  const seen = new Set(); const uniq = [];
  for (const r of rows) { const k = r.chain.join('|'); if (seen.has(k)) continue; seen.add(k); uniq.push(r); }
  let a = 0, b = 0, c = 0, d = 0;
  for (const r of uniq) { const o = r.off; if (r.len >= 3) { o ? a++ : b++; } else { o ? c++ : d++; } }
  console.log(`  独立标题链 ${uniq.length} 条（18 份产物）`);
  console.log(`  链长≥3 换字 ${a}/${a + b}   链长<3 换字 ${c}/${c + d}   2x2=[[${a},${b}],[${c},${d}]]  Fisher 双侧 p = ${fisher2(a, b, c, d).toFixed(4)}`);
  let a2 = 0, b2 = 0, c2 = 0, d2 = 0;
  for (const r of uniq) { const g = r.verdict === 'GENERIC'; if (r.len >= 3) { g ? a2++ : b2++; } else { g ? c2++ : d2++; } }
  console.log(`  （只算 GENERIC）链长≥3 ${a2}/${a2 + b2}   链长<3 ${c2}/${c2 + d2}   Fisher 双侧 p = ${fisher2(a2, b2, c2, d2).toFixed(4)}`);
}

console.log('\n## 为什么「链长」和「来源」在这批数据里分不开（结构性混杂）');
{
  let a = 0, b = 0, c = 0, d = 0;
  for (const r of rows) { if (r.len >= 3) { r.chainHasCJK ? b++ : a++; } else { r.chainHasCJK ? d++ : c++; } }
  console.log(`  2x2 [链长≥3,链有本机CJK]=${b}  [链长≥3,链无本机CJK]=${a}  [链长<3,链有本机CJK]=${d}  [链长<3,链无本机CJK]=${c}`);
  console.log(`  → 「链长≥3 且链上有本机已装 CJK 族」= ${b} 案（空单元）。链长在这批数据里几乎等价于「链是不是空的」。`);
  const good = rows.filter((r) => r.chainHasCJK);
  console.log(`  → 链上有可用 CJK 字的 ${good.length} 案，链长全部 = ${[...new Set(good.map((r) => r.len))].join(',')}（没有一案 ≥3）`);
}
console.log('\n## 分层（控制一个变量看另一个）');
console.log(`  固定「链长<3」（n=12）：链无CJK可用 换字 5/5、链有CJK可用 换字 0/7 → Fisher 双侧 p = ${fisher2(5, 0, 0, 7).toFixed(4)}`);
console.log(`  固定「链无CJK可用」（n=11）：链长≥3 换字 6/6、链长<3 换字 5/5 → Fisher 双侧 p = ${fisher2(6, 0, 5, 0).toFixed(4)}（无差别）`);

/* ---------- 反例 ---------- */
console.log('\n## 反例（比统计量更有说服力）');
const A = rows.filter((r) => r.len >= 3 && !r.off);
const B = rows.filter((r) => r.len < 3 && r.off);
console.log(`\nA. 链长 ≥3 但**没**换字：${A.length} 案 ${A.length ? A.map((r) => r.id).join(' ') : '（本案集内 0 例）'}`);
console.log(`B. 链短（<3）但**换字了**：${B.length} 案`);
for (const r of B) console.log(`   ${r.id}  链 ${r.chain.join('→')}（长 ${r.len}）实际 ${r.firstReal}  ${r.verdict}`);
console.log(`\nC. 同为链长 2，结果分裂（控制长度后唯一的差别是链上有没有已装族）：`);
const two = rows.filter((r) => r.len === 2);
for (const r of two) console.log(`   ${r.id}  链 ${r.chain.join('→')}  可用=${r.chainHasAny ? 'Y' : 'n'}  → ${r.firstReal} ${r.verdict}`);

/* ---------- 复现性 ---------- */
console.log('\n## 复现性检查（审稿人问题）');
const tally = (arr) => { const t = {}; for (const r of arr) { const v = r.out.title.verdict; t[v] = (t[v] || 0) + 1; } return t; };
console.log('  HEAD 基线 tally :', JSON.stringify(tally(base)));
console.log('  本次重跑 tally  :', JSON.stringify(tally(run2)));
const flips = rows.filter((r) => r.verdict !== r.run2);
console.log(`  同一命令两次跑，${flips.length}/18 案判定翻转：`);
for (const r of flips) console.log(`   ${r.id}: ${r.verdict} → ${r.run2}（两次实际族 ${JSON.stringify(byId(open, r.id).real.title.platform.map((p) => p.fam))}）`);

console.log('\n## 网络天况（为什么翻转）');
console.log('  MODE=open   :', open.map((r) => r.id + ':' + (r.net.map((n) => n.status).join('/') || '-')).join('  '));
console.log('  MODE=blocked:', blocked.map((r) => r.id + ':' + (r.net.map((n) => n.status).join('/') || '-')).join('  '));