// 探针 3d：选项 d 的**真实**信息量 —— 必须先解析 var()，否则会把 inset 误判成外投影。
// 同时把 S25 的 `border-radius: 50%`、S19 的 `0 0 0 1px` 这两处追到具体选择器，
// 判断它们是"提示词漏说了"还是"提示词说了页面没做到"。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, out } from './_lib.mjs';

function parseVars(css) {
  const vars = {};
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) vars[m[1]] = m[2].trim();
  return vars;
}
const resolve = (v, vars, depth = 0) => {
  if (depth > 6) return v;
  return v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (_, n, fb) => (vars[n] !== undefined ? resolve(vars[n], vars, depth + 1) : (fb || '')));
};

for (const d of ['S13-blind-debossed-dispatch', 'S19-copperplate-herbarium-cabinet', 'S25-spotcolor-contents-zine']) {
  const css = readFileSync(join(ROOT, 'prototypes', d, 'style.css'), 'utf8');
  const vars = parseVars(css);
  out(`=== ${d} ===`);
  // 逐条 box-shadow 声明，带选择器
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const outer = [], inset = [];
  for (const b of blocks) {
    const sel = b[1].split('\n').pop().trim();
    for (const m of b[2].matchAll(/box-shadow\s*:\s*([^;}]+)/g)) {
      const raw = m[1].trim();
      const res = resolve(raw, vars);
      const parts = res.split(/,(?![^(]*\))/);
      const hasOuter = parts.some((p) => !/inset/.test(p) && !/^\s*0(px)? 0(px)? 0(px)?( 0(px)?)?\s*(rgba?\([^)]*,\s*0\s*\)|#[0-9a-f]{3,8}00)?\s*$/.test(p.trim()) && !/ 0px 0px 0px 0px/.test(p));
      (hasOuter ? outer : inset).push({ sel, raw: raw.slice(0, 60), res: res.slice(0, 70) });
    }
  }
  out(`  box-shadow 声明：外投影 ${outer.length} 处 / 仅 inset ${inset.length} 处`);
  for (const o of outer) out(`    OUTER  ${o.sel}  →  raw「${o.raw}」 解析「${o.res}」`);
  // 圆角
  for (const b of blocks) {
    const sel = b[1].split('\n').pop().trim();
    for (const m of b[2].matchAll(/border-radius\s*:\s*([^;}]+)/g)) {
      const v = m[1].trim();
      if (!/^(0|0px|0 0 0 0)$/.test(v)) out(`    RADIUS ${sel} = ${v}`);
    }
  }
  out('');
}
