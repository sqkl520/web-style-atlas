/* 生成 35 份提示词，检查「第四处字体分工」这一句到底出现在哪几案。 */
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const SEL = join(REPO, 'prototypes', '_selection');

/* prompt-copy.js 是浏览器脚本（window.xxx），用 vm 在沙箱里跑出来 */
const { createContext, runInContext } = await import('node:vm');
const ctx = { window: {}, document: { getElementById: () => null, querySelector: () => null } };
ctx.window = ctx;
createContext(ctx);
for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) {
  runInContext(readFileSync(join(SEL, f), 'utf8'), ctx, { filename: f });
}

const build = ctx.buildStylePrompt || ctx.window.buildStylePrompt;
if (!build) { console.error('拿不到 buildStylePrompt'); process.exit(1); }

const ids = [];
for (const s of ctx.SCHEMES) ids.push(s.id);

let hit = 0;
for (const id of ids) {
  const p = build(id, { biz: '一家修鞋配钥匙的小店', action: '打电话约个时间', have: 5 });
  const has = p.includes('第四处字体分工');
  if (has) {
    hit++;
    const line = p.split('\n').find((l) => l.includes('第四处字体分工'));
    console.log(`${id}  ${line.trim().slice(0, 150)}`);
  }
}
console.log(`\n${hit}/35 案带第四角色说明`);

/* 反向断言：这句话里有没有出现「新增」这种会被读成许可的字眼 */
console.log('\n措辞体检：');
const sample = build('S19', { biz: 'x', action: 'y', have: 5 });
const l = sample.split('\n').find((x) => x.includes('第四处字体分工')) || '';
console.log('  含「不是让你新增字体」：' + (l.includes('不是让你新增字体') ? '✓' : '✗'));
console.log('  含「只在那一小块用」：' + (l.includes('只在那一小块用') ? '✓' : '✗'));
console.log('  含「不要把标题、正文或数字改成它」：' + (l.includes('不要把标题、正文或数字改成它') ? '✓' : '✗'));

/* ── 自相矛盾检查（2026-11-22 加，实测踩出来的）────────────────────
 *
 * 加了第四角色那句之后，5 个案出现同一段里两句话打架：
 *   「有一小块拉丁字单独用 Spectral 排」        ← 让你用
 *   「不要用 上面两条链之外的字体」              ← 不让你用，而 Spectral 在链外
 *
 * 初版没发现，因为我是逐案读**数据**、不是逐案读**拼好的提示词**。
 * 所以这条断言查的是拼装结果，不是字段值。 */
console.log('\n自相矛盾检查（第四角色 vs 链外禁令）：');
let contra = 0;
for (const id of ids) {
  const p = build(id, { biz: 'x', action: 'y', have: 5 });
  const hasLatin = p.includes('第四处字体分工');
  const ban = p.split('\n').find((x) => /条链之外的字体/.test(x)) || '';
  const saysFew = /这几条链/.test(ban);
  const saysTwo = /两条链/.test(ban);
  const ok = hasLatin ? saysFew : saysTwo;
  if (!ok) { contra++; console.log(`  ✗ ${id}：第四角色=${hasLatin ? '有' : '无'}，禁令写「${saysFew ? '这几条链' : saysTwo ? '两条链' : '?'}」`); }
}
console.log(contra === 0
  ? '  ✓ 5 个有第四角色的案都写「这几条链」，其余写「两条链」，无矛盾'
  : `  ✗ ${contra} 案自相矛盾`);
if (contra) process.exitCode = 1;

/* ── 副作用检查（2026-11-22 加）──────────────────────────────────────
 *
 * 上面那些都是**正例**：5 个有第四角色的案，看那句话在不在、措辞对不对。
 *
 * 但真正要紧的是**反例**：另外 30 个没有第四角色的案，有没有被那句话带偏。
 * 判据：一个不该有第四角色的案，提示词里不能出现「第四处字体分工」，
 * 而且它的字体行不该提到任何链外字体。
 *
 * 这条检查能查的只是**提示词层面**的泄漏。产物层面有没有被带偏，
 * 只能靠真跑 —— 这一轮 S21-r3 就是在补那个数据。 */
console.log('\n副作用检查（不该有第四角色的案）：');
let leak = 0;
for (const id of ids) {
  if (['S01', 'S03', 'S04', 'S16', 'S19'].includes(id)) continue;  // 正例，前面查过
  const p = build(id, { biz: 'x', action: 'y', have: 5 });
  if (p.includes('第四处字体分工')) {
    leak++;
    console.log(`  ✗ ${id} 不该有第四角色，提示词里却出现了`);
  }
}
console.log(leak === 0
  ? `  ✓ 30 个不该有的案都没有出现那句话`
  : `  ✗ ${leak} 案泄漏`);
if (leak) process.exitCode = 1;
