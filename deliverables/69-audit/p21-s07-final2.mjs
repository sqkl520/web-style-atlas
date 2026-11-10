// S07 收尾：把 .code 的日期与 .rng 的年份区间也包进 <code>，验证 mono = 0。
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const BASE = resolve('D:/Web/style/deliverables/69-audit/exp3');
const WRAP = join(BASE, 'S07-wrapped3');
rmSync(WRAP, { recursive: true, force: true });
cpSync('D:/Web/style/prototypes/S07-slate-ink-contents', WRAP, { recursive: true });
let html = readFileSync(join(WRAP, 'index.html'), 'utf8');
let n = 0;
html = html.replace(/<span class="(p|k|code)">([^<]*)<\/span>/g, (m, c, inner) => { n++; return `<code class="${c}">${inner}</code>`; });
html = html.replace(/<dd( class="[^"]*")?>([\d\-–]+)<\/dd>/g, (m, attrs, inner) => { n++; return `<dd${attrs || ''}><code>${inner}</code></dd>`; });
html = html.replace(/(<span>第 \d+ 页<\/span>)/g, (m, inner) => { n++; return `<code>${inner}</code>`; });
writeFileSync(join(WRAP, 'index.html'), html);
appendFileSync(join(WRAP, 'style.css'), '\ncode { font-family: inherit; }\n');
console.log(`S07 wrapped3: 包了 ${n} 处`);
const r = spawnSync(process.execPath, [
  'D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/inspect.mjs',
  join(WRAP, 'index.html'), '--out', join(BASE, 'S07-inspect3'), '--widths', '1440,768,390',
], { encoding: 'utf8', cwd: 'D:/Web/style' });
console.log(((r.stdout || '') + (r.stderr || '')).split('\n').filter((l) => /RESULT|\[mono\]|\[font-count\]/.test(l)).join('\n'));
