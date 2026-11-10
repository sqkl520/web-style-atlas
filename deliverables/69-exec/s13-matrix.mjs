/* S13：把「正文条款」与「注释段」分成两个独立变量。
 *
 * 为什么必须分开：`_specs/S13.md` 字段 5 写的是「行长限制 32 个汉字」，指的是**正文条款**。
 * 而 .levels__lead / .plates__lead / .annex__note / .colophon__line / .log__empty
 * 这些是附注，不是条款正文，规格没给它们订行长。把两者混在一起改，
 * 就会得出"为了过闸门把正文行长从 32 汉字放宽到 43 汉字"这种与规格直接冲突的结论。
 *
 * 变量：clause（只 .clause__body）/ notes（只注释段）/ both / none
 * 值：480（原样）/ 560 / 600 / 640 / 680 / 720 / 11 栏满宽
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'D:/Web/style/deliverables/69-exec/_s13m';
rmSync(BASE, { recursive: true, force: true });
mkdirSync(BASE, { recursive: true });
cpSync('D:/Web/style/prototypes/_fonts', join(BASE, '_fonts'), { recursive: true });

const NOTES = ['.levels__lead', '.levels__note', '.plates__lead', '.annex__note',
  '.colophon__line', '.colophon__quirk', '.colophon__credits', '.log__empty', '.signature__status'];

const CELLS = [];
for (const clause of ['keep', 560, 600, 640, 680, 720]) {
  for (const notes of ['keep', 560, 640, 720]) {
    if (clause === 'keep' && notes === 'keep') CELLS.push({ clause, notes, tag: 'base' });
    else CELLS.push({ clause, notes, tag: `c${clause}-n${notes}` });
  }
}

const rows = [];
for (const c of CELLS) {
  const W = join(BASE, c.tag);
  cpSync('D:/Web/style/prototypes/S13-blind-debossed-dispatch', W, { recursive: true });
  let css = '\n/* 变体实验（不写回仓库） */\n';
  if (c.clause !== 'keep') css += `.clause__body{max-width:${c.clause}px !important}\n`;
  if (c.notes !== 'keep') css += NOTES.map((s) => `${s}{max-width:${c.notes}px !important}`).join('\n') + '\n';
  writeFileSync(join(W, 'style.css'), readFileSync(join(W, 'style.css'), 'utf8') + css, 'utf8');

  const out = join(BASE, `${c.tag}-inspect`);
  spawnSync(process.execPath, [
    'D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/inspect.mjs',
    join(W, 'index.html'), '--out', out, '--widths', '1440', '--json',
  ], { encoding: 'utf8', cwd: 'D:/Web/style', maxBuffer: 1 << 28 });

  let rep = null;
  try { rep = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8')); } catch {}
  const vp = rep ? rep.viewports.find((x) => x.width === 1440) : null;
  const m = vp ? vp.metrics : null;
  rows.push({
    tag: c.tag, clause: c.clause, notes: c.notes,
    fails: rep ? rep.findings.filter((f) => f.level === 'FAIL').map((f) => f.id) : ['NO_REPORT'],
    warns: rep ? rep.findings.filter((f) => f.level === 'WARN').map((f) => f.id) : [],
    filled: vp ? vp.filled : null,
    docH: m ? m.page.height : null,
    measure: m ? m.type.measureChars : null,
  });
  const r = rows[rows.length - 1];
  console.log(`${r.tag.padEnd(12)} FAIL=[${r.fails.join(',')}]  measure=${r.measure}  docH=${r.docH}  filled=${JSON.stringify(r.filled)}`);
}
writeFileSync(join(BASE, 'matrix.json'), JSON.stringify(rows, null, 1), 'utf8');

// 汇总：哪些组合 0 FAIL 且不打 measure
console.log('\n通过且不触发 measure（measure ≤ 88）：');
for (const r of rows) {
  if (!r.fails.length && r.measure !== null && r.measure <= 88) console.log(`  ✓ ${r.tag}`);
}
console.log('\n通过但触发 measure（>88）—— 属于"过闸门但破坏行长"：');
for (const r of rows) {
  if (!r.fails.length && r.measure !== null && r.measure > 88) console.log(`  ⚠ ${r.tag}  measure=${r.measure}`);
}
console.log('\n全部 FAIL：');
for (const r of rows) if (r.fails.length) console.log(`  ✗ ${r.tag}  [${r.fails.join(',')}] filled=${JSON.stringify(r.filled)}`);
