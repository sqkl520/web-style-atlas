// Q3 试点：能不能从单个案的 style.css 里可靠抽出「比例/密度/字阶/节奏」四行？
// 先在 S17（结构最干净、README 点名作样本）上试。
import { readFileSync } from 'node:fs';

const css = readFileSync('prototypes/S17-revenue-stamp-stub/style.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');

/** 1. 比例：主布局的栏轨比例 */
function extractColumns(css) {
  const out = [];
  // 只取「承载内容」的容器：排除 body/html 与纯装饰
  const re = /([.#][\w-]+(?:\s+[.#][\w-]+)?)\s*\{([^}]*grid-template-columns\s*:\s*([^;}]+)[^}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sel = m[1].trim();
    const val = m[3].trim();
    // 剔掉 minmax/repeat/auto 这类「响应式」写法，只保留显式轨道
    if (/repeat|minmax|auto|none/.test(val)) continue;
    out.push({ sel, val });
  }
  return out;
}

/** 2. 密度：gap 与 line-height 的取值集合 */
function extractRhythm(css) {
  const gaps = [...css.matchAll(/\bgap\s*:\s*([^;}]+)/g)].map(m => m[1].trim());
  const margins = [...css.matchAll(/\bmargin(?:-top|-bottom)?\s*:\s*([^;}]+)/g)].map(m => m[1].trim());
  const lh = [...css.matchAll(/line-height\s*:\s*([^;}]+)/g)].map(m => m[1].trim());
  const uniq = (a) => [...new Set(a)];
  return { gaps: uniq(gaps), margins: uniq(margins).slice(0, 12), lineHeights: uniq(lh) };
}

/** 3. 字阶：font-size 的取值集合 + 断点差异 */
function extractType(css) {
  const fs = [...css.matchAll(/font-size\s*:\s*([^;}]+)/g)].map(m => m[1].trim());
  const clamp = fs.filter(v => /clamp|calc|vw/.test(v));
  const fixed = fs.filter(v => /^\d+(\.\d+)?px$/.test(v)).map(v => parseFloat(v)).sort((a, b) => a - b);
  return { all: [...new Set(fs)], fluid: [...new Set(clamp)], fixedSteps: [...new Set(fixed)] };
}

/** 4. 节奏：@media 的断点值 */
function extractBreakpoints(css) {
  return [...new Set([...css.matchAll(/@media[^{]*?(\d+)px/g)].map(m => +m[1]))].sort((a, b) => a - b);
}

const r = {
  columns: extractColumns(css),
  rhythm: extractRhythm(css),
  type: extractType(css),
  breakpoints: extractBreakpoints(css),
};
console.log(JSON.stringify(r, null, 1));
