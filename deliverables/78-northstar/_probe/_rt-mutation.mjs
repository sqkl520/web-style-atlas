#!/usr/bin/env node
/* 攻击 J：系统变异测试 —— 逐条把判据改成恒真/恒假，看 --selftest 会不会红。
 *
 * 一条判据如果被改成恒真而 86 条自测仍然全绿，说明**这条判据从未被自测执行过**。
 * 这是本周仓库记录的第 1 类缺陷：闸门看起来在跑，实际什么都没测。
 *
 * 做法：读 score.mjs，做一处文本替换（只在 score() 里的生产实现上动手），
 * 写到 _probe/_mutX-score.mjs，跑 --selftest，记 exit code。
 * 不改 score.mjs。
 */
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(ROOT, 'deliverables/78-northstar/_blindtest/score.mjs');
const PROBE = join(ROOT, 'deliverables/78-northstar/_probe');
const src = readFileSync(SRC, 'utf8');

/* 每项：名字、原串、替换串。原串必须只出现一次，否则记 SKIP。 */
const MUTANTS = [
  ['① 配色 got 恒等于 want',
    'got: promptHex.length - missingHex.length,',
    'got: promptHex.length,'],
  ['① 底色 bgCorrect 恒真',
    'bgCorrect: wantBg ? bgUsed : null,',
    'bgCorrect: wantBg ? true : null,'],
  ['② 字体 got 恒等于 want',
    'got: famHit.length,',
    'got: famNames.length,'],
  ['③ 字号 titleOk 恒真',
    'out2.titleOk = out2.wantTitleAbs != null ? near(out2.maxTitle, out2.wantTitleAbs) : null;',
    'out2.titleOk = true;'],
  ['③ 字号 bodyOk 恒真',
    'out2.bodyOk = out2.wantBody != null ? near(out2.body, out2.wantBody) : null;',
    'out2.bodyOk = true;'],
  ['③ 字号 maxTitle 恒等于目标（伪造）',
    'out2.maxTitle = Math.max(...decls);',
    'out2.maxTitle = 96;'],
  ['③ 圆角 violations 恒 0',
    'geo.radius = { rule: \'全站一律 0\', declared: radii.length, violations: nonZero.length,',
    'geo.radius = { rule: \'全站一律 0\', declared: radii.length, violations: 0,'],
  ['③ 线宽 outside 恒空',
    'geo.lineWidth = { allowed: [...allowed].map((n) => n + \'px\'), used: used.length, outside: [],',
    'geo.lineWidth = { allowed: [...allowed].map((n) => n + \'px\'), used: used.length, outside: [],'],
  ['⑤ 无阴影 hits 恒 0',
    'if (n) banned.push({ rule: \'无阴影\', hits: n });',
    'if (false) banned.push({ rule: \'无阴影\', hits: n });'],
  ['⑤ 渐变受限 hits 恒 0',
    'if (grad.wording && grad.hits) banned.push({ rule: \'渐变受限\', hits: grad.hits, wording: grad.wording });',
    'if (false) banned.push({ rule: \'渐变受限\', hits: grad.hits, wording: grad.wording });'],
  ['⑤ 字体链外恒不报',
    'if (fc && fc.outside.length) banned.push({ rule: \'字体链外\', hits: fc.outside.length, families: fc.outside });',
    'if (false) banned.push({ rule: \'字体链外\', hits: fc.outside.length, families: fc.outside });'],
  ['⑤ 明度跨度恒不报',
    'if (gs && gs.over.length) banned.push({ rule: \'渐变跨度过大\', hits: gs.over.length, spans: gs.over.map((s) => s.span) });',
    'if (false) banned.push({ rule: \'渐变跨度过大\', hits: gs.over.length, spans: gs.over.map((s) => s.span) });'],
  ['⑤ 系统默认栈恒不报',
    'if (dfs && dfs.hits.length) banned.push({ rule: \'系统默认字体\', hits: dfs.hits.length, families: dfs.hits });',
    'if (false) banned.push({ rule: \'系统默认字体\', hits: dfs.hits.length, families: dfs.hits });'],
  ['④ 条目 hit 恒真',
    'hit: expect != null && got != null ? Math.abs(got - expect) <= 1 : null,',
    'hit: true,'],
  ['④ 图片 hit 恒真',
    'hit: imgs <= slots && imgs === uniq && imgs >= need,',
    'hit: true,'],
];

function applyOne(from, to) {
  const n = src.split(from).length - 1;
  if (n !== 1) return { ok: false, n };
  return { ok: true, text: src.replace(from, to) };
}

function runSelftest(path) {
  try {
    execFileSync(process.execPath, [path, '--selftest'], { stdio: 'pipe', encoding: 'utf8' });
    return { pass: true, tail: '' };
  } catch (e) {
    const out = (e.stdout || '') + (e.stderr || '');
    const fails = out.split('\n').filter(l => /✗/.test(l)).map(l => l.trim());
    return { pass: false, fails };
  }
}

console.log('══ J1 逐条变异，看 --selftest 抓不抓得住 ══\n');
const escaped = [];
for (let i = 0; i < MUTANTS.length; i++) {
  const [name, from, to] = MUTANTS[i];
  const r = applyOne(from, to);
  if (!r.ok) { console.log(`  ?? ${name}\n       原串出现 ${r.n} 次（应为 1），跳过`); continue; }
  const f = join(PROBE, `_mut${i}-score.mjs`);
  writeFileSync(f, r.text);
  const res = runSelftest(f);
  rmSync(f, { force: true });
  if (res.pass) {
    escaped.push(name);
    console.log(`  ⚠️ 逃过自测  ${name}`);
  } else {
    console.log(`  ✓ 被抓住    ${name}   （${res.fails.length} 条断言变红，例：${res.fails[0] || ''}）`);
  }
}

console.log(`\n══ 结论 ══`);
console.log(`  ${MUTANTS.length - escaped.length}/${MUTANTS.length} 条判据被自测守住；`);
console.log(`  ${escaped.length} 条改成恒真后 --selftest 仍然 86/86 全绿：`);
for (const e of escaped) console.log(`    · ${e}`);