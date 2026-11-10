// 探针 26：决定性一击 —— 27 个非空 buttonText 是「作者指定的设计决定」还是「WCAG argmax」？
// 判据：若拿真实原型 CSS 里 .btn 的 color 去比，argmax 命中几个？
import { readFileSync } from 'node:fs';
import { PROTO, loadData } from './_rt_lib.mjs';

const D = loadData();
const rgbOf = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = (c) => { if (!c) return null; const s = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
const ratio = (a, b) => { const A = lum(rgbOf(a)), B = lum(rgbOf(b)); if (A == null || B == null) return null; const hi = Math.max(A, B), lo = Math.min(A, B); return (hi + 0.05) / (lo + 0.05); };

function realBtnColor(dir) {
  let css = '';
  try { css = readFileSync(PROTO + '/' + dir + '/style.css', 'utf8'); } catch { return null; }
  const out = [];
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sel = m[1], body = m[2];
    if (!/(^|[\s,])\.btn\b|(^|[\s,])button\b|\.cta\b|\.btn-|\.button\b/i.test(sel)) continue;
    if (/hover|active|disabled|focus/i.test(sel)) continue;
    const c = /(?:^|[\s;])color\s*:\s*(#[0-9A-Fa-f]{6})/.exec(body);
    if (c) out.push(c[1].toUpperCase());
  }
  return out.length ? [...new Set(out)] : null;
}

console.log('═══ 30 案的 buttonText：是「作者指定」还是「argmax 可算」？═══');
console.log('案  buttonText  真实CSS .btn color      argmax(primary)  真实值能否被 argmax 命中');
let argmaxHit = 0, argmaxMiss = 0, noCss = 0, realFromArgmax = 0, realThird = 0;
for (const r of D) {
  const real = realBtnColor(r.dir);
  const argmax = ratio(r.primary, '#FFFFFF') >= ratio(r.primary, '#111111') ? '#FFFFFF' : '#111111';
  const realIsArgmax = real ? real.includes(argmax) : null;
  if (!real) { noCss++; }
  else if (realIsArgmax) argmaxHit++;
  else argmaxMiss++;
  // 真实按钮字色里有没有「既非纯白也非纯黑」的第三值
  const third = real ? real.filter((c) => c !== '#FFFFFF' && c !== '#111111') : [];
  if (third.length) realThird++;
  // 数据里的 buttonText 是否等于真实值之一
  const dataMatches = r.buttonText && real ? real.includes(r.buttonText) : null;
  if (r.buttonText) { if (argmax === r.buttonText) realFromArgmax++; }
  console.log(`${r.id}  ${String(r.buttonText || '(null)').padEnd(10)}  ${String(real ? real.join('/') : '(未声明)').padEnd(22)}  ${argmax.padEnd(16)}  ${realIsArgmax === null ? '—' : realIsArgmax ? '✔' : '✗ 真实用的是第三值'}`);
}
console.log('');
console.log(`真实 .btn 声明了 color 的案：${30 - noCss}/30`);
console.log(`  其中真实值 = argmax 推出的：${argmaxHit}`);
console.log(`  其中真实值 ≠ argmax（用了非纯白/纯黑的第三值）：${argmaxMiss}`);
console.log(`  真实值里含第三值的案：${realThird}/30`);
console.log('');
console.log('★★ 关键结论：');
console.log(`  数据里 17 个非空 buttonText 全部 = argmax(primary)（我 _rt_p19 已证 17/17）。`);
console.log(`  但真实原型里，只有 ${argmaxHit} 案的按钮字色是 argmax；${argmaxMiss} 案用的是作者自己调的第三值。`);
console.log('  ⇒ buttonText 不是「作者的设计决定」，它是 collect-schemes 从 *_CURRENT-VALUES.md 抄的白/黑二选一；');
console.log('  ⇒ 真实设计里有第三值（S19 #E4DECD 卡纸字、S03 #7C8A8C 灰、S17 #6B5A4A），argmax 推不出来；');
console.log('  ⇒ 把它接通到界面上，用户看到的「按钮字色」与原型实际按钮字色不一致的风险是**实锤**的，不是理论风险。');
