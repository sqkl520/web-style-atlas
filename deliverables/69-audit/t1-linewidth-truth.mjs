// 任务 1 探针 A：线宽「作者到底写了什么」——纯静态文本，不依赖浏览器。
//
// 为什么要重做：上一轮 probe-linewidths2.mjs 只扫了三个来源
//   (1) CSS 里 border*/outline* 的 px
//   (2) 元素上 computed 的 non-scaling stroke
//   (3) CSS 里 stroke-width 声明
// 但**完全没扫 index.html 里的内联属性** `stroke-width="1.6"`。
// Lead 说 S25 有 1/1.2/2、S27 有 .8/1.6 —— 我要自己证实。
//
// 本探针输出四路证据，互相独立：
//   A. CSS 规则里的 border/outline px（即 lineWidthVerdict 的唯一来源 = 提示词的来源）
//   B. CSS 规则里的 stroke-width
//   C. index.html 内联属性里的 stroke-width（含 SVG symbol / data-URI 两种宿主）
//   D. CSS 里出现过的所有 Npx 字面量（不限属性）—— 用来判「某个值到底在不在文件里」
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const dirs = readdirSync(P).filter((d) => /^S\d\d-/.test(d)).sort();

const r2 = (n) => Math.round(n * 100) / 100;
const num = (s) => r2(parseFloat(s));

function rootVars(css) {
  const vars = {};
  for (const m of css.matchAll(/:root\s*\{([\s\S]*?)\}/g)) {
    for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
  }
  return vars;
}
function expand(v, vars, depth = 0) {
  if (depth > 6) return v;
  if (!/var\(/.test(v)) return v;
  const s = v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (_, n, fb) =>
    vars[n] !== undefined ? vars[n] : fb !== undefined ? fb : '/*unres*/');
  return expand(s, vars, depth + 1);
}
function calc(v) {
  let s = v;
  // calc(Npx * M) 与 calc(M * Npx)
  s = s.replace(/calc\(\s*([0-9.]+)px\s*\*\s*([0-9.]+)\s*\)/g, (_, a, b) => r2(num(a) * num(b)) + 'px');
  s = s.replace(/calc\(\s*([0-9.]+)\s*\*\s*([0-9.]+)px\s*\)/g, (_, a, b) => r2(num(a) * num(b)) + 'px');
  return s;
}

const out = {};
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  let css = '', html = '';
  try { css = readFileSync(join(P, dir, 'style.css'), 'utf8'); } catch (e) {}
  try { html = readFileSync(join(P, dir, 'index.html'), 'utf8'); } catch (e) {}
  const vars = rootVars(css);
  const cssNoC = css.replace(/\/\*[\s\S]*?\*\//g, '');

  // ── A. 提示词来源：border/outline（逐字复刻 clean-dna.mjs:328 的正则） ──
  const A = new Map(); // val -> [{prop, raw, decl}]
  const reA = /(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?)\s*:\s*([^;}]+)/g;
  let mA;
  while ((mA = reA.exec(cssNoC))) {
    const raw = mA[1].trim();
    let v = calc(expand(raw, vars));
    for (const q of v.matchAll(/([0-9.]+)px/g)) {
      const n = num(q[1]);
      if (n > 0) {
        if (!A.has(n)) A.set(n, []);
        if (A.get(n).length < 3) A.get(n).push(raw.slice(0, 46));
      }
    }
  }

  // ── B. CSS 里的 stroke-width ──
  const B = new Map();
  for (const mB of cssNoC.matchAll(/stroke-width\s*:\s*([^;}]+)/g)) {
    const raw = mB[1].trim();
    const v = calc(expand(raw, vars));
    const one = v.match(/^(-?[0-9.]+)(px)?$/);
    if (one) {
      const n = num(one[1]);
      if (n > 0) { if (!B.has(n)) B.set(n, []); if (B.get(n).length < 3) B.get(n).push(raw.slice(0, 30) + (one[2] ? ' [px]' : ' [裸]')); }
    }
  }

  // ── C. index.html 内联 stroke-width ──
  const C = new Map();
  const rawHtmlNoC = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const mC of rawHtmlNoC.matchAll(/stroke-width\s*=\s*["']([^"']+)["']/g)) {
    const n = num(mC[1]);
    if (n > 0) { if (!C.has(n)) C.set(n, []); if (C.get(n).length < 4) C.get(n).push('inline'); }
  }
  // C2: data-URI 里的 SVG（编码后的 %3C....stroke-width%3D5.66）
  const C2 = new Map();
  for (const mC of html.matchAll(/stroke-width(?:=|%3D)['"]?(%?[0-9.]+)/gi)) {
    const n = num(decodeURIComponent(mC[1]));
    if (n > 0) { if (!C2.has(n)) C2.set(n, 0); C2.set(n, C2.get(n) + 1); }
  }
  // C3: 引用的 assets/*.svg 文件里也有 stroke-width（S28 的 needle 在 style.css 的 url() 里）
  const C3 = new Map();
  for (const src of [css, html]) {
    for (const mC of src.matchAll(/stroke-width(?:=|%3D|:)\s*['"]?(%?[0-9.]+)/gi)) {
      const n = num(decodeURIComponent(mC[1]));
      if (n > 0) { if (!C3.has(n)) C3.set(n, 0); C3.set(n, C3.get(n) + 1); }
    }
  }

  // ── D. 全文件 Npx 字面量（不限属性） ──
  const D = new Set();
  for (const q of cssNoC.matchAll(/([0-9.]+)px/g)) { const n = num(q[1]); if (n > 0) D.add(n); }

  // ── E. 该案在 html 中是否有 svg 元素 ──
  const hasSvg = /<svg\b/i.test(html);

  const fmt = (mp) => [...mp.entries()].sort((a, b) => a[0] - b[0]);

  out[id] = {
    dir,
    A_A_border: fmt(A).map(([w, where]) => ({ w, where })),
    B_cssStroke: fmt(B).map(([w, where]) => ({ w, where })),
    C_htmlInline: fmt(C).map(([w, n]) => ({ w, n: n.length })),
    C2_dataUri: fmt(C2).map(([w, n]) => ({ w, n })),
    C3_anyStroke: fmt(C3).map(([w, n]) => ({ w, n })),
    D_allPx: [...D].sort((a, b) => a - b),
    hasSvg,
  };
}

writeFileSync(join(OUT, 't1-truth.json'), JSON.stringify(out, null, 1), 'utf8');

// 对照提示词声称值
const con = JSON.parse(readFileSync(join(OUT, 'constraints.json'), 'utf8'));
const dump = JSON.parse(readFileSync(join(OUT, 'dump30.json'), 'utf8'));
const rows = [];
for (const id of Object.keys(out)) {
  const o = out[id];
  const txt = dump.prompts[id] || '';
  const lm = txt.match(/5\. 线宽只用这几级：([^，]+)，/);
  const claimed = lm ? lm[1].split('、').map((s) => num(s)) : null;
  const aVals = o.A_A_border.map((x) => x.w);
  const bVals = o.B_cssStroke.map((x) => x.w);
  const cVals = o.C_htmlInline.map((x) => x.w);
  const allStroke = [...new Set([...bVals, ...cVals, ...o.C3_anyStroke.map((x) => x.w)])].sort((a, b) => a - b);
  const missA = claimed ? claimed.filter((v) => !aVals.some((x) => Math.abs(x - v) < 0.011)) : [];
  const missB = claimed ? claimed.filter((v) => !bVals.some((x) => Math.abs(x - v) < 0.011)) : [];
  const missC = claimed ? claimed.filter((v) => !cVals.some((x) => Math.abs(x - v) < 0.011)) : [];
  const missAll = claimed ? claimed.filter((v) => !o.D_allPx.some((x) => Math.abs(x - v) < 0.011)) : [];
  // 未被提示词提及、但真实存在的 strikewidth / 内联 stroke
  const unmentioned = allStroke.filter((v) => claimed && !claimed.some((x) => Math.abs(x - v) < 0.011));
  rows.push({
    id, claimed,
    A: aVals, B: bVals, C: cVals, allStroke,
    missAllFour: missAll,   // 四路都找不到 = 纯幽灵值
    unmentionedStroke: unmentioned,
    nClaimed: claimed ? claimed.length : 0,
  });
}
writeFileSync(join(OUT, 't1-claims.json'), JSON.stringify(rows, null, 1), 'utf8');

console.log('id  声称                        CSS-border            CSS-stroke      HTML内联       幽灵值        未提及stroke');
for (const r of rows) {
  console.log(
    r.id.padEnd(4),
    (r.claimed ? r.claimed.join(',') : '?').padEnd(26),
    (r.A.join(',') || '—').padEnd(21),
    (r.B.join(',') || '—').padEnd(15),
    (r.C.join(',') || '—').padEnd(14),
    (r.missAllFour.join(',') || '—').padEnd(13),
    r.unmentionedStroke.join(',') || '—'
  );
}
console.log('\nwrote t1-truth.json / t1-claims.json');
