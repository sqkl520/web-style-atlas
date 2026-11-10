// 探针 18：A 的**防作弊**机制能不能量化？设计一个"抄答案探测器"，并在真实样本上校准：
//   (1) 自比：原型 vs 原型 = 100%（上限）
//   (2) 诚实复刻：62-verify/impl/S07.html vs 原型 S07（那份报告自称"没打开过原型"）
//   (3) 半抄：把原型 CSS 整段塞进 replica（模拟最粗暴的作弊）
// 判据三路：① CSS 选择器 Jaccard ② 声明的 (prop:value) 对 Jaccard ③ 十六进制色值集合 Jaccard
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, out } from './_lib.mjs';

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

function decls(css) {
  const out = new Set();
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].split('\n').pop().trim();
    if (!sel || sel.startsWith('@')) continue;
    for (const d of m[2].split(';')) {
      const t = d.trim();
      if (!t || t.startsWith('/*') || t.startsWith('*')) continue;
      out.add(sel + '{' + t.replace(/\s+/g, ' ') + '}');
    }
  }
  return out;
}
function sels(css) {
  const out = new Set();
  for (const m of css.matchAll(/([^{}]+)\{/g)) {
    const sel = m[1].split('\n').pop().trim();
    if (sel && !sel.startsWith('@')) out.add(sel);
  }
  return out;
}
const hexes = (t) => new Set((t.match(/#[0-9A-Fa-f]{6}\b/g) || []).map((x) => x.toUpperCase()));
const jac = (a, b) => {
  const A = [...a], B = [...b];
  if (!A.length && !B.length) return 1;
  const inter = A.filter((x) => b.has(x)).length;
  return inter / (A.length + B.length - inter);
};

// 取 <style> 里的 CSS（impl 是单文件）
const styleOf = (html) => {
  const m = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  return m.map((x) => x[1]).join('\n');
};

const proto = read(join(ROOT, 'prototypes/S07-slate-ink-contents/style.css'));
const impl = styleOf(read(join(ROOT, 'deliverables/62-verify/impl/S07.html')));

out('=== 校准 1：自比（原型 vs 自己）===');
out(`  选择器 Jaccard      ${jac(sels(proto), sels(proto)).toFixed(3)}`);
out(`  声明对 Jaccard      ${jac(decls(proto), decls(proto)).toFixed(3)}`);
out(`  色值 Jaccard        ${jac(hexes(proto), hexes(proto)).toFixed(3)}`);

out('\n=== 校准 2：诚实复刻（62-verify/impl/S07.html vs 原型 S07）===');
out(`  原型：${sels(proto).size} 选择器 / ${decls(proto).size} 声明对 / ${hexes(proto).size} 色值`);
out(`  复刻：${sels(impl).size} 选择器 / ${decls(impl).size} 声明对 / ${hexes(impl).size} 色值`);
out(`  选择器 Jaccard      ${jac(sels(proto), sels(impl)).toFixed(3)}`);
out(`  声明对 Jaccard      ${jac(decls(proto), decls(impl)).toFixed(3)}`);
out(`  色值 Jaccard        ${jac(hexes(proto), hexes(impl)).toFixed(3)}`);

out('\n=== 校准 3：模拟最粗暴的作弊（原型 CSS 整段 + 复刻的 HTML 结构）===');
const cheat = impl + '\n' + proto;
out(`  选择器 Jaccard      ${jac(sels(proto), sels(cheat)).toFixed(3)}`);
out(`  声明对 Jaccard      ${jac(decls(proto), decls(cheat)).toFixed(3)}`);
out(`  色值 Jaccard        ${jac(hexes(proto), hexes(cheat)).toFixed(3)}`);

out('\n=== 结论与阈值建议 ===');
out('  诚实复刻的三路相似度都远低于 1（色值会接近 1，因为提示词给了 hex——这是**应该**的）。');
out('  → 色值 Jaccard 不能当抄答案判据（提示词本来就把 hex 全给了）。');
out('  → 抄答案判据必须用「选择器」与「声明对」：这两个提示词一个字都没给。');
