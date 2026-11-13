// 第二轮：字体链命中（最强判据）+ 解析 CSS 变量后的字号比
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const BLIND = join(ROOT, 'deliverables/78-northstar/blind');
const STAGED = join(HERE, '_staged');
const CASES = ['S04','S08','S13','S15','S18','S21','S22','S29','S31','S32','S35','S97','S98','S99'];

function pickArtifact(id) {
  for (const n of [`${id}-sandbox.html`, `${id}-judge.html`]) {
    const p = join(STAGED, n);
    if (existsSync(p)) return p;
  }
  return null;
}

// 提取字体链里的所有具体字体名
function fontNames(task) {
  const line = (task.match(/^2\. 字体：[^\n]*/m) || [''])[0];
  const names = new Set();
  // 「取第一个可用的：A → B → C」 与 「按序取：A → B → C」
  for (const seg of line.split(/[：:]/).slice(1)) {
    for (const part of seg.split(/[（(]/)[0].split('→')) {
      const n = part.trim().replace(/[，。,\.]$/, '');
      if (n && n.length > 2 && !/^编号|^正文|^不要/.test(n)) names.add(n);
    }
  }
  // 等宽字体：「用等宽 XXX、tabular-nums」
  const mono = line.match(/用等宽\s*([A-Za-z0-9 ]+?)、/);
  if (mono) names.add(mono[1].trim());
  return [...names];
}

// 解析 :root / 任何选择器里的 --var: value
function cssVars(html) {
  const map = new Map();
  for (const m of html.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;]{1,120});/g)) {
    map.set(m[1], m[2].trim());
  }
  return map;
}
function resolveVal(v, vars, depth = 0) {
  if (depth > 6) return v;
  return v.replace(/var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*([^)]*))?\)/g, (_, name, fb) => {
    if (vars.has(name)) return resolveVal(vars.get(name), vars, depth + 1);
    return fb ?? '';
  });
}

for (const id of CASES) {
  const art = pickArtifact(id);
  const tf = join(BLIND, id, 'task.txt');
  console.log('\n========== ' + id + ' ==========');
  if (!art) { console.log('  NO ARTIFACT'); continue; }
  const html = readFileSync(art, 'utf8');
  const task = existsSync(tf) ? readFileSync(tf, 'utf8') : '';
  const names = fontNames(task);
  const hit = names.filter(n => html.toLowerCase().includes(n.toLowerCase()));
  console.log(`  字体名 ${names.length} 个 -> 命中 ${hit.length}`);
  console.log(`    提示: ${JSON.stringify(names)}`);
  console.log(`    命中: ${JSON.stringify(hit)}`);

  // 字号比（解析变量）
  const vars = cssVars(html);
  const vals = [];
  for (const m of html.matchAll(/font-size\s*:\s*([^;}"'`\n]+)/g)) {
    const raw = m[1].trim();
    const r = resolveVal(raw, vars);
    const c = r.match(/clamp\(\s*([0-9.]+)(px)?\s*,\s*([^,]+)\s*,\s*([0-9.]+)(px)?\s*\)/);
    if (c) { vals.push({ px: +c[4], from: raw }); continue; }
    const p = r.match(/^\s*([0-9.]+)px\s*$/);
    if (p) { vals.push({ px: +p[1], from: raw }); continue; }
    // calc / 混合，尽量取其中最后出现的 px
    const any = [...r.matchAll(/([0-9.]+)px/g)];
    if (any.length) vals.push({ px: Math.max(...any.map(x => +x[1])), from: raw });
  }
  const pxAll = vals.map(v => v.px).filter(n => n > 0 && n < 400);
  const max = pxAll.length ? Math.max(...pxAll) : null;
  // 正文基准：提示词给的正文 px，在产物中找最接近的那一档
  const bodyHint = (task.match(/正文(?:约|是)?\s*([0-9.]+)\s*px/) || [])[1];
  const hint = bodyHint ? +bodyHint : null;
  let base = null;
  if (hint) {
    const near = pxAll.filter(n => Math.abs(n - hint) <= 1).sort((a, b) => Math.abs(a - hint) - Math.abs(b - hint));
    base = near.length ? near[0] : null;
  }
  const ratioHint = (task.match(/([0-9.]+)\s*倍/) || [])[1];
  console.log(`  字号: 提示正文=${hint}px 倍率=${ratioHint} | 产物最大=${max}px 正文命中=${base}px` +
    ` | 实测比=${(max && base) ? (max / base).toFixed(2) : 'n/a'}`);
  // 列出最大的几档，便于人工核对
  const top = [...new Set(pxAll)].sort((a, b) => b - a).slice(0, 5);
  console.log(`    最大五档: [${top.join(', ')}]`);
}
