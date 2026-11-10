// P13：更硬的口径 —— 每一轮「新增的可执行源码行」到 HEAD 还有多少活着（逐行存活率）
// 存活 = 该行文本（去缩进）在 HEAD 同一文件里仍存在至少一次。
// 这只是近似（重复行会虚高），所以同时给一个"整文件重写"的强信号。
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { HERE } from './_lib.mjs';

const ROOT = 'D:/Web/style';
const sh = (c) => execSync(c, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const COMMITS = ['eec843f', 'cea8436', '87a0235', 'd669ddb', 'e08ba2d', 'a56426e', 'a0c0d54'];
const CODE = /^(prototypes|templates)\/.*\.(js|mjs|css|html)$/;

const headCache = {};
function headLines(f) {
  if (!(f in headCache)) {
    const p = join(ROOT, f);
    headCache[f] = existsSync(p) ? readFileSync(p, 'utf8').split(/\r?\n/) : [];
  }
  return headCache[f];
}

console.log('== 每轮新增的可执行源码行，到 HEAD 的存活率 ==');
const rows = [];
for (const c of COMMITS) {
  const diff = sh(`git show --unified=0 --format="" ${c} -- .`);
  let file = null; const added = {};
  for (const line of diff.split(/\r?\n/)) {
    const m = /^\+\+\+ b\/(.+)$/.exec(line);
    if (m) { file = m[1]; continue; }
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    if (!file || !CODE.test(file)) continue;
    const txt = line.slice(1).trim();
    if (txt.length < 4) continue;                     // 纯括号/空行不计
    if (/^(\/\/|\*|\/\*|<!--)/.test(txt)) continue;    // 注释不计（注释本来就会被改写）
    (added[file] = added[file] || []).push(txt);
  }
  let tot = 0, alive = 0; const detail = [];
  for (const [f, lines] of Object.entries(added)) {
    const H = new Set(headLines(f).map((x) => x.trim()));
    const a = lines.filter((x) => H.has(x)).length;
    tot += lines.length; alive += a;
    detail.push(`${f.split('/').pop()} ${a}/${lines.length}`);
  }
  const pct = tot ? Math.round((alive / tot) * 100) : 0;
  rows.push({ c, tot, alive, pct });
  console.log(`  ${c}: ${String(alive).padStart(4)} / ${String(tot).padStart(4)} 存活 = ${String(pct).padStart(3)}%   [${detail.join(' · ')}]`);
}

console.log('\n== 整文件被"重写"的强信号（该文件在某轮里删除行 ≥ 上一轮新增行的 50%）==');
for (let i = 0; i < COMMITS.length - 1; i++) {
  for (let j = i + 1; j < COMMITS.length; j++) {
    const A = sh(`git show --numstat --format="" ${COMMITS[i]}`).split(/\r?\n/).filter(Boolean).map((l) => l.split('\t'));
    const B = sh(`git show --numstat --format="" ${COMMITS[j]}`).split(/\r?\n/).filter(Boolean).map((l) => l.split('\t'));
    const am = Object.fromEntries(A.map(([a, d, f]) => [f, +a || 0]));
    for (const [a2, d2, f] of B) {
      if (!f || !CODE.test(f)) continue;
      if (am[f] && +d2 >= am[f] * 0.5 && +d2 > 10) {
        console.log(`  ${COMMITS[j]} 删了 ${d2} 行 ${f}，而 ${COMMITS[i]} 在该文件只新增 ${am[f]} 行`);
      }
    }
  }
}

console.log('\n== 这 7 轮的净代码增长 vs 文档增长 ==');
let codeA = 0, codeD = 0, docA = 0, docD = 0;
for (const c of COMMITS) {
  for (const l of sh(`git show --numstat --format="" ${c}`).split(/\r?\n/).filter(Boolean)) {
    const [a, d, ...r] = l.split('\t'); const f = r.join('\t');
    if (CODE.test(f)) { codeA += +a || 0; codeD += +d || 0; }
    else if (/\.md$/.test(f)) { docA += +a || 0; docD += +d || 0; }
  }
}
console.log(`  源码：+${codeA} / -${codeD}  = 净 +${codeA - codeD}`);
console.log(`  文档：+${docA} / -${docD}  = 净 +${docA - docD}`);
console.log(`  文档:源码 的新增比 = ${(docA / codeA).toFixed(2)} : 1`);
