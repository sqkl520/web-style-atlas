/* 640px 这个值稳不稳？
 * 依据：审计的 fixed 版（只放宽 .clause p / .annex p / .levels p / .log p）
 * 得到 filled=[0.55,0.25,0.16,0.31,0.28,0.24] —— 最差那一屏 0.24，离阈值 0.20 只有 0.04。
 * 而我自己的 c640-n640 变体（额外放宽 .plates__lead 与 .colophon__line）就掉到 0.17 并 FAIL。
 * ⇒ 「能不能过」取决于无关的排版微调，也就是说它是刀刃上的，不是稳健的。
 *
 * 本节用一组**与本次修改无关**的扰动（改一个 margin）来证明这件事：
 * 如果 640px 的结论经不起页脚少一行，那它就不该被当成"修好了"。
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'D:/Web/style/deliverables/69-exec/_s13sens';
rmSync(BASE, { recursive: true, force: true });
mkdirSync(BASE, { recursive: true });
cpSync('D:/Web/style/prototypes/_fonts', join(BASE, '_fonts'), { recursive: true });

const AUDIT_CSS = `.clause p, .annex p, .levels p, .log p { max-width: 640px !important; }\n`;
// 无关扰动：只改页脚上内距（不影响任何"行长"判断，纯粹改页面总高）
const PERTURB = [
  ['p-0', ''],
  ['p-8', '.colophon{padding-bottom:88px}\n'],
  ['p-16', '.colophon{padding-bottom:80px}\n'],
  ['p-32', '.colophon{padding-bottom:64px}\n'],
  ['p-64', '.colophon{padding-bottom:32px}\n'],
];

for (const [tag, extra] of PERTURB) {
  const W = join(BASE, tag);
  cpSync('D:/Web/style/prototypes/S13-blind-debossed-dispatch', W, { recursive: true });
  writeFileSync(join(W, 'style.css'), readFileSync(join(W, 'style.css'), 'utf8') + '\n' + AUDIT_CSS + extra, 'utf8');
  const out = join(BASE, `${tag}-inspect`);
  spawnSync(process.execPath, [
    'D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/inspect.mjs',
    join(W, 'index.html'), '--out', out, '--widths', '1440', '--json',
  ], { encoding: 'utf8', cwd: 'D:/Web/style', maxBuffer: 1 << 28 });
  let rep = null;
  try { rep = JSON.parse(readFileSync(join(out, 'report.json'), 'utf8')); } catch {}
  const vp = rep ? rep.viewports.find((v) => v.width === 1440) : null;
  const m = vp ? vp.metrics : null;
  const fails = rep ? rep.findings.filter((f) => f.level === 'FAIL').map((f) => f.id) : ['NO_REPORT'];
  const worst = vp ? Math.min(...vp.filled.filter((x) => x !== null)) : null;
  console.log(`${tag.padEnd(6)} docH=${String(m ? m.page.height : '—').padEnd(6)} 屏数=${vp ? vp.screens : '—'} 最差屏=${worst} FAIL=[${fails.join(',')}]  filled=${JSON.stringify(vp ? vp.filled : null)}`);
}
