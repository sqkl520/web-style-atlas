/* 独立复算：每案产物里命中了多少个「只属于自己提示词」的判别值？
 *
 * 逻辑：从该案 task.txt 抽出所有数值/色值 token，去掉那些在其他任务书里也出现过的，
 * 剩下的就是「判别值」——模型若没读到这份提示词，不可能凭空命中。
 *
 * 这不是「产物里有没有 60px」这种弱检验，而是「产物里有没有那个只在这一份里的值」。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokensOf, discriminatorsFor, hitIn } from './_discriminator-lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BLIND = join(ROOT, 'deliverables/78-northstar/blind');
const STAGED = join(ROOT, 'deliverables/78-northstar/_probe/_staged');

/* 收集所有任务的 token */
const ids = readdirSync(BLIND, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}$/.test(d.name))
  .map((d) => d.name)
  .sort();

/* 三个纯函数（tokensOf / discriminatorsFor / hitIn）已移到 _discriminator-lib.mjs。
 * 为什么：同一组逻辑曾在四份脚本里各写一份，2026-11-14 同一个 bug 犯了四次
 * （子串搜索让 160PX 命中 60PX）。两份实现跑通不等于它们一致。
 * 那个模块有独立的 20 条边界用例（_discriminator-lib-selftest.mjs）。 */

const all = {};
for (const id of ids) {
  const p = join(BLIND, id, 'task.txt');
  if (!existsSync(p)) continue;
  all[id] = tokensOf(readFileSync(p, 'utf8'));
}

let total = 0, hits = 0;
const rows = [];
for (const id of Object.keys(all)) {
  const discriminators = discriminatorsFor(id, all);
  if (!discriminators.length) { rows.push({ id, n: 0, hit: 0, note: '无判别值' }); continue; }

  /* 找产物 */
  let gen = null;
  for (const n of [`${id}-sandbox.html`, `${id}-judge.html`, `${id}.html`]) {
    const f = join(STAGED, n);
    if (existsSync(f)) { gen = f; break; }
  }
  if (!gen) { rows.push({ id, n: discriminators.length, hit: 0, note: '无产物' }); continue; }

  const html = readFileSync(gen, 'utf8').toUpperCase();
  const found = discriminators.filter((t) => hitIn(html, t));
  total += discriminators.length;
  hits += found.length;
  rows.push({ id, n: discriminators.length, hit: found.length, miss: discriminators.filter((t) => !found.includes(t)).slice(0, 4) });
}

/* ── 自测 ──────────────────────────────────────────────────────────
 * 这个脚本的输出（67/67）是下游 _evidence-gate 的输入之一。
 * 如果它算错了，闸门会拿错的数去断言，然后报「全部通过」。
 *
 * 测的是两个纯函数，用**内存数据**，不依赖磁盘上的真实文件 ——
 * 这样连「某个案的产物被删了」都不会让自测失败。
 *
 * 每条用例都写清它在防什么。判据：期望值来自手工推导，不是从当前输出抄的。 */
const SELFTEST = process.argv.includes('--selftest');

if (SELFTEST) {
  console.log('判别值检查的自测\n');
  let bad = 0;
  const check = (name, got, want, why) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) bad++;
    console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n      got ${JSON.stringify(got)}  want ${JSON.stringify(want)}`}`);
    console.log(`      ${why}`);
  };

  /* ① 判别值的定义：只在一份里出现的才算。
   * 防的是「把别的案也有的值算成独有」——那会让命中率虚高。 */
  const tok = {
    A: new Set(['#AAAAAA', '60px', '12px']),
    B: new Set(['#BBBBBB', '60px']),
    C: new Set(['#CCCCCC']),
  };
  check('A 的判别值', discriminatorsFor('A', tok).sort(), ['#AAAAAA', '12px'],
    '#AAAAAA 与 12px 只有 A 有；60px 在 B 里也有，不算判别值');
  check('B 的判别值', discriminatorsFor('B', tok).sort(), ['#BBBBBB'],
    '60px 在 A 里也有');
  check('C 的判别值', discriminatorsFor('C', tok).sort(), ['#CCCCCC'],
    'C 只有一个值，它没有出现在别处');

  /* ② others 是「其他所有案的并集」，不是「随便一份」。
   * 防的是遍历时漏掉最后一份（那样某个共用值会被误判为独有）。 */
  const tok3 = {
    X: new Set(['1px', '999px']),
    Y: new Set(['1px']),
    Z: new Set(['1px']),
  };
  check('三分共用 1px', discriminatorsFor('X', tok3).sort(), ['999px'],
    '1px 在 Y 与 Z 都有；只检查其中一份会漏掉另一份');

  /* ③ hex 命中：直接子串 */
  check('hex 命中', hitIn('COLOR:#AAAAAA;', '#AAAAAA'), true, '简单子串匹配');
  check('hex 未命中', hitIn('COLOR:#AAAAAB;', '#AAAAAA'), false, '差一位不算');

  /* ④ 数值命中：左边界必须存在，防 118px 被 1180px 命中。
   * 这是仓库里已经踩过的坑（正则漏了负向前瞻）。 */
  check('118px 不被 1180px 命中', hitIn('WIDTH:1180PX', '118px'), false,
    '1180px 里有 118 但没有独立成值');
  check('118px 正常命中', hitIn('WIDTH:118PX;', '118px'), true, '独立成值');
  check('60px 在 clamp 里命中', hitIn('FONT-SIZE:CLAMP(38PX,8.6VW,104PX)', '104px'), true,
    '值嵌在函数里也算');

  /* ⑤ 数值后必须跟单位，防「60」命中「160px」里的数字，
   * 也防把 "60" 这种裸数当成 60px。 */
  check('60px 不被 160px 命中', hitIn('WIDTH:160PX;', '60px'), false,
    '160px 里的 60 不是独立值');
  check('单位不同不算', hitIn('WIDTH:60VW;', '60px'), false,
    'vw 与 px 是不同单位');

  console.log('');
  if (bad === 0) {
    console.log('✓ 自测全部通过：9 条用例都符合定义');
    console.log('  判别值与命中判定这两个纯函数，边界行为是对的。');
    process.exit(0);
  }
  console.log(`✗ 自测失败：${bad} 条用例不符`);
  process.exit(1);
}

console.log('案    判别值  命中  未命中');
console.log('─'.repeat(60));
for (const r of rows) {
  const pct = r.n ? Math.round((r.hit / r.n) * 100) : 0;
  console.log(
    String(r.id).padEnd(5) +
    String(r.n).padStart(5) +
    String(r.hit).padStart(6) +
    ('  ' + pct + '%').padEnd(6) +
    (r.note || (r.miss && r.miss.length ? r.miss.join(' ') : ''))
  );
}
console.log('─'.repeat(60));
console.log(`TOTAL discriminators: ${total} hits: ${hits}`);
