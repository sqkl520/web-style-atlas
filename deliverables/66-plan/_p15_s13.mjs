// P15：前提 6 的「修了会不会破坏它原本通过的 4 项」
//  S13 的 4 项 FAIL = mono / shadow / button-fx / empty-screens。
//  这里逐个判：哪些能在不违反 S13 自己设计规格（必须存在 X / 必须不存在 Y）的前提下修。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT, dirOf } from './_lib.mjs';

const d = dirOf('S13');
const css = readFileSync(join(d, 'style.css'), 'utf8');
const spec = readFileSync(join(ROOT, 'prototypes', '_specs', 'S13.md'), 'utf8');

console.log('== S13 规格里对「阴影」的硬要求（逐字）==');
spec.split(/\r?\n/).forEach((l, i) => {
  if (/必须存在 X|必须不存在 Y|单向硬光源|接触阴影|两枚对称阴影|内外阴影切换/.test(l)) {
    console.log(`  S13.md:${i + 1}  ${l.trim().slice(0, 220)}`);
  }
});

console.log('\n== style.css 里每条 box-shadow 的豁免注释（taste-skill-ignore）==');
const lines = css.split(/\r?\n/);
let withIg = 0, without = [];
lines.forEach((l, i) => {
  if (!/box-shadow\s*:/.test(l)) return;
  if (/taste-skill-ignore/.test(l)) withIg++;
  else without.push(`${i + 1}: ${l.trim().slice(0, 100)}`);
});
console.log(`  带 taste-skill-ignore 注释的 box-shadow 声明：${withIg}`);
console.log(`  不带注释的：${without.length}`);
without.forEach((x) => console.log('    ' + x));

console.log('\n== 关键判据：taste-skill-ignore 对闸门有效吗 ==');
const lint = readFileSync(join(ROOT, 'tools', 'taste-skill', 'skills', 'taste-skill', 'scripts', 'lint.mjs'), 'utf8');
const insp = readFileSync(join(ROOT, 'tools', 'taste-skill', 'skills', 'taste-skill', 'scripts', 'inspect.mjs'), 'utf8');
const probe = readFileSync(join(ROOT, 'tools', 'taste-skill', 'skills', 'taste-skill', 'scripts', 'lib', 'probe.mjs'), 'utf8');
const rules = readFileSync(join(ROOT, 'tools', 'taste-skill', 'skills', 'taste-skill', 'scripts', 'lib', 'rules.mjs'), 'utf8');
const count = (s, re) => (s.match(re) || []).length;
console.log(`  lint.mjs 里 taste-skill-ignore 命中 ${count(lint, /taste-skill-ignore/g)} 次（源码静态检查）`);
console.log(`  inspect.mjs 里命中 ${count(insp, /taste-skill-ignore/g)} 次`);
console.log(`  probe.mjs 里命中 ${count(probe, /taste-skill-ignore/g)} 次`);
console.log(`  rules.mjs 里命中 ${count(rules, /taste-skill-ignore/g)} 次`);
console.log('  ⇒ 闸门（inspect.mjs + probe.mjs + rules.mjs）**完全不读**味觉忽略注释；它只认 --allow 与 direction.json。');

console.log('\n== S13 的 4 项 FAIL 逐项：能不能修 / 修了会不会破坏别的 ==');
const s13 = JSON.parse(readFileSync(join(d, '.inspect', 'report.json'), 'utf8'));
for (const f of (s13.findings || []).filter((x) => x.level === 'FAIL')) {
  console.log(`\n  [${f.id}] ${f.message.slice(0, 150)}`);
}
console.log('\n  -- 判据表 --');
const verdicts = [
  ['mono', 'DM Mono 排 "0.4mm" 这类压深数值槽', '规格字段 5 明写「压印深度 0.4mm 等效」是可测量 Z 的四条之一；换正文字体则量值可读性下降，但规格没锁定"必须用等宽"', '① 换成正文衬线 + tabular-nums：不破坏任何"必须存在"；② 进 §9.15 允许表（等宽数字槽 = 中文站结构性下限，与该表已有的 font-count 同类论证）'],
  ['shadow', '17 处静止态 box-shadow，其中 16 处是 inset+外接触阴影混合', '规格字段 6「必须存在 X」第四条明写「阴影只出现在凹槽一侧并带接触阴影」——删掉影子等于删掉规格要求的"接触阴影"', '① 迁移 drop-shadow：**对 16 处混合阴影物理不可行**（drop-shadow 无 inset 形式），只能覆盖 4 处纯外投影；② 按 §7.4 补逐案批准记录（契约自己给出的第二条出路）'],
  ['button-fx', '4 个按钮带 box-shadow（含一个 inset 的归档按钮）', '同一批影子：按钮的"压出"就是靠它。且规格字段 7 要求"按下时光源方位角由 135° 反转为 315°"，反转的视觉载体就是这对影子', '删掉按钮影子 → 光源反转这条"必须可测量 Z"当场失去可见载体，即修一条 FAIL、破一条规格要求'],
  ['empty-screens', '6 屏中 3 屏（3/5/6）填充率 <20%', '规格字段 9「留白节奏」明写条款间空 2 个基线单位、函件与附件间空 6 个基线单位；这是**故意的低频版式**', '删空屏 = 违反留白节奏；这条本来就该走豁免（12 号审计已裁 earned）'],
];
for (const [id, what, why, how] of verdicts) {
  console.log(`  ${id.padEnd(14)} 现象：${what}`);
  console.log(`  ${''.padEnd(14)} 为什么"可修"是错的：${why}`);
  console.log(`  ${''.padEnd(14)} 真正可行：${how}`);
  console.log();
}
