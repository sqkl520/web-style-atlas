/* 证明 check-docs 现在为什么仍绿，以及它在 data.js 重新生成之后会怎么红。
 *
 * 复查背景：README（中英两版）里的「26 案达标」是硬编码断言，check-docs 的
 * nums/gate 用 `data.js` 里的 gate.fail 复算它。而 data.js 是 collect-schemes.mjs
 * 从 .inspect/report.json **生成**的快照（文件头写着"勿手改"）。
 * 本次修复只改了原型源码与 report.json，没有重跑 collect-schemes，
 * 所以 data.js 仍是旧快照 → check-docs 报 26 与"实测一致"，这是**口径对齐**而不是真的对。
 *
 * 本脚本只读：把 data.js 复制到临时目录，模拟"重新生成后"的样子，再断言结论。
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';

const SRC = 'D:/Web/style/prototypes/_selection/data.js';
const TMP = 'D:/Web/style/deliverables/69-exec/_docsim';
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const src = readFileSync(SRC, 'utf8');

// 1) 现状：data.js 里记的 gate
const gateOf = (s, id) => {
  const i = s.indexOf(`"id": "${id}"`);
  if (i < 0) return null;
  const seg = s.slice(i, i + 4000);
  const m = seg.match(/"gate":\s*\{[^}]*\}/);
  return m ? m[0] : null;
};
console.log('--- 现状（data.js 快照，未重新生成）---');
for (const id of ['S07', 'S08', 'S13', 'S21']) {
  const g = gateOf(src, id);
  console.log(`  ${id}: ${g ? g.replace(/\s+/g, ' ') : '(无 gate)'}`);
}

// 2) 现算：直接读 30 份 report.json
let zeroNow = 0; const badNow = [];
for (const d of readdirSync('D:/Web/style/prototypes').filter((x) => /^S\d{2}-/.test(x))) {
  const j = JSON.parse(readFileSync(`D:/Web/style/prototypes/${d}/.inspect/report.json`, 'utf8').replace(/^\uFEFF/, ''));
  const f = (j.findings || []).filter((x) => x.level === 'FAIL');
  if (!f.length) zeroNow++; else badNow.push(`${d.slice(0, 3)}(${f.length})`);
}
console.log(`\n--- 现算（当前 report.json）---\n  FAIL=0 的案：${zeroNow} / 30　仍有 FAIL：${badNow.join(' ') || '（无）'}`);

// 3) 模拟重新生成：把 S07 / S13 / S21 的 gate.fail 改成 0（只改副本）
let sim = src;
for (const id of ['S07', 'S13', 'S21']) {
  const i = sim.indexOf(`"id": "${id}"`);
  const seg = sim.slice(i, i + 4000);
  const m = seg.match(/"gate":\s*\{[^}]*\}/);
  if (!m) { console.log(`  ⚠ ${id} 找不到 gate，跳过`); continue; }
  const replaced = m[0].replace(/"fail":\s*\d+/, '"fail": 0').replace(/"failIds":\s*\[[^\]]*\]/, '"failIds": []');
  sim = sim.slice(0, i) + seg.replace(m[0], replaced) + sim.slice(i + 4000);
}
writeFileSync(`${TMP}/data.js`, sim, 'utf8');

const countZero = (s) => {
  // 数 gate.fail === 0 的条目
  const gates = [...s.matchAll(/"gate":\s*\{[^}]*\}/g)].map((m) => m[0]);
  return gates.filter((g) => /"fail":\s*0(?:\D|$)/.test(g)).length;
};
console.log(`\n--- 模拟「重新生成 data.js 之后」---`);
console.log(`  data.js（旧快照）里 FAIL=0 的案：${countZero(src)}`);
console.log(`  data.js（重新生成后）里 FAIL=0 的案：${countZero(sim)}`);

// 4) README 里硬编码的断言
const readme = readFileSync('D:/Web/style/README.md', 'utf8');
const readmeEN = readFileSync('D:/Web/style/README-EN.md', 'utf8');
const hits = [
  ...(readme.match(/\d+\s*个闸门 FAIL=0/g) || []),
  ...(readme.match(/\d+\s*案 FAIL=0/g) || []),
  ...(readme.match(/\d+\s*个原型[^\n]{0,20}FAIL=0/g) || []),
  ...(readmeEN.match(/\d+\s*prototypes? pass the gate with FAIL\s*=?\s*0/gi) || []),
];
console.log(`\n--- README 中与「达标案数」有关的硬编码 ---`);
console.log('  ' + ([...new Set(hits)].join('  |  ') || '(未匹配到)'));

console.log(`\n结论：check-docs 现在报「26，与实测一致」，是因为它拿 data.js 的旧快照复算；
重新生成 data.js 后应变成 29，README（中英两版、多处）会立刻 FAIL。`);
console.log(`模拟文件已写入 ${TMP}/data.js（未改动仓库内任何文件）`);
