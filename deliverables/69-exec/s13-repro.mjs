/* 逐步复现审计的实验（p22-s13-empty-fix.mjs 的 w600 / w720），
 * 确认「640px → RESULT: 0 FAIL」到底能不能重现；不能的话，差异出在哪。
 *
 * 审计的选择器（原样抄自 p22:26）：
 *   .clause p / .annex p / .levels p / .log p  → max-width: 640px !important
 * 注意这条**不匹配** .colophon__line、.signature__status、.plates__lead，
 * 也不匹配 .levels__lead（它是 .levels 的子元素但不是 p 吗？—— 是 p，会匹配）。
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'D:/Web/style/deliverables/69-exec/_s13audit';
rmSync(BASE, { recursive: true, force: true });
mkdirSync(BASE, { recursive: true });
cpSync('D:/Web/style/prototypes/_fonts', join(BASE, '_fonts'), { recursive: true });

const VARIANTS = [
  ['repro-base', null],
  ['repro-w600', '640px'],
  ['repro-w720', '720px'],
  ['exact-p22-w600', '640px', true],
];

for (const [tag, width, exact] of VARIANTS) {
  const W = join(BASE, tag);
  cpSync('D:/Web/style/prototypes/S13-blind-debossed-dispatch', W, { recursive: true });
  let css = '\n';
  if (width) {
    if (exact) {
      // 完全照抄 p22:26
      css += `\n.clause p { max-width: ${width} !important; }\n.annex p, .levels p, .log p { max-width: ${width} !important; }\n`;
    } else {
      css += `.clause p, .annex p, .levels p, .log p { max-width: ${width} !important; }\n`;
    }
  }
  writeFileSync(join(W, 'style.css'), readFileSync(join(W, 'style.css'), 'utf8') + css, 'utf8');

  const out = join(BASE, `${tag}-inspect`);
  const r = spawnSync(process.execPath, [
    'D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/inspect.mjs',
    join(W, 'index.html'), '--out', out, '--widths', '1440',
  ], { encoding: 'utf8', cwd: 'D:/Web/style', maxBuffer: 1 << 28 });
  const txt = (r.stdout || '') + (r.stderr || '');
  const resultLine = (txt.split('\n').find((l) => /RESULT/.test(l)) || '(no RESULT line)').trim();
  const failLines = txt.split('\n').filter((l) => /^\s*\[.*\] @/.test(l)).map((l) => l.trim());
  let rep = null;
  try { rep = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8')); } catch {}
  const vp = rep ? rep.viewports.find((v) => v.width === 1440) : null;
  const m = vp ? vp.metrics : null;

  console.log(`\n=== ${tag}  (max-width ${width || '原样'})`);
  console.log('  ' + resultLine);
  for (const l of failLines) console.log('  ' + l);
  if (vp) console.log(`  filled=${JSON.stringify(vp.filled)} screens=${vp.screens} docH=${m.page.height} measureChars=${m.type.measureChars}`);
}
