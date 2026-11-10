import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'D:/Web/style';

/* 复刻 clean-dna.mjs 的口径，验证闸门该怎么判 */

const DIRS = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

function parseRootVars(css) {
  const m = css.match(/:root\s*\{([\s\S]*?)\}/);
  const out = new Map();
  if (!m) return out;
  for (const x of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out.set(x[1], x[2].trim());
  return out;
}

function resolveVars(v, vars, depth = 0) {
  if (depth > 8) return v;
  return v.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]*))?\)/g, (_, name, fb) => {
    const hit = vars.get(name);
    return hit !== undefined ? resolveVars(hit, vars, depth + 1) : (fb || '');
  });
}

console.log('=== 用「变量展开 + 全部线宽属性」口径重查 4 个问题案 ===\n');
for (const d of DIRS) {
  const id = d.slice(0, 3);
  if (!['S03', 'S07', 'S13', 'S27'].includes(id)) continue;
  const css = stripCssComments(readFileSync(join(ROOT, 'prototypes', d, 'style.css'), 'utf8'));
  const html = readFileSync(join(ROOT, 'prototypes', d, 'index.html'), 'utf8');
  const vars = parseRootVars(css);

  const found = new Map();
  // 所有线宽类属性（含 column-rule / stroke-width）
  const PROP_RE = /(?:^|[;{\s])(border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|column-rule(?:-width)?|stroke-width)\s*:\s*([^;}]+)/g;
  for (const m of css.matchAll(PROP_RE)) {
    const resolved = resolveVars(m[2], vars);
    const w = resolved.match(/(?:^|\s)(\d*\.?\d+)px/);
    if (w && +w[1] > 0 && +w[1] <= 40) {
      const k = +w[1];
      if (!found.has(k)) found.set(k, []);
      found.get(k).push(`${m[1]}: ${m[2].trim().slice(0, 40)} → ${resolved.trim().slice(0, 30)}`);
    }
  }
  // HTML stroke-width 属性
  for (const m of html.matchAll(/stroke-width\s*=\s*["']?(\d*\.?\d+)/g)) {
    if (+m[1] > 0 && +m[1] <= 40) {
      const k = +m[1];
      if (!found.has(k)) found.set(k, []);
      found.get(k).push(`html stroke-width=${m[1]}`);
    }
  }
  console.log(`${id}  用正确口径能查到: [${[...found.keys()].sort((a, b) => a - b).join('、')}]`);
  for (const [k, v] of [...found.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`    ${k}px: ${v[0]}${v.length > 1 ? ` (+${v.length - 1} 处)` : ''}`);
  }
  console.log();
}
