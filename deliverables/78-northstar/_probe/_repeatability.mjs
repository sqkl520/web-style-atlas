/* 同输入重复：同一份提示词跑两次，产物的一致与不一致分别在哪。
 *
 * 为什么需要这个脚本：
 * 判断一个缺陷该「改提示词」还是该「重跑取优」，取决于它是**稳定的**还是**波动的**。
 * 这一轮反复踩到的分类错误，全都是把波动当成了稳定：
 *   · 图片数少几张 → 被当成提示词缺陷
 *   · 线宽越界     → 被当成产物质量问题
 *
 * 判据：找 md5 相同的提示词组，比对两次产物。
 *   · 一致的项 → 稳定，改提示词能左右
 *   · 不一致的项 → 波动，只能靠重跑/取优
 *
 * 2026-11-22 首测：只有一组（S21-r2 / S21-r3，md5 137348de）。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const BT = join(resolve(HERE, '..'), '_blindtest');

const dirs = readdirSync(BT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}(-r\d+)?$/.test(d.name))
  .map((d) => d.name).sort();

/* 按 (案号, 提示词 md5) 分组 —— 同案同提示词的才可比 */
const groups = new Map();
for (const id of dirs) {
  const pp = join(BT, id, '_prompt.txt');
  const hp = join(BT, id, 'index.html');
  if (!existsSync(pp) || !existsSync(hp)) continue;
  const base = id.match(/^S\d{2}/)[0];
  const md5 = createHash('md5').update(readFileSync(pp)).digest('hex').slice(0, 8);
  const key = base + '@' + md5;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(id);
}

/* 从产物里抽可观测量。
 *
 * ⚠️ 字体抽取必须**展开 CSS 变量**。这一处踩了两次，都记下来：
 *
 * ① 第一版自己写「取 font-family 第一个族名」，遇到 `var(--title)` 就抽到变量名，
 *    S21-r3 因此 fontN=0，与 r2 的 3 个不同，报「不一致」—— 假阳性。
 *
 * ② 第二版改用 score.mjs 的 judgeFontChain，结果 S21-r2 的 `used` 是空数组、
 *    `undecided: true` —— 因为**它不展开 var**。而同一份产物，评分器的判据②
 *    （`out.fonts`）自己写了 expandVars，报「字体 5/5」。
 *    也就是说：**同一个产品里有两份读字体的逻辑，一份展开变量一份不展开**，
 *    对同一份产物给出相反结论。它们回答的问题不同（判据⑤问「在不在链上」，
 *    判据②问「要的族名出现了没有」），但**数「用了哪些字体」必须用会展开的那份**。
 *
 * 下面照抄 expandVars 的口径。这是本仓库第一次为「读字体」写出第三份实现，
 * 明知有风险（记过四次「四份实现同一个 bug」），但没有更好的办法：
 * score.mjs 是 CLI 脚本、不导出判据，而这里要的是它的中间量。 */
function features(html) {
  const imgs = (html.match(/<img[\s>]/g) || []).length;
  const arts = (html.match(/<article[\s>]/g) || []).length;
  const lis = (html.match(/<li[\s>]/g) || []).length;

  const cssVars = {};
  for (const m of html.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) cssVars[m[1]] = m[2];
  const expandVars = (s, depth = 0) => {
    if (depth > 5) return s;
    return s.replace(/var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)/g,
      (_, name) => (cssVars[name] !== undefined ? expandVars(cssVars[name], depth + 1) : ''));
  };
  const fams = new Set();
  for (const m of html.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/font-family\s*:\s*([^;}]+)/g)) {
    const head = expandVars(m[1]).split(',')[0].trim().replace(/^["']|["']$/g, '').trim();
    if (!head) continue;
    if (/^var\(/i.test(head)) continue;
    if (/^(serif|sans-serif|monospace|system-ui|inherit)$/i.test(head)) continue;
    fams.add(head);
  }
  return {
    imgs,
    arts,
    lis,
    fontSet: [...fams].sort().join('|'),
    fontN: fams.size,
    bytes: Buffer.byteLength(html, 'utf8'),
  };
}

const STABLE = [];
const VOLATILE = [];
const comparable = [...groups.entries()].filter(([, ids]) => ids.length > 1);

console.log(`同案同提示词组：${comparable.length} 组\n`);

if (!comparable.length) {
  console.log('（没有可比的组 —— 需要同一份提示词跑两次以上才有数据）');
  console.log('这本身是个事实：如果所有重跑之间提示词都变过，就不能分离');
  console.log('「提示词改动的影响」与「模型自身的波动」。');
  process.exit(0);
}

for (const [key, ids] of comparable) {
  const [base, md5] = key.split('@');
  console.log(`══ ${base}  提示词 md5=${md5}  产出 ${ids.length} 次：${ids.join(' / ')}`);
  const rows = ids.map((id) => ({ id, ...features(readFileSync(join(BT, id, 'index.html'), 'utf8')) }));
  for (const c of ['imgs', 'arts', 'lis', 'fontN', 'bytes']) {
    const vals = rows.map((r) => r[c]);
    const same = vals.every((v) => v === vals[0]);
    console.log(`   ${c.padEnd(8)} ${vals.join(' / ').padEnd(24)} ${same ? '一致' : '不一致'}`);
    (same ? STABLE : VOLATILE).push(`${base}.${c}`);
  }
  const fontSets = rows.map((r) => r.fontSet);
  const fontSame = fontSets.every((v) => v === fontSets[0]);
  console.log(`   字体集合 ${fontSame ? '一致' : '不一致'}：${fontSets[0] || '（空）'}`);
  (fontSame ? STABLE : VOLATILE).push(`${base}.字体集合`);
  console.log('');
}

console.log('━━ 结论 ━━');
console.log(`  稳定（改提示词可能左右）：${[...new Set(STABLE)].join(' ') || '（无）'}`);
console.log(`  波动（只能靠重跑取优）：${[...new Set(VOLATILE)].join(' ') || '（无）'}`);
console.log('');
console.log('  这个区分决定行动方向：');
console.log('    · 稳定的项不对 → 去改提示词，重跑不会变');
console.log('    · 波动的项不对 → 别改提示词，多跑几轮取最好的');

/* ── 断言 ────────────────────────────────────────────────────────
 * 字体集合必须在同提示词下稳定。理由：如果「用哪些字体」都随机，
 * 那所有字体类判据都没有意义 —— 一次通过不能说明提示词写对了。
 *
 * ⚠️ 但样本量必须显式说出来。第一版跑完打印「✓ 稳定」，
 * 而那时只有一组、且其中一份因为不展开 var 读不到族名，
 * 等于拿一个样本证明了一件事。所以下面两个提示都必须留着。 */
const fontUnstable = [...groups.entries()].some(([key, ids]) => {
  if (ids.length < 2) return false;
  const sets = ids.map((id) => features(readFileSync(join(BT, id, 'index.html'), 'utf8')).fontSet);
  return new Set(sets).size > 1;
});
if (fontUnstable) {
  console.error('\n✗ 字体集合在同提示词下不一致 —— 字体类判据的结论不可重复，先修这个');
  process.exit(1);
}
const comparableN = comparable.reduce((s, [, ids]) => s + ids.length, 0);
console.log(`\n✓ 字体集合在同提示词下稳定（${comparable.length} 组 / ${comparableN} 份产物）`);
if (comparable.length < 2) {
  console.log('  ⚠️ 只有 1 组，这个「稳定」没有第二组佐证 —— 多跑一组同提示词的才算数');
}
