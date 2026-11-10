// 任务 1 探针 C：逐案逐行取证 —— 5 个缺陷案的每一条线宽声明，带行号、带宿主选择器。
// 输出人类可读的 .txt（不只是 JSON），因为报告里要逐字引用。
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const CASES = ['S09', 'S10', 'S15', 'S25', 'S27'];
const lines = [];
const log = (s) => { lines.push(s); };

const r2 = (n) => Math.round(n * 100) / 100;

function rootVars(css) {
  const vars = {};
  for (const m of css.matchAll(/:root\s*\{([\s\S]*?)\}/g))
    for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
  return vars;
}
function expand(v, vars, depth = 0) {
  if (depth > 6 || !/var\(/.test(v)) return v;
  const s = v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (_, n, fb) =>
    vars[n] !== undefined ? vars[n] : fb !== undefined ? fb : '/*unres*/');
  return expand(s, vars, depth + 1);
}
function calc(v) {
  return v
    .replace(/calc\(\s*([0-9.]+)px\s*\*\s*([0-9.]+)\s*\)/g, (_, a, b) => r2(parseFloat(a) * parseFloat(b)) + 'px')
    .replace(/calc\(\s*([0-9.]+)\s*\*\s*([0-9.]+)px\s*\)/g, (_, a, b) => r2(parseFloat(a) * parseFloat(b)) + 'px');
}
// 找某行所在的选择器（向上回溯到上一个 { 或 }）
function selectorAt(src, idx) {
  const before = src.slice(0, idx);
  const lastOpen = before.lastIndexOf('{');
  const lastClose = before.lastIndexOf('}');
  if (lastOpen < 0 || lastClose > lastOpen) return '(top-level)';
  const prevClose = before.lastIndexOf('}', lastOpen);
  const sel = before.slice(prevClose + 1, lastOpen).trim().replace(/\s+/g, ' ');
  return sel.length > 120 ? sel.slice(0, 120) + '…' : sel;
}
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

const data = {};
for (const id of CASES) {
  const dir = readdirSync(P).find((d) => d.startsWith(id + '-'));
  const cssPath = join(P, dir, 'style.css');
  const htmlPath = join(P, dir, 'index.html');
  const cssRaw = readFileSync(cssPath, 'utf8');
  const htmlRaw = readFileSync(htmlPath, 'utf8');
  const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, (s) => ' '.repeat(s.length)); // 保长度以维持行号
  const vars = rootVars(cssRaw);

  log('='.repeat(100));
  log(id + '  dir=' + dir);
  log('='.repeat(100));

  const rec = { id, dir, decls: [], inline: [], varsOfInterest: {} };

  // ── CSS 里的 border/outline/stroke-width ──
  const re = /(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|stroke-width)\s*:\s*([^;}]+)/g;
  let m;
  while ((m = re.exec(css))) {
    const prop = m[0].slice(0, m[0].indexOf(':')).trim();
    const rawV = m[1].trim();
    const resolved = calc(expand(rawV, vars));
    const nums = [];
    for (const q of resolved.matchAll(/([0-9.]+)px/g)) nums.push(parseFloat(q[1]));
    if (/stroke-width/i.test(prop)) {
      const bare = resolved.trim().match(/^([0-9.]+)$/);
      if (bare) nums.push(parseFloat(bare[1]));
    }
    const ln = lineOf(css, m.index);
    const sel = selectorAt(css, m.index);
    rec.decls.push({ line: ln, sel, prop, rawV, resolved: resolved.trim(), nums });
    log(`  L${String(ln).padEnd(4)} ${prop.padEnd(14)} ${rawV.slice(0, 52).padEnd(54)} → ${resolved.trim().slice(0, 44).padEnd(46)} [${nums.join(',')}]  ⓐ${sel}`);
  }

  // ── HTML 内联 stroke-width 属性 ──
  for (const mi of htmlRaw.matchAll(/stroke-width\s*=\s*["']([^"']+)["']/g)) {
    const ln = lineOf(htmlRaw, mi.index);
    const near = htmlRaw.slice(Math.max(0, mi.index - 160), mi.index + 40).replace(/\s+/g, ' ');
    const idm = near.match(/(?:id|class)\s*=\s*["']([^"']{0,60})["']/);
    rec.inline.push({ line: ln, val: mi[1], near: idm ? idm[0] : '' });
    log(`  L${String(ln).padEnd(4)} [HTML内联] stroke-width="${mi[1]}"   ${idm ? idm[0] : ''}`);
  }
  // data-URI 内联
  for (const mi of [...cssRaw.matchAll(/stroke-width(?:=|%3D)\s*['"]?(%?[0-9.]+)/gi)]) {
    const ln = lineOf(cssRaw, mi.index);
    log(`  L${String(ln).padEnd(4)} [data-URI] stroke-width=${decodeURIComponent(mi[1])}`);
    rec.inline.push({ line: ln, val: decodeURIComponent(mi[1]), near: 'data-URI' });
  }

  // ── 相关变量 ──
  for (const [k, v] of Object.entries(vars)) {
    if (/[0-9.]+px/.test(v) && /\b(mis|line|rule|stroke|hair|border|w|weight|rule-w)\b/i.test(k)) {
      rec.varsOfInterest[k] = v;
      log(`  VAR ${k.padEnd(16)} = ${v}`);
    }
  }
  // 所有 :focus-visible / outline 出现处
  for (const mf of cssRaw.matchAll(/:focus-visible[^{]*\{([^}]*)\}/g)) {
    if (/outline/.test(mf[1])) {
      log(`  L${lineOf(cssRaw, mf.index)} [focus-visible] ${mf[1].replace(/\s+/g, ' ').trim().slice(0, 90)}`);
    }
  }
  data[id] = rec;
  log('');
}

writeFileSync(join(OUT, 't1-evidence5.txt'), lines.join('\n'), 'utf8');
writeFileSync(join(OUT, 't1-evidence5.json'), JSON.stringify(data, null, 1), 'utf8');
console.log(lines.join('\n'));
