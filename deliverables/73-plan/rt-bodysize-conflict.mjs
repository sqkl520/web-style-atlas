// RT 探针 10：为什么 S01/S03/S07 都把规格冻结的 15px 改成了 16px？
// 假设：这不是三次独立的手滑，而是**规格与闸门规则的结构性冲突**。
//   · _specs/*.md 字段 5 冻结「正文 15px」
//   · rules.mjs 的 body-size 规则：「<15px FAIL；16–20px 为目标」→ 15px 落 WARN
// 若成立，则「规格 vs 实现」的偏离有一个**系统性解释**，
// 而 P3 若把这类偏离当缺陷报，会报出一堆"其实是闸门逼出来的"改动。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const P = join(ROOT, 'prototypes');

function fieldText(lines, label) {
  const i = lines.findIndex((l) => l.includes(label));
  if (i < 0) return '';
  let out = lines[i].replace(/^\s*\*\*\d+\.\s*[^*]*\*\*\s*/, '');
  if (out.trim().length < 4) {
    for (let k = i + 1; k < lines.length; k++) {
      if (/^\s*\*\*\d+[.\-]/.test(lines[k]) && k > i + 1) break;
      out += ' ' + lines[k];
    }
  }
  return out;
}

function cssVars(css) {
  const m = new Map();
  for (const d of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) {
    const v = d[2].trim();
    if (/^-?[\d.]+px$/.test(v)) m.set(d[1], v);
  }
  return m;
}
function evalLen(expr, vars) {
  if (expr == null) return null;
  let e = String(expr).trim();
  e = e.replace(/var\((--[\w-]+)\)/g, (_, n) => (vars.has(n) ? vars.get(n) : 'NaN')).trim();
  if (/^-?[\d.]+px$/.test(e)) return parseFloat(e);
  if (/^NaN/.test(e)) return null;
  return null;
}

const rows = [];
for (const d of readdirSync(P, { withFileTypes: true })) {
  if (!d.isDirectory() || !/^S\d{2}-/.test(d.name)) continue;
  const id = d.name.slice(0, 3);
  const specP = join(P, '_specs', id + '.md');
  const cssP = join(P, d.name, 'style.css');
  if (!existsSync(specP) || !existsSync(cssP)) continue;
  const lines = readFileSync(specP, 'utf8').split(/\r?\n/);
  const css = readFileSync(cssP, 'utf8');
  const f5 = fieldText(lines, '布局与网格');
  const bm = f5.match(/正文\s*([\d.]+)\s*px\s*[／/]\s*行高\s*([\d.]+)/);
  if (!bm) continue;
  const specSize = +bm[1], specLh = +bm[2];
  const vars = cssVars(css);
  const bodyRule = (css.match(/(?:^|\n)\s*body\s*\{([^}]*)\}/) || [])[1] || '';
  const fsM = bodyRule.match(/font-size\s*:\s*([^;]+);/);
  const lhM = bodyRule.match(/line-height\s*:\s*([^;]+);/);
  const cssSize = fsM ? evalLen(fsM[1], vars) : null;
  const cssLh = lhM ? evalLen(lhM[1], vars) : null;
  rows.push({ id, specSize, specLh, cssSize, cssLh,
    bumped: cssSize != null && specSize !== cssSize,
    hasAdj: /规格原写|见裁定|裁定 R-|规格冻结/.test(css) });
}

console.log('id   规格正文  实现正文  是否改大  规格行高  实现行高  有裁定注');
for (const r of rows) {
  console.log(`${r.id}   ${String(r.specSize).padEnd(8)} ${String(r.cssSize ?? '—').padEnd(9)} ${(r.bumped ? '是' : '否').padEnd(8)} ${String(r.specLh).padEnd(8)} ${String(r.cssLh ?? '—').padEnd(9)} ${r.hasAdj ? '有' : '—'}`);
}

const bump = rows.filter((r) => r.bumped);
console.log('\n== 汇总 ==');
console.log(`  可核案数: ${rows.length}`);
console.log(`  规格写 15px 的案: ${rows.filter((r) => r.specSize === 15).length} → ${rows.filter((r) => r.specSize === 15).map((r) => r.id).join(' ')}`);
console.log(`  实现改成别的字号: ${bump.length} 案 → ${bump.map((r) => r.id + '(' + r.specSize + '→' + r.cssSize + ')').join(' ')}`);
console.log(`  其中有裁定注的: ${bump.filter((r) => r.hasAdj).length} 案 → ${bump.filter((r) => r.hasAdj).map((r) => r.id).join(' ') || '无'}`);
console.log('');
console.log('== 闸门规则原文（rules.mjs:106-107）==');
const rules = readFileSync(join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs'), 'utf8').split(/\r?\n/);
for (let n = 105; n <= 107; n++) console.log(`  ${n}: ${rules[n - 1].trim().slice(0, 170)}`);
