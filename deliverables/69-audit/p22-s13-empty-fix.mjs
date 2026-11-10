// 实验 A：S13 的 empty-screens 是不是「行长 480px 塞在 897px 栏里」造成的？
// 只改 .clause p 的 max-width（480 → 与契约自己给的 45–75 字符目标一致），看闸门与像素。
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, appendFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const BASE = resolve('D:/Web/style/deliverables/69-audit/exp4');
rmSync(BASE, { recursive: true, force: true });
mkdirSync(BASE, { recursive: true });
cpSync('D:/Web/style/prototypes/_fonts', join(BASE, '_fonts'), { recursive: true });

const VARIANTS = [
  ['base', null],
  ['w600', '640px'],
  ['w720', '720px'],
];
for (const [tag, width] of VARIANTS) {
  const W = join(BASE, tag);
  cpSync('D:/Web/style/prototypes/S13-blind-debossed-dispatch', W, { recursive: true });
  // 同时把 mono 包掉，隔离出 empty-screens 这一个变量
  let html = readFileSync(join(W, 'index.html'), 'utf8');
  html = html.replace(/<span([^>]*class="[^"]*(?:depth|mono)[^"]*"[^>]*)>([^<]*)<\/span>/g, (m, a, i) => `<code${a}>${i}</code>`);
  html = html.replace(/<td([^>]*class="[^"]*mono[^"]*"[^>]*)>([^<]*)<\/td>/g, (m, a, i) => `<td${a}><code>${i}</code></td>`);
  writeFileSync(join(W, 'index.html'), html);
  let css = '\ncode { font-family: inherit; }\n';
  if (width) css += `\n/* 审计实验：把条款行长放宽到规则自己给的 45–75 字符区间 */\n.clause p { max-width: ${width} !important; }\n.annex p, .levels p, .log p { max-width: ${width} !important; }\n`;
  appendFileSync(join(W, 'style.css'), css);
  const r = spawnSync(process.execPath, [
    'D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/inspect.mjs',
    join(W, 'index.html'), '--out', join(BASE, `${tag}-inspect`), '--widths', '1440',
  ], { encoding: 'utf8', cwd: 'D:/Web/style' });
  const out = (r.stdout || '') + (r.stderr || '');
  const fails = out.split('\n').filter((l) => /^\s*\[.*\] @/.test(l)).map((l) => l.trim());
  const filled = (() => { try { const j = JSON.parse(readFileSync(join(BASE, `${tag}-inspect`, 'report.json'), 'utf8')); const v = j.viewports.find((x) => x.width === 1440); return { filled: v.filled, h: v.metrics.page.height, screens: v.metrics.page.screens }; } catch { return null; } })();
  console.log(`\n=== ${tag}  (max-width ${width || '原样 480px'})`);
  console.log('  ' + (out.split('\n').find((l) => /RESULT/.test(l)) || ''));
  for (const f of fails) console.log('  ' + f);
  if (filled) console.log(`  pageH=${filled.h} screens=${filled.screens} filled=${JSON.stringify(filled.filled)}`);
}
