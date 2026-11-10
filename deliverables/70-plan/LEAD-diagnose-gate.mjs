import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'D:/Web/style';

const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
function parseRootVars(css) {
  const m = stripCssComments(css).match(/:root\s*\{([\s\S]*?)\}/);
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
function cssLineWidths(css) {
  const clean = stripCssComments(css);
  const vars = parseRootVars(css);
  const out = new Map();
  const PROP_RE = /(?:^|[;{\s])(border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|column-rule(?:-width)?|stroke-width)\s*:\s*([^;}]+)/g;
  for (const m of clean.matchAll(PROP_RE)) {
    const resolved = resolveVars(m[2], vars);
    const w = resolved.match(/(?:^|\s)(\d*\.?\d+)px/);
    if (w && +w[1] > 0 && +w[1] <= 40) {
      if (!out.has(+w[1])) out.set(+w[1], []);
      out.get(+w[1]).push(`${m[1]}: ${m[2].trim().slice(0, 50)}`);
    }
  }
  return out;
}

const TARGETS = ['S04', 'S09', 'S11'];
const DIRS = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

for (const d of DIRS) {
  const id = d.slice(0, 3);
  if (!TARGETS.includes(id)) continue;
  const css = readFileSync(join(ROOT, 'prototypes', d, 'style.css'), 'utf8');
  const found = cssLineWidths(css);
  const claimed = { S04: [1, 1.1, 3], S09: [2, 3, 3.5, 3.6], S11: [1, 1.25, 2, 3] }[id];
  console.log(`\n=== ${id}  声称 [${claimed.join('、')}]  查到 [${[...found.keys()].sort((a, b) => a - b).join('、')}] ===`);
  for (const c of claimed) {
    const hit = found.get(c);
    console.log(`  ${c}px: ${hit ? '✓ ' + hit[0] : '✗ 查不到'}`);
  }
  // 对查不到的，直接在原文里找
  for (const c of claimed) {
    if (found.has(c)) continue;
    const cssClean = stripCssComments(css);
    const re = new RegExp(`([a-z-]+)\\s*:\\s*[^;}]*\\b${String(c).replace('.', '\\.')}px`, 'g');
    const hits = [...cssClean.matchAll(re)];
    console.log(`    原文里 ${c}px 的上下文: ${hits.length ? hits.map((m) => m[0].slice(0, 70)).join(' | ') : '（没有）'}`);
    // 变量里找
    const vars = parseRootVars(css);
    for (const [k, v] of vars) {
      if (new RegExp(`\\b${String(c).replace('.', '\\.')}px`).test(v)) console.log(`      变量 ${k}: ${v}`);
    }
  }
}
