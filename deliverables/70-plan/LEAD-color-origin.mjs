#!/usr/bin/env node
// Lead 独立核实 v6：追查"实画但不在调色板"的颜色来自哪里
// 重点：S19 的 #5E5443（上一轮实测用了 247 次，是正文色）——它在 css 里怎么写的？在规格里有没有？
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const TARGETS = {
  S19: ['#5E5443', '#534C3E', '#A79C82'],
  S14: ['#9A968C'],
  S02: ['#0000EE', '#0A0A0D'],
  S03: ['#4A5A5E', '#7C8A8C', '#3B4A4D'],
};

const HEXT = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const norm = (h) => { h = h.toLowerCase(); return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h; };

for (const [id, colors] of Object.entries(TARGETS)) {
  const dir = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith(id + '-')).map((d) => d.name)[0];
  if (!dir) { console.log(id, '目录不存在'); continue; }
  const css = readFileSync(join(ROOT, 'prototypes', dir, 'style.css'), 'utf8');
  const html = readFileSync(join(ROOT, 'prototypes', dir, 'index.html'), 'utf8');
  const spec = readFileSync(join(ROOT, 'prototypes/_specs', id + '.md'), 'utf8');
  const dnaRaw = JSON.parse(readFileSync(join(ROOT, 'prototypes/_prompts/dna-clean.json'), 'utf8'));
  const arr = Array.isArray(dnaRaw) ? dnaRaw : Object.values(dnaRaw);
  const mine = arr.find((x) => x.id === id) || {};

  console.log(`\n${'='.repeat(70)}\n${id}  (${dir})\n${'='.repeat(70)}`);
  console.log(`dna-clean.palette (${(mine.palette || []).length}): ${(mine.palette || []).join(' | ')}`);
  console.log(`dna-clean.primary: ${JSON.stringify(mine.primary)}`);

  for (const c of colors) {
    const low = c.toLowerCase();
    // css 里出现位置
    const cssLines = css.split(/\r?\n/).map((l, i) => ({ l, n: i + 1 }))
      .filter((x) => x.l.toLowerCase().includes(low));
    // html
    const htmlLines = html.split(/\r?\n/).map((l, i) => ({ l, n: i + 1 }))
      .filter((x) => x.l.toLowerCase().includes(low));
    // spec
    const specHas = spec.toLowerCase().includes(low);
    // 是否声明为 :root 变量
    const varDecl = cssLines.filter((x) => /^\s*--[\w-]+\s*:/.test(x.l));
    const usedAsVar = cssLines.filter((x) => /var\(/.test(x.l) === false);

    console.log(`\n  ── ${c} ──`);
    console.log(`    规格文件里存在: ${specHas ? '是' : '否'}`);
    console.log(`    CSS 出现行数: ${cssLines.length}   HTML 出现行数: ${htmlLines.length}`);
    if (varDecl.length) console.log(`    作为 CSS 变量声明: ${varDecl.map((x) => 'L' + x.n + ' ' + x.l.trim()).join(' ; ')}`);
    const others = cssLines.filter((x) => !varDecl.includes(x));
    if (others.length) console.log(`    非变量声明处（前 4）: ${others.slice(0, 4).map((x) => 'L' + x.n + ' ' + x.l.trim().slice(0, 90)).join(' ; ')}`);
    if (htmlLines.length) console.log(`    HTML（前 3）: ${htmlLines.slice(0, 3).map((x) => 'L' + x.n + ' ' + x.l.trim().slice(0, 80)).join(' ; ')}`);
    if (specHas) {
      const i = spec.toLowerCase().indexOf(low);
      console.log(`    规格上下文: ...${spec.slice(Math.max(0, i - 110), i + 110).replace(/\s+/g, ' ')}...`);
    }
  }
}
