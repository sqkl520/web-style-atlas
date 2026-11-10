#!/usr/bin/env node
// Lead v11：渲染色 vs 调色板 —— 并查清 #000000 这类"疑似默认值"的来历
// 判据：只算「可见面积 / 元素数」都达到门槛的色，且排除 #000000 若它只出现在 shadow/border 默认值上
import { readFileSync } from 'node:fs';

const ROOT = 'D:/Web/style';
const rendered = JSON.parse(readFileSync(ROOT + '/deliverables/70-plan/rendered-colors-30.json', 'utf8'));
const dna = JSON.parse(readFileSync(ROOT + '/prototypes/_prompts/dna-clean.json', 'utf8'));
const arr = Array.isArray(dna) ? dna : Object.values(dna);
const byId = new Map(arr.map((e) => [e.id, e]));

const HEXT = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const norm = (h) => { h = h.toLowerCase(); return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h; };
const hexes = (s) => [...new Set([...String(s).matchAll(HEXT)].map((m) => norm(m[0])))];

// 查 #000000 在源码里是否真的出现
import { readdirSync, existsSync } from 'node:fs';
const DIRS = readdirSync(ROOT + '/prototypes', { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

console.log('=== #000000 是否在源码里显式写过？===\n');
let wroteBlack = [], notWrote = [];
for (const d of DIRS) {
  const id = d.slice(0, 3);
  const css = readFileSync(`${ROOT}/prototypes/${d}/style.css`, 'utf8');
  const html = readFileSync(`${ROOT}/prototypes/${d}/index.html`, 'utf8');
  const has = /#000\b|#000000\b|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(css + html);
  const r = (rendered[id] || []).find((x) => x.hex === '#000000');
  if (r) (has ? wroteBlack : notWrote).push(`${id}(${r.n})`);
}
console.log(`  渲染出 #000000 且源码里显式写过: ${wroteBlack.length} 案  ${wroteBlack.join(' ')}`);
console.log(`  渲染出 #000000 但源码里没写（=浏览器默认/阴影）: ${notWrote.length} 案  ${notWrote.join(' ')}`);

// 逐案对账：渲染色 - palette
console.log('\n=== 渲染出现、但不在提示词调色板里的颜色（按元素数排序）===\n');
const SKIP = new Set(['#000000']); // 默认值先排除，单独看
const rows = [];
for (const d of DIRS) {
  const id = d.slice(0, 3);
  const pal = new Set(hexes((byId.get(id)?.palette || []).join(' ')));
  const list = (rendered[id] || []).filter((x) => !SKIP.has(x.hex));
  const off = list.filter((x) => !pal.has(x.hex));
  const offSig = off.filter((x) => x.n >= 3);   // 至少 3 个元素用到 = 肉眼有份量
  rows.push({ id, total: list.length, off, offSig, palN: pal.size });
  if (offSig.length) {
    console.log(`${id}  渲染=${list.length} palette=${pal.size}  超纲=${off.length}(其中 ≥3 元素=${offSig.length})`);
    for (const o of offSig.sort((a, b) => b.n - a.n)) console.log(`      ${o.hex}  元素=${o.n}  用途=${o.kinds.join(',')}`);
  } else {
    console.log(`${id}  渲染=${list.length} palette=${pal.size}  超纲=${off.length}  ← 全部可忽略（<3 元素）`);
  }
}

const nSig = rows.filter((r) => r.offSig.length).length;
const totalSig = rows.reduce((a, r) => a + r.offSig.length, 0);
console.log(`\n【判定】渲染出「有份量的超纲色（≥3 元素）」的案: ${nSig}/30    共 ${totalSig} 个色`);
console.log(`【对照】任何超纲色（不限元素数）的案: ${rows.filter((r) => r.off.length).length}/30`);
