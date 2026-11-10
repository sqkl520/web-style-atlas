// 探针 25：收尾三项硬核验
//  A. buttonText=null 的 13 案，真实 CSS 里按钮字色是不是 WCAG argmax（若否，argmax 就是猜）
//  B. check-anchors.mjs 的 "undefined" 分支
//  C. data.js 键数精确值
import { readFileSync } from 'node:fs';
import { PROTO, loadData } from './_rt_lib.mjs';

const D = loadData();

console.log('═══ A. buttonText=null 的案：argmax 推出来的值 vs 真实原型 CSS 里的按钮字色 ═══');
const rgbOf = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = (c) => { if (!c) return null; const s = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
const ratio = (a, b) => { const A = lum(rgbOf(a)), B = lum(rgbOf(b)); if (A == null || B == null) return null; const hi = Math.max(A, B), lo = Math.min(A, B); return (hi + 0.05) / (lo + 0.05); };

const nulls = D.filter((r) => !r.buttonText);
console.log('案   primary   argmax    真实CSS按钮里的 color       一致?');
let agree = 0, disagree = 0, noFind = 0;
for (const r of nulls) {
  const argmax = ratio(r.primary, '#FFFFFF') >= ratio(r.primary, '#111111') ? '#FFFFFF' : '#111111';
  // 找原型 CSS 里按钮/CTA 的 color
  let css = '';
  try { css = readFileSync(PROTO + '/' + r.dir + '/style.css', 'utf8'); } catch { }
  const blocks = [...css.matchAll(/\{[^}]*\}/g)].map((m) => m[0]);
  const btnBlocks = blocks.filter((b) => /color\s*:/.test(b) && /#[0-9A-Fa-f]{6}/.test(b));
  // 只看选择器含 button/btn/cta 的
  const selRe = /([^{}]+)\{([^}]*)\}/g;
  const cands = [];
  for (const m of css.matchAll(selRe)) {
    const sel = m[1], body = m[2];
    if (!/(button|\.btn|cta|cta-|\.buy|\.action)/i.test(sel)) continue;
    const c = /color\s*:\s*(#[0-9A-Fa-f]{6})/.exec(body);
    if (c) cands.push(c[1].toUpperCase());
  }
  const uniq = [...new Set(cands)];
  const found = uniq.includes('#FFFFFF') || uniq.includes('#111111');
  if (!found) { noFind++; console.log(`${r.id}  ${r.primary}  ${argmax}   ${uniq.join(' ') || '(未声明)'}   — 无法判定`); continue; }
  const ok = uniq.includes(argmax);
  if (ok) agree++; else disagree++;
  console.log(`${r.id}  ${r.primary}  ${argmax}   ${uniq.join(' / ')}   ${ok ? '✔' : '✗ argmax 猜错'}`);
}
console.log('');
console.log(`一致 ${agree}｜不一致 ${disagree}｜无法判定 ${noFind}`);
console.log('⇒ 若不一致>0，说明「由 primary 算 buttonText」是**错的**，那 13 案不能这样补。');

console.log('');
console.log('═══ B. check-anchors.mjs 的动态锚点分支 ═══');
const ca = readFileSync('D:/Web/style/prototypes/_build/check-anchors.mjs', 'utf8');
ca.split(/\r?\n/).forEach((l, i) => {
  if (/dynamic\.push|x\.three|\.three\b/.test(l)) console.log(`  L${i + 1}: ${l.trim()}`);
});
console.log('  实际输出里出现过「undefined  href="#dg-\' + keys[i] + \'"」');
console.log('  原因：dynamic.push({ dir, href }) 没有 three 字段，但打印时读 x.three ⇒ undefined。');
console.log('  影响：仅日志瑕疵，不误判。但它让人以为「有一个名为 undefined 的方案」。');

console.log('');
console.log('═══ C. data.js 键数 ═══');
console.log('  Object.keys(SCHEMES[0]).length = ' + Object.keys(D[0]).length);
console.log('  键：' + Object.keys(D[0]).join(' '));
console.log('  （WIP 新增 audit 后是 33；Lead 表里写 32 = 加 audit 之前的值）');
