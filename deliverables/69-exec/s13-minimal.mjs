/* 找出「最小充分集」：哪些 max-width 必须放宽，页面才从 FAIL 变 PASS。
 * 目的不是凑数，是让改动面最小、可解释。
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'D:/Web/style/deliverables/69-exec/_s13min';
rmSync(BASE, { recursive: true, force: true });
mkdirSync(BASE, { recursive: true });
cpSync('D:/Web/style/prototypes/_fonts', join(BASE, '_fonts'), { recursive: true });

const SETS = {
  'audit-equiv': ['.clause__body', '.annex__note', '.levels__lead', '.levels__note', '.log__empty', '.log__error'],
  'only-clause': ['.clause__body'],
  'clause+levels': ['.clause__body', '.levels__lead', '.levels__note'],
  'clause+annex+levels': ['.clause__body', '.annex__note', '.levels__lead', '.levels__note'],
  'no-log-error': ['.clause__body', '.annex__note', '.levels__lead', '.levels__note', '.log__empty'],
  'with-plates': ['.clause__body', '.annex__note', '.levels__lead', '.levels__note', '.log__empty', '.log__error', '.plates__lead'],
};

for (const [tag, sels] of Object.entries(SETS)) {
  for (const mq of ['none', 'desktop']) {
    const name = `${tag}__${mq}`;
    const W = join(BASE, name);
    cpSync('D:/Web/style/prototypes/S13-blind-debossed-dispatch', W, { recursive: true });
    const rule = sels.map((s) => `${s}{max-width:640px}`).join('\n');
    const css = mq === 'desktop' ? `\n@media (min-width:1024px){\n${rule}\n}\n` : `\n${rule}\n`;
    writeFileSync(join(W, 'style.css'), readFileSync(join(W, 'style.css'), 'utf8') + css, 'utf8');

    const out = join(BASE, `${name}-inspect`);
    spawnSync(process.execPath, [
      'D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/inspect.mjs',
      join(W, 'index.html'), '--out', out, '--widths', '1440,768,390', '--json',
    ], { encoding: 'utf8', cwd: 'D:/Web/style', maxBuffer: 1 << 28 });
    let rep = null;
    try { rep = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8')); } catch {}
    const fails = rep ? rep.findings.filter((f) => f.level === 'FAIL').map((f) => f.id) : ['NO_REPORT'];
    const warns = rep ? rep.findings.filter((f) => f.level === 'WARN').map((f) => f.id) : [];
    const v1440 = rep ? rep.viewports.find((v) => v.width === 1440) : null;
    const v768 = rep ? rep.viewports.find((v) => v.width === 768) : null;
    const v390 = rep ? rep.viewports.find((v) => v.width === 390) : null;
    console.log(`${name.padEnd(30)} FAIL=[${fails.join(',')}] measure?=${warns.includes('measure')}  f1440=${JSON.stringify(v1440 ? v1440.filled : null)}`);
    if (v768) console.log(`${''.padEnd(30)}   f768=${JSON.stringify(v768.filled)} measureChars768=${v768.metrics.type.measureChars}  f390=${JSON.stringify(v390 ? v390.filled : null)}`);
  }
}
