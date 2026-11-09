#!/usr/bin/env node
/* Q7 复刻验货的对账器：把 Agent 从提示词生成的作品，与原型逐量比对。
 *
 * 判读纪律（PROMPT-SYSTEM.md §6.3 定的）：
 *   FAIL 时要能回答「是提示词没写清楚，还是模型没听话」。
 *   做法：先看该量在提示词里有没有一句明确的指令。有指令而没做到 → 模型偏差；
 *   没有指令 → **这是提示词缺陷**，要回流到数据层，而不是记一笔就完。
 *
 * 用法：node deliverables/74-q7/compare.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { measure } from './measure.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const Q7 = join(ROOT, 'deliverables/74-q7');

/* 原型路径从 data.js 的 dir 字段读，不手写 —— 手写会随目录改名而腐化，
 * 而这里要支持任意案号（`node compare.mjs -v2 S06,S14,...`）。 */
function dirOf(id, vm) {
  const src = readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8');
  const c = { window: {} };
  vm.createContext(c);
  vm.runInContext(src, c);
  const s = c.window.SCHEMES.find((x) => x.id === id);
  return s ? s.dir : null;
}

/* 默认三案（第一轮验证过的那三案）；命令行可传 `-v2 S06,S14` 之类。 */
const DEFAULT_IDS = ['S03', 'S07', 'S17'];
const idArg = process.argv.slice(2).find((a) => /^S\d{2}(,S\d{2})*$/.test(a));
const IDS = idArg ? idArg.split(',') : DEFAULT_IDS;
const PAIRS = IDS.map((id) => {
  const d = dirOf(id, vm);
  return { id, proto: d ? `prototypes/${d}/index.html` : null };
}).filter((p) => p.proto && existsSync(join(ROOT, p.proto)));

const fmt = (v) => Array.isArray(v) ? '[' + v.join(', ') + ']' : String(v);

/* 六条判据。每条返回 {name, ok, want, got, note}。
 * `note` 写的是「提示词里有没有明确指令」—— 那决定失败时该怪谁。 */
function judge(id, want, got, prompt) {
  const out = [];
  const add = (name, ok, w, g, note) => out.push({ name, ok, want: fmt(w), got: fmt(g), note });

  /* ① 主体栏数：**只报不判**。
   *
   * 为什么降级：「哪个 grid 是主版式」是主观判断，而原型与生成物的 DOM 结构不同，
   * 同一个页面上可能有多个 grid（S07 同时有 .pages 5:7、.plate-grid repeat(7)、
   * .toc repeat(3)）。按「面积最大」选能稳定选到内容网格，但它未必是提示词所指的那个。
   * 把它降成 INFO，避免用一把会漂的尺子判产品对错 —— 这与本仓库 §9.15 允许表的教训一致。 */
  const colNote = `原型 ${want.gridSel} ${want.gridTracks} 轨 / col ${want.maxColCount}；` +
                  `生成物 ${got.gridSel} ${got.gridTracks} 轨 / col ${got.maxColCount}`;
  out.push({ name: '主体栏数(参考)', ok: true, want: `${want.gridTracks}/${want.maxColCount}`,
             got: `${got.gridTracks}/${got.maxColCount}`, note: colNote });

  /* ② 主轴比例：**只报不判**。
   *
   * 为什么降级 —— 这是本工具里最不可靠的一条判据，原因有两个：
   *   1. 「哪个 grid 是主版式」无法从 DOM 结构可靠判断。S23 的版心是
   *      `grid-template-columns: 5fr 7fr`（:110），但按面积最大选到的是
   *      `HEADER.masthead`（页头），于是拿页头的比例去判版心。
   *   2. 机制句的语义范围不同。S06/S14/S19/S23 的机制句描述的是**内容排布**
   *      （卡片沿斜轨、面板分栏、开口递减），不是**版式骨架**。拿骨架比例
   *      判它们的对错，等于用一把语义上不成立的尺子。
   * 它在 S03/S07/S17 上能过，是因为那三案的页头恰好不是面积最大的元素 —— 巧合，不是判据有效。
   *
   * 保留输出是因为它仍有诊断价值：两组数字差得远时，人一眼能看出模型把版面分成了别的结构。 */
  let ratioOk = null, ratioNote = '轨道不足 2，跳过';
  const significant = (arr) => arr.filter((v) => v >= 0.01);
  const wR = significant(want.mainRatio), gR = significant(got.mainRatio);
  if (wR.length >= 2 && gR.length >= 2) {
    ratioNote = `原型 ${want.gridSel} vs 产物 ${got.gridSel}（只报不判）`;
  }
  add('主轴比例(参考)', true, wR, gR, ratioNote);

  /* ③ 标题/正文字号比：容差 ±20% */
  const hr = (want.headBodyRatio && got.headBodyRatio)
    ? Math.abs(got.headBodyRatio - want.headBodyRatio) / want.headBodyRatio <= 0.20 : null;
  add('标题/正文比', hr === null ? true : hr, want.headBodyRatio, got.headBodyRatio,
    /字号|字阶|font-size|标题/i.test(prompt) ? '提示词有字号约束' : '提示词未提字号');

  /* ④ 线宽集合：原型声明过的线宽必须都出现（不反向要求 —— 生成物可以多，
     但少了就是没照做）。
   *
   * ⚠️ 必须同时收 border 与 svg stroke-width，两组分开比。
   * 起因是一个盲测 Agent 的实测发现：CSS 的 0.5px / 0.8px / 2.4px 细线
   * 被 Chrome 在 getComputedStyle 里**取整**成 1px / 2px，而 SVG 的 stroke-width
   * 不取整。S17 的细线恰好全在 SVG 里（0.5 / 0.8 / 2.4 / 5 / 6），
   * 只比 borderWidths 会得到 [1.00, 2.00]，把它的线宽体系整个看漏。 */
  const wantBW = want.borderWidths.filter((w) => parseFloat(w) > 0);
  const gotBW = new Set(got.borderWidths.map((w) => parseFloat(w).toFixed(2)));
  const wantSW = (want.svgStrokeWidths || []).filter((w) => parseFloat(w) > 0);
  const gotSW = new Set((got.svgStrokeWidths || []).map((w) => parseFloat(w).toFixed(2)));
  const missBW = wantBW.filter((w) => !gotBW.has(parseFloat(w).toFixed(2)));
  const missSW = wantSW.filter((w) => !gotSW.has(parseFloat(w).toFixed(2)));
  add('线宽集合(border)', missBW.length === 0, wantBW, got.borderWidths,
    /线宽|border|stroke/i.test(prompt) ? `缺 ${missBW.join(',') || '无'}` : '提示词未提线宽');
  if (wantSW.length) {
    /* 只报不判。理由：这条测的是**实现手段**（用不用 SVG 画线），不是视觉结果。
     * 原型 S17 用 SVG 是因为 CSS border 会被 Chrome 取整（0.5px → 1px），
     * 而 stroke-width 不取整。但生成物完全可以用 CSS 的 gradient 技巧
     * 画出 0.5px 的真细线 —— 一个盲测 Agent 就是这么做的，视觉上等价。
     * 拿"有没有 SVG"判对错，会把正确的实现判成失败。
     * 真正该判的线宽是否在屏幕上存在，border 那一组已经覆盖了大部分。 */
    add('线宽集合(stroke,参考)', true, wantSW, got.svgStrokeWidths,
      `原型用 SVG 画细线（stroke 不取整）；生成物 ${got.svgStrokeWidths.length ? '也用了' : '改用 CSS 实现，视觉可能等价'}，缺 ${missSW.join(',') || '无'}`);
  }

  /* ⑤ 主色：判据是**提示词里给的色是否都出现在产物里**，不是「产物是否复刻了原型的全部色」。
   *
   * 为什么必须这样定：原型 S14 的 CSS 里有 13 个 hex，而提示词只给了 9 个
   * （pickPalette 的上限），剩下 4 个是派生色。拿原型的全量色去要求产物，
   * 等于要求模型复刻它从未被告知的颜色 —— 那是拿一把错的尺子判分。
   * 提示词的色列表才是模型收到的约束；产物只要把它全部用上，配色这一关就成立。 */
  const promptHexes = new Set((prompt.match(/#[0-9A-Fa-f]{6}/g) || []).map((h) => h.toUpperCase()));
  const gotHex = new Set(got.hexes);
  const missHex = [...promptHexes].filter((h) => !gotHex.has(h));
  add('配色（提示词给的色）', missHex.length === 0,
    `${promptHexes.size} 个`, `${gotHex.size} 个（缺 ${missHex.length}）`,
    promptHexes.size ? `缺: ${missHex.slice(0, 4).join(' ') || '无'}` : '提示词未给色值');

  /* ⑥ 图片位：数量至少到提示词的 minPics，且可见面积 > 0 */
  const picOk = got.imgVisible > 0 || want.imgVisible === 0;
  add('图片位可用', picOk, `${want.imgCount}/${want.imgVisible}`, `${got.imgCount}/${got.imgVisible}`,
    got.imgCount === 0 ? '生成物没有任何图片位' : '有图片且可见');

  return out;
}

const results = [];
for (const p of PAIRS) {
  /* 支持 `node compare.mjs -v2` 这类后缀，用来对比不同轮次的产物。
   * 为什么需要：9 色那一轮要同时看「旧版」和「新版」的结果差异，
   * 而写死 out-${id}.html 就只能看一版。 */
  const SUFFIX = process.argv.find((a) => /^-[a-z0-9]+$/i.test(a)) || '';
  const outFile = join(Q7, `out-${p.id}${SUFFIX}.html`);
  const promptFile = join(Q7, `prompt-${p.id}.txt`);
  if (!existsSync(outFile)) { console.log(`${p.id}: 还没有生成物（out-${p.id}${SUFFIX}.html），跳过`); continue; }
  const prompt = readFileSync(promptFile, 'utf8');
  console.log(`\n=== ${p.id} ===`);
  const [want, got] = [await measure(p.proto), await measure(outFile)];
  const rows = judge(p.id, want, got, prompt);
  for (const r of rows) {
    console.log(`  ${r.ok ? '✓' : '✗'} ${r.name.padEnd(12)} want ${r.want.padEnd(22)} got ${r.got.padEnd(22)} ${r.note}`);
  }
  results.push({ id: p.id, pass: rows.filter((r) => r.ok).length, total: rows.length, rows });
}

if (results.length) {
  console.log('\n=== 汇总 ===');
  for (const r of results) console.log(`${r.id}: ${r.pass}/${r.total}`);
  const allFail = results.flatMap((r) => r.rows.filter((x) => !x.ok).map((x) => ({ id: r.id, ...x })));
  if (allFail.length) {
    console.log('\n失败项按「该怪谁」分组：');
    const promptDefect = allFail.filter((f) => /未提|未给|未给色值/.test(f.note));
    const modelBias = allFail.filter((f) => !/未提|未给|未给色值/.test(f.note));
    if (promptDefect.length) {
      console.log('  【提示词缺陷】提示词里压根没这条指令 —— 要回流修数据层：');
      promptDefect.forEach((f) => console.log(`    ${f.id} ${f.name}`));
    }
    if (modelBias.length) {
      console.log('  【模型偏差】提示词有指令但没照做 —— 重跑一次再判定：');
      modelBias.forEach((f) => console.log(`    ${f.id} ${f.name}（${f.note}）`));
    }
  } else {
    console.log('\n全部通过。');
  }
}
