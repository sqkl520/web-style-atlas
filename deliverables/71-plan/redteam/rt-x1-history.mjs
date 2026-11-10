/* 新问题②：data.js 是 tracked 的生成物。它的 palette 在 git 历史里变过几次？
 * 每次变化有没有对应的原型（style.css / _specs）改动？
 *
 * 「有生成物变化但源没动」= 说明改的是生成器，而生成器的改动风险面覆盖全部 30 案。
 * 「源动了但 palette 没变」= 正常。
 *
 *   node deliverables/71-plan/redteam/rt-x1-history.mjs
 */
import { execFileSync } from 'node:child_process';
import { h1, h2, ROOT } from './rt-lib.mjs';

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const commits = git(['log', '--format=%h|%ad|%s', '--date=short', '--', 'prototypes/_selection/data.js'])
  .trim().split('\n').map((l) => {
    const [h, d, ...s] = l.split('|');
    return { h, d, s: s.join('|') };
  }).reverse(); // 由旧到新

function palettesAt(h) {
  const src = git(['show', `${h}:prototypes/_selection/data.js`]);
  const win = {};
  try { new Function('window', src)(win); } catch { return null; }
  const m = new Map();
  for (const s of (win.SCHEMES || [])) {
    m.set(s.id, (s.palette || []).map((x) => String(x).toUpperCase()));
  }
  return m;
}

h1('data.js palette 的 git 变更史');
console.log(`data.js 出现在 ${commits.length} 个 commit 里（仓库共 ${git(['rev-list', '--count', 'HEAD']).trim()} 个 commit）\n`);

let prev = null, prevLabel = null;
const events = [];
for (const c of commits) {
  const cur = palettesAt(c.h);
  if (!cur) { console.log(`${c.h} ${c.d}  求值失败，跳过`); continue; }
  if (!prev) {
    console.log(`${c.h} ${c.d}  [基线] ${cur.size} 案`);
    prev = cur; prevLabel = c; continue;
  }
  const changed = [];
  for (const [id, pal] of cur) {
    const old = prev.get(id) || [];
    if (JSON.stringify(old) !== JSON.stringify(pal)) changed.push({ id, old, now: pal });
  }
  if (changed.length) {
    // 这一次 commit 是否也动了原型源码？
    const touched = git(['show', '--name-only', '--format=', c.h]).trim().split('\n').filter(Boolean);
    const protoTouched = touched.filter((f) => /^prototypes\/S\d\d-.*\/(style\.css|index\.html)$/.test(f));
    const specTouched = touched.filter((f) => /^prototypes\/_specs\/S\d\d\.md$/.test(f));
    const genTouched = touched.filter((f) => /collect-schemes|clean-dna|build-prompts|extract-dna/.test(f));
    events.push({ ...c, changed, protoTouched, specTouched, genTouched });
    console.log(`${c.h} ${c.d}  palette 变 ${changed.length} 案`);
    for (const x of changed) console.log(`    ${x.id}  ${x.old.join(',') || '—'}  →  ${x.now.join(',') || '—'}`);
    console.log(`    同时改动：生成器 ${genTouched.length} 个文件 / 原型 css+html ${protoTouched.length} 个 / 规格 ${specTouched.length} 个`);
    if (genTouched.length) console.log(`      生成器: ${genTouched.join(', ')}`);
    if (protoTouched.length) console.log(`      原型  : ${protoTouched.slice(0, 8).join(', ')}${protoTouched.length > 8 ? ` …+${protoTouched.length - 8}` : ''}`);
    console.log('');
  } else if (JSON.stringify([...cur.keys()]) !== JSON.stringify([...prev.keys()])) {
    console.log(`${c.h} ${c.d}  案集合变化（${prev.size} → ${cur.size}）\n`);
  }
  prev = cur; prevLabel = c;
}

h2('汇总');
console.log(`palette 发生过变化的 commit：${events.length} / ${commits.length}`);
const paletteOnly = events.filter((e) => e.genTouched.length && e.protoTouched.length === 0);
console.log(`其中「改了生成器但一个原型 css/html 都没动」：${paletteOnly.length} 次`);
for (const e of paletteOnly) {
  console.log(`  ${e.h} ${e.d}  变 ${e.changed.length} 案  生成器=${e.genTouched.join(',')}`);
}
const totalTouched = events.reduce((a, e) => a + e.changed.length, 0);
console.log(`palette 变更的累计案次：${totalTouched}`);
const perCase = new Map();
for (const e of events) for (const x of e.changed) perCase.set(x.id, (perCase.get(x.id) || 0) + 1);
console.log(`\n最常被动到 palette 的案（前 10）：`);
[...perCase.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  .forEach(([id, n]) => console.log(`  ${id}  ${n} 次`));
console.log(`\npalette 从未变过的案：${30 - perCase.size} / 30`);
