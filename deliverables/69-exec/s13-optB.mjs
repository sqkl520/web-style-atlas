/* 选项 B：保留 32 汉字的行长（480px 不动），改成把「条款区」的栏位收窄，
 * 让正文不再被困在一个 897px 的宽框里。这样规格的两句话各自都还成立：
 *   ① 行长 32 汉字（15px × 32 = 480px，实测不变）
 *   ② 「正文条款只占 1–11 栏」→ 改为 1–8 栏（这是唯一的偏离点）
 * 与选项 A（放大行长到 640px = 42.7 汉字）并列比较，再决定。
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'D:/Web/style/deliverables/69-exec/_s13optB';
rmSync(BASE, { recursive: true, force: true });
mkdirSync(BASE, { recursive: true });
cpSync('D:/Web/style/prototypes/_fonts', join(BASE, '_fonts'), { recursive: true });

const VARIANTS = {
  'B8':  '.clauses, .levels, .log{grid-column:1 / span 8}',
  'B9':  '.clauses, .levels, .log{grid-column:1 / span 9}',
  'B10': '.clauses, .levels, .log{grid-column:1 / span 10}',
  'B11-sig12': '.clauses, .levels, .log{grid-column:1 / span 11}\n.signature{grid-column:12 / span 5}',
};

for (const [tag, rule] of Object.entries(VARIANTS)) {
  const W = join(BASE, tag);
  cpSync('D:/Web/style/prototypes/S13-blind-debossed-dispatch', W, { recursive: true });
  writeFileSync(join(W, 'style.css'), readFileSync(join(W, 'style.css'), 'utf8') + `\n@media (min-width:1440px){\n${rule}\n}\n`, 'utf8');
  const out = join(BASE, `${tag}-inspect`);
  spawnSync(process.execPath, [
    'D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/inspect.mjs',
    join(W, 'index.html'), '--out', out, '--widths', '1440', '--json',
  ], { encoding: 'utf8', cwd: 'D:/Web/style', maxBuffer: 1 << 28 });
  let rep = null;
  try { rep = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8')); } catch {}
  const vp = rep ? rep.viewports.find((v) => v.width === 1440) : null;
  const fails = rep ? rep.findings.filter((f) => f.level === 'FAIL').map((f) => f.id) : ['NO_REPORT'];
  const warns = rep ? rep.findings.filter((f) => f.level === 'WARN').map((f) => f.id) : [];
  console.log(`${tag.padEnd(10)} FAIL=[${fails.join(',')}] measure?=${warns.includes('measure')} measureChars=${vp ? vp.metrics.type.measureChars : '—'} docH=${vp ? vp.metrics.page.height : '—'}`);
  console.log(`${''.padEnd(10)} filled=${JSON.stringify(vp ? vp.filled : null)}`);
}
