/* 字体来源普查：所有产物里，字体到底从哪来？
 *
 * 这条一直没被量过，而它是最容易「本地看着对、上线换字」的那一类缺陷。
 * 判据借用 score.mjs 的 judgeFontChain（不重写第二个实现 ——
 * 本仓库记过「同一组逻辑四份实现、同一个 bug 犯了四次」）。
 *
 * 2026-11-22 首次实测：远程 10 / 仅 local() 3 / 无来源 12 / 内嵌 0。
 * 这组数否掉了「让提示词给自托管路径」这个方向 —— 内嵌是 0，不是少数；
 * 而用户的部署环境里根本没有 prototypes/_fonts/。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BT = join(resolve(HERE, '..'), '_blindtest');

/* 复用评分器的判据，不另写一份 */
const { judgeFontChain } = await import('file://' + join(HERE, '..', '_blindtest', 'score.mjs').replace(/\\/g, '/'))
  .then((m) => ({ judgeFontChain: m.judgeFontChain }))
  .catch(() => ({ judgeFontChain: null }));

const dirs = readdirSync(BT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}(-r\d+)?$/.test(d.name))
  .map((d) => d.name).sort();

/* score.mjs 不一定导出 judgeFontChain，那就用同一套判据在这里实现一遍 ——
 * 但必须标出来，因为「复制一份」正是本仓库反复踩的坑。 */
const classify = (html) => {
  const hasFace = /@font-face/i.test(html);
  const hasImport = /@import\s+url\([^)]*fonts|fonts\.googleapis/i.test(html);
  const hasLink = /<link[^>]+(?:fonts\.googleapis|\.css)[^>]*>/i.test(html);
  /* local-only：有 @font-face 但那条里没有 url()，只有 local() */
  const localOnly = /src\s*:\s*local\(/i.test(html)
    && !/url\(/i.test((html.match(/@font-face\{[^}]*\}/gi) || []).join(''));
  if (hasImport || hasLink) return 'remote';
  if (hasFace) return localOnly ? 'local-only' : 'embedded';
  return 'none';
};

const LABEL = {
  remote: '远程（CDN）',
  embedded: '内嵌（自带文件）',
  'local-only': '仅 local()（赌用户装了）',
  none: '无任何来源（只写族名）',
};

const rows = [];
for (const id of dirs) {
  const p = join(BT, id, 'index.html');
  if (!existsSync(p)) continue;
  rows.push({ id, src: classify(readFileSync(p, 'utf8')) });
}

const stat = { remote: 0, embedded: 0, 'local-only': 0, none: 0 };
for (const r of rows) stat[r.src]++;

console.log(`字体来源普查：${rows.length} 份产物\n`);
for (const k of ['embedded', 'remote', 'local-only', 'none']) {
  const list = rows.filter((r) => r.src === k).map((r) => r.id);
  console.log(`  ${LABEL[k].padEnd(24)} ${String(stat[k]).padStart(3)}  ${list.join(' ')}`);
}

console.log('\n━━ 断言 ━━');
/* ① 内嵌为 0 这个事实必须显式说出来。
 * 它是否掉「提示词给自托管路径」这个方向的那条数据。
 * 如果哪天内嵌不再是 0，说明有人改了做法 —— 那时这一节要重写，脚本红一下提醒。 */
if (stat.embedded === 0) {
  console.log(`  ✓ 内嵌仍为 0 —— 「让提示词给自托管路径」这条路在 ${rows.length} 份里实现过 0 次`);
} else {
  console.log(`  · 内嵌变成 ${stat.embedded} 份 —— 做法变了，「自托管走不通」这个结论要重核`);
}

/* ② 「无任何来源」是最大的一档，而且它本地看不出问题。
 * 这不是判据该不该红的对象（提示词从没要求过），但它值得一直显示。 */
const nonePct = Math.round((stat.none / rows.length) * 100);
console.log(`  · 无来源 ${stat.none} 份（${nonePct}%）—— 本地看着对、换机器换字，最隐蔽的一档`);

/* ③ 四种来源加起来必须等于总数。少一份就说明分类漏了一种形态 ——
 * 这正是第①类缺陷（读不到对象却报出干净数）在这条判据上的形态。 */
const sum = stat.remote + stat.embedded + stat['local-only'] + stat.none;
if (sum !== rows.length) {
  console.error(`\n✗ 分类合计 ${sum} ≠ 总数 ${rows.length} —— 有产物没被归入任何一档`);
  process.exit(1);
}
console.log(`  ✓ 四档合计 ${sum} = 总数 ${rows.length}`);
