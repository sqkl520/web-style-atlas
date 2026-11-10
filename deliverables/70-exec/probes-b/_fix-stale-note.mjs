import { readFileSync, writeFileSync } from 'node:fs';
const p = 'D:/Web/style/deliverables/70-exec/EXEC-B-linewidth-negative.md';
let t = readFileSync(p, 'utf8');
const OLD = '**`check-docs` 0 FAIL，不需要改 README。**';
const NEW = [
  '**`check-stale` 的操作顺序（复算者会踩）**：`check-stale` 的链条是',
  '`Sxx/style.css → dna-raw.json → dna-clean.json → prompts.js → _selection/.inspect/report.json`。',
  '所以**每跑一次 `build-prompts` 之后，`check-stale` 必然报 stale** —— 它要的是"重渲染选型台"。',
  '正确顺序是：',
  '',
  '```',
  'node prototypes/_prompts/extract-dna.mjs',
  'node prototypes/_prompts/clean-dna.mjs',
  'node prototypes/_prompts/build-prompts.mjs',
  'node prototypes/_build/render-scheme.mjs _selection    ← 少了这步 check-stale 必红',
  'node prototypes/_build/check-stale.mjs                 ← 这时才是 ✓ 全部新鲜',
  '```',
  '',
  '我第一轮漏了第 4 步，所以看到过一次 FAIL（`prompts.js 落后 3 分钟`）。补上后 exit 0。',
  '',
  '**`check-docs` 0 FAIL，不需要改 README。**',
].join('\n');
if (t.includes(OLD)) { t = t.replace(OLD, NEW); writeFileSync(p, t, 'utf8'); console.log('已补入 check-stale 的操作顺序说明'); }
else console.log('⚠ 未找到锚点，未修改');
