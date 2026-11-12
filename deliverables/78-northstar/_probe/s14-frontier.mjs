#!/usr/bin/env node
/* s14 —— 修正 s13 的目标序错误，给出准确的「案数 → 你能买到什么」前沿。
 *
 * s13 的错：目标序是「层 > 未复刻 > tone > structure」，**难点数根本不在目标里**。
 * 于是它在 n=8 时给出 S01 S02 S04 S09 S10 S11 S18 S33（难点 2/10），
 * 而实际上 n=8 就能拿到 31/31 层 + 7/7 tone + 3/4 真 hard 案 + 6/10 并集。
 * 我把那个 2/10 写进了报告 §5.3，是错的，这个脚本给出正确数。
 *
 * 本脚本的目标序（先声明）：
 *   硬约束：层 31/31 且 tone 7/7（这两条是"分布代表性"的底线，不让步）
 *   然后字典序：真 hard 案数 > 并集难点案数 > structure 去重 > 未复刻过
 * 锚定 4 条 hard 案（4/4 是 hard 类的全部成员，漏一条就是漏一整类里的一个）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const P = join(ROOT, 'deliverables/78-northstar/_probe');
const rows = JSON.parse(readFileSync(join(P, 's01-dataset.json'), 'utf8'));
const audit = JSON.parse(readFileSync(join(P, 's03-prompt-audit.json'), 'utf8'));
const BROKEN = new Set(audit.bad);
const REPL = new Set(['S03', 'S06', 'S07', 'S14', 'S17', 'S19', 'S23', 'S24', 'S26']);
const clean = rows.filter((r) => !BROKEN.has(r.id));
const by = Object.fromEntries(clean.map((r) => [r.id, r]));

const cb = (c) => (c <= 25 ? 'chroma≤25' : c <= 59 ? 'chroma26-59' : 'chroma≥60');
const pb = (p) => (p <= 1 ? 'pics0-1' : p <= 5 ? 'pics2-5' : p <= 7 ? 'pics6-7' : 'pics8-10');
const wb = (w) => (w < 200 ? 'words<200' : w < 500 ? 'words200-499' : w < 800 ? 'words500-799' : 'words≥800');
const STR = [['tone', (r) => r.tone], ['chroma', (r) => cb(r.chroma)], ['pics', (r) => pb(r.minPics)],
  ['ground', (r) => r.ground], ['load', (r) => r.load], ['threshold', (r) => '门槛' + r.threshold],
  ['hard', (r) => (r.hard ? 'hard' : 'notHard')], ['gateFail', (r) => (r.gateFail > 0 ? 'fail>0' : 'fail=0')],
  ['words', (r) => wb(r.words)]];
const ALL = new Set();
for (const r of clean) for (const [, f] of STR) ALL.add(f(r));
const U = ['S08', 'S15', 'S18', 'S21', 'S22', 'S29', 'S31', 'S32', 'S33', 'S35'];
const H4 = ['S15', 'S18', 'S21', 'S29'];
const mask = (id) => new Set(STR.map(([, f]) => f(by[id])));
const base = new Set();
for (const id of H4) for (const x of mask(id)) base.add(x);
const rest = clean.map((r) => r.id).filter((x) => !H4.includes(x));

console.log('s14 —— 准确的案数前沿（修正 s13 的目标序错误）');
console.log('='.repeat(92));
console.log(`宇宙 ${clean.length} 案；层 ${ALL.size}；tone 7；hard 类 ${H4.length} 案；并集 ${U.length} 案`);
console.log('硬约束：层 31/31 且 tone 7/7。目标序：真hard > 并集难点 > structure > 未复刻\n');
console.log(' n   补位  真hard  并集   struct  未复刻  方案');
console.log(' ' + '-'.repeat(90));

const out = [];
for (const n of [8, 9, 10, 11, 12]) {
  const need = n - 4;
  let best = null, bestL = null, ties = 0;
  const rec = (start, sel, cov) => {
    if (sel.length === need) {
      if (cov.size !== ALL.size) return;
      const all = [...H4, ...sel];
      if (new Set(all.map((x) => by[x].tone)).size !== 7) return;
      const un = all.filter((x) => U.includes(x)).length;
      const st = new Set(all.map((x) => by[x].structure)).size;
      const fr = all.filter((x) => !REPL.has(x)).length;
      const key = [un, st, fr];
      const better = !best || key[0] > best[0] || (key[0] === best[0] && key[1] > best[1]) ||
        (key[0] === best[0] && key[1] === best[1] && key[2] > best[2]);
      if (better) { best = key; bestL = all.slice().sort(); ties = 1; }
      else if (key.join() === best.join()) { ties++; if (all.slice().sort().join() < bestL.join()) bestL = all.slice().sort(); }
      return;
    }
    for (let i = start; i < rest.length; i++) {
      const nc = new Set(cov);
      for (const x of mask(rest[i])) nc.add(x);
      if (nc.size + (need - sel.length - 1) * 5 < ALL.size) continue;
      sel.push(rest[i]); rec(i + 1, sel, nc); sel.pop();
    }
  };
  rec(0, [], base);
  const tag = best ? '4/4' : '—';
  console.log(` ${String(n).padStart(2)}   ${String(need).padStart(2)}    ${tag}     ${best ? best[0] : '-'}/10    ${best ? best[1] : '-'}/23    ${best ? best[2] : '-'}/${n}    ${bestL ? bestL.join(' ') : '（4 条 hard + 满层 + 满 tone 做不到）'}`);
  out.push({ n, union: best && best[0], struct: best && best[1], fresh: best && best[2], ids: bestL, ties });
}

/* n=8 做不到 4/4 hard，单独求「最多几个 hard」 */
{
  let best = null, bestL = null;
  const rec = (start, sel, cov) => {
    if (sel.length === 4) {
      if (cov.size !== ALL.size) return;
      const all = [...H4, ...sel];
      if (new Set(all.map((x) => by[x].tone)).size !== 7) return;
      const un = all.filter((x) => U.includes(x)).length;
      const st = new Set(all.map((x) => by[x].structure)).size;
      const key = [un, st];
      if (!best || key[0] > best[0] || (key[0] === best[0] && key[1] > best[1])) { best = key; bestL = all.slice().sort(); }
      return;
    }
    for (let i = start; i < rest.length; i++) {
      const nc = new Set(cov);
      for (const x of mask(rest[i])) nc.add(x);
      if (nc.size + (4 - sel.length - 1) * 5 < ALL.size) continue;
      sel.push(rest[i]); rec(i + 1, sel, nc); sel.pop();
    }
  };
  rec(0, [], base);
  console.log(`\nn=8 的上界（4 条 hard 全上时无解，所以退一步：3 条 hard + 4 补位）`);
  console.log(`  ${bestL ? bestL.join(' ') : '-'}`);
  console.log(`  并集 ${best ? best[0] : '-'}/10  struct ${best ? best[1] : '-'}/23`);
  out.push({ n: 8, note: '3/4 hard', union: best && best[0], struct: best && best[1], ids: bestL });
}

/* 逐案角色表 */
console.log('\n## n=11（主方案）逐案');
const main = out.find((x) => x.n === 11 && x.ids && x.ids.length === 11);
if (main) {
  for (const id of main.ids) {
    const r = by[id];
    const tag = H4.includes(id) ? 'HARD' : (U.includes(id) ? '并集' : '补位');
    console.log(`  ${id} [${tag.padEnd(4)}] ${r.tone} | ${r.structure.padEnd(12)} | chroma ${String(r.chroma).padStart(3)} | pics ${String(r.minPics).padStart(2)} | words ${String(r.words).padStart(4)} | ${r.ground}/${r.load}`);
  }
}

writeFileSync(join(P, 's14-frontier.json'), JSON.stringify({ frontier: out, layers: ALL.size, hard4: H4, union: U }, null, 1));
console.log('\n→ s14-frontier.json 已写');
