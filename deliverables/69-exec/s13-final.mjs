/* 候选终稿：只放宽「正文条款 + 附注段」到 640px，且**只在桌面档**生效（≥1440px）。
 * 与审计口径的差别与理由：
 *   · 限定桌面：768 / 390 两档的 filled 与 docH 必须与改前逐项相同（见 s13-final-check）。
 *   · 不放宽 .colophon__* / .signature__status：s13-matrix 实测，把页脚也放宽会把页高
 *     压短、末屏内容更少，反而从 0.24 掉到 0.17 并 FAIL —— 说明这个指标对"末屏多高"
 *     极敏感，能不动的地方就不要动。
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'D:/Web/style/deliverables/69-exec/_s13final';
rmSync(BASE, { recursive: true, force: true });
mkdirSync(BASE, { recursive: true });
cpSync('D:/Web/style/prototypes/_fonts', join(BASE, '_fonts'), { recursive: true });

const CANDIDATES = {
  'desk640': 640,
  'desk680': 680,
  'desk720': 720,
};

for (const [tag, px] of Object.entries(CANDIDATES)) {
  const W = join(BASE, tag);
  cpSync('D:/Web/style/prototypes/S13-blind-debossed-dispatch', W, { recursive: true });
  const css = `\n@media (min-width: 1440px) {\n  .clause__body, .annex__note, .levels__lead, .levels__note, .log__empty, .log__error { max-width: ${px}px; }\n}\n`;
  writeFileSync(join(W, 'style.css'), readFileSync(join(W, 'style.css'), 'utf8') + css, 'utf8');
  const out = join(BASE, `${tag}-inspect`);
  spawnSync(process.execPath, [
    'D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/inspect.mjs',
    join(W, 'index.html'), '--out', out, '--widths', '1440,768,390', '--json',
  ], { encoding: 'utf8', cwd: 'D:/Web/style', maxBuffer: 1 << 28 });
  let rep = null;
  try { rep = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8')); } catch {}
  const g = (w) => (rep ? rep.viewports.find((v) => v.width === w) : null);
  const fails = rep ? rep.findings.filter((f) => f.level === 'FAIL').map((f) => f.id) : ['NO_REPORT'];
  const warns = rep ? rep.findings.filter((f) => f.level === 'WARN').map((f) => f.id) : [];
  console.log(`\n=== ${tag} (max-width ${px}px @≥1440)`);
  console.log(`  FAIL=[${fails.join(',')}]  WARN=[${warns.join(',')}]`);
  for (const w of [1440, 768, 390]) {
    const v = g(w);
    if (!v) continue;
    console.log(`  ${String(w).padEnd(4)} docH=${v.metrics.page.height} 屏=${v.screens} measureChars=${v.metrics.type.measureChars} filled=${JSON.stringify(v.filled)}`);
  }
}

// 基线对照（改前），供逐项比较
console.log('\n--- 基线（改前，用于对照 768/390 是否被动到）---');
const outBase = join(BASE, 'base-inspect');
spawnSync(process.execPath, [
  'D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/inspect.mjs',
  'D:/Web/style/prototypes/S13-blind-debossed-dispatch/index.html', '--out', outBase, '--widths', '1440,768,390', '--json',
], { encoding: 'utf8', cwd: 'D:/Web/style', maxBuffer: 1 << 28 });
const rb = JSON.parse(readFileSync(join(outBase, 'report.json'), 'utf8'));
for (const w of [1440, 768, 390]) {
  const v = rb.viewports.find((x) => x.width === w);
  console.log(`  ${String(w).padEnd(4)} docH=${v.metrics.page.height} 屏=${v.screens} measureChars=${v.metrics.type.measureChars} filled=${JSON.stringify(v.filled)}`);
}
