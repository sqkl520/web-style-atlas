#!/usr/bin/env node
/* EXEC-B：HTML 里 stroke-width 属性的**可达性**分析。
 *
 * 为什么需要：clean-dna 目前是正则扫 index.html 的 `stroke-width="N"`，
 * 它分不清三类完全不同的东西：
 *   ① 纹理/遮罩 —— 在 <pattern>/<clipPath>/<mask>/<marker> 里。它们是**填充图案**，
 *      不是版式线条，不该进「线宽分级」。实测 S20 的 `pattern#grid8` 里的 0.2 就是这类。
 *   ② 符号定义 —— 在 <symbol> 或带 id 的 <defs> 子元素里，**只有被 <use> 引用才画**。
 *      S19 的 0.4/0.8 被 26 个 use 引用（该算），纯备用的图标（没被引用）不该算。
 *   ③ 直接绘制 —— 其余全部该算。
 *
 * 本探针把 30 案的每个 stroke-width 属性归到这三类，给出"若按可达性过滤会删掉哪些值"。
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const DIRS = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

/* 逐字符扫 HTML，维护"当前所在的 svg 容器栈"，比正则可靠（属性里可能含 > ） */
function analyze(htmlRaw) {
  const html = htmlRaw
    .replace(/<!--[\s\S]*?-->/g, (m) => " ".repeat(m.length))
    .replace(/<script\b[\s\S]*?<\/script>/gi, (m) => " ".repeat(m.length));
  const out = [];
  const stack = [];
  const usedIds = new Set();
  for (const m of html.matchAll(/<use\b[^>]*>/gi)) {
    const h = m[0].match(/(?:href|xlink:href)\s*=\s*["']?#([^"'\s>]+)/i);
    if (h) usedIds.add(h[1]);
  }
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)(\/?)>/g)) {
    const [, closing, tagRaw, attrs, selfClose] = m;
    const tag = tagRaw.toLowerCase();
    if (closing) {
      for (let k = stack.length - 1; k >= 0; k--) { if (stack[k].tag === tag) { stack.splice(k, 1); break; } }
      continue;
    }
    if (/^(\/)?(br|img|input|meta|link|hr)$/i.test(tag)) continue;
    const idm = attrs.match(/\bid\s*=\s*["']([^"']+)["']/i);
    const id = idm ? idm[1] : null;
    const swm = attrs.match(/stroke-width\s*=\s*["']?\s*([0-9.]+)/i);
    if (swm) {
      const n = parseFloat(swm[1]);
      const enclosing = stack.map((s) => s.tag);
      const inPattern = enclosing.some((t) => /^(pattern|clippath|mask|marker|filter)$/.test(t));
      const symHost = [...stack].reverse().find((s) => s.tag === 'symbol');
      const defsIdHost = [...stack].reverse().find((s) => s.id && /^(defs|g)$/.test(s.tag));
      let kind = 'direct';
      if (inPattern) kind = 'texture';
      else if (symHost) kind = (symHost.id && usedIds.has(symHost.id)) ? 'use-referenced' : 'symbol-unused';
      else if (defsIdHost && defsIdHost.id) kind = usedIds.has(defsIdHost.id) ? 'use-referenced' : 'defs-unreferenced';
      out.push({ n, kind, tag, id, enclosing: enclosing.slice(-3).join('>') });
    }
    if (!selfClose) stack.push({ tag, id });
  }
  /* <path id="x" stroke-width> 自己带 id 且被 use 引用的情况（S09 的 stroke-outer） */
  for (const x of out) {
    if (x.id && usedIds.has(x.id) && x.kind === 'direct') x.kind = 'use-referenced';
  }
  return out;
}

const rows = [];
for (const d of DIRS) {
  const sid = d.slice(0, 3);
  const html = readFileSync(join(ROOT, 'prototypes', d, 'index.html'), 'utf8');
  const items = analyze(html);
  const by = (k) => [...new Set(items.filter((i) => i.kind === k).map((i) => i.n))].sort((a, b) => a - b);
  rows.push({ sid, texture: by('texture'), unused: [...new Set([...by('symbol-unused'), ...by('defs-unreferenced')])].sort((a, b) => a - b),
    used: by('use-referenced'), direct: by('direct'), items });
}
writeFileSync(join(ROOT, 'deliverables/70-exec/probes-b/html-stroke-reachability.json'), JSON.stringify(rows, null, 1));

console.log('案    纹理(pattern)  未被引用的 symbol/defs   <use> 引用   直接绘制');
for (const r of rows) {
  if (!r.texture.length && !r.unused.length) continue;
  console.log(r.sid + '   ' + (r.texture.join(',') || '—').padEnd(14) + '  ' +
    (r.unused.join(',') || '—').padEnd(23) + '  ' + (r.used.join(',') || '—').padEnd(12) + '  ' + (r.direct.join(',') || '—'));
}
console.log('\n=== 汇总 ===');
console.log('  含纹理 stroke-width 的案: ' + rows.filter((r) => r.texture.length).map((r) => r.sid + '(' + r.texture.join(',') + ')').join(' / ') || '无');
console.log('  含"未被引用的 symbol/defs 定义"的案: ' + (rows.filter((r) => r.unused.length).map((r) => r.sid + '(' + r.unused.join(',') + ')').join(' / ') || '无'));
console.log('\n  按可达性过滤后应删掉的值（纹理 + 未引用）：');
for (const r of rows) {
  const drop = [...new Set([...r.texture, ...r.unused])];
  if (drop.length) console.log('    ' + r.sid + '  ' + drop.join(',') + 'px');
}
