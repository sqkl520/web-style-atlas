/* 判定负对照 B：S98（删掉全部尺寸数值）的产物，与 S31（有数值）的产物对比。
 *
 * 核心问题：把数值删掉之后，模型还能不能做出「12 等分 + 刻度带」？
 *
 * 判据分三层，从硬到软：
 *   L1 配色 —— 应该仍然 5/5（配色数值保留了，这是内部对照）
 *   L2 刻度带在不在 —— 有没有主次两级刻度、有没有贯穿基线
 *   L3 刻度参数对不对 —— 主次刻度的间隔/长度是否成比例、字号比是否落在 6.5 附近
 *
 * 最关键的判定：如果 L2 成立但 L3 的数值和 S31 差得远，说明**文字传了结构、数值传了精确度**。
 * 如果 L2 都不成立，说明**没有数值就做不出这个结构** —— 那承重的是数值。
 */
import { measure } from '../../74-q7/measure.mjs';
import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const STAGING = join(ROOT, 'deliverables/78-northstar/_probe/_staged');

const get = (p) => {
  for (const n of ['out.html', 'index.html']) {
    const f = join(p, n);
    if (existsSync(f)) return f;
  }
  return null;
};

const s98 = get('C:/tmp/bb/S98');
const s31 = get('C:/tmp/bb/S31');
if (!s98) { console.log('S98 还没有产物'); process.exit(2); }

mkdirSync(STAGING, { recursive: true });
const stage = (src, name) => {
  const d = join(STAGING, name);
  copyFileSync(src, d);
  return d;
};

const files = { S98: stage(s98, 'S98-nonumber.html') };
if (s31) files.S31 = stage(s31, 'S31-numbered.html');

const rows = {};
for (const [id, f] of Object.entries(files)) {
  const m = await measure(f);
  rows[id] = m;
  console.log(`${id}: ${readFileSync(f).length}B | headBody=${m.headBodyRatio} | hexes=${m.hexes.length} | tracks=${m.gridTracks} | words=${m.words}`);
}

/* L1 配色：S98 应该仍然用上那 5 个色 */
const WANT = ['#F2F0EC', '#5F5B55', '#DEDAD3', '#55514B', '#8A857C'];
for (const id of Object.keys(rows)) {
  const got = new Set((rows[id].hexes || []).map((h) => h.toUpperCase()));
  const miss = WANT.filter((h) => !got.has(h));
  console.log(`  ${id} 配色 ${WANT.length - miss.length}/${WANT.length}${miss.length ? '  缺 ' + miss.join(' ') : ''}`);
}

/* L2 刻度带：从 HTML 文本判断有没有主次两级 + 贯穿基线 */
console.log('\n=== L2 刻度带结构（文本层）===');
for (const [id, f] of Object.entries(files)) {
  const h = readFileSync(f, 'utf8');
  const major = /major|主刻度|tick-major|--scale-major/i.test(h);
  const minor = /minor|次刻度|tick-minor|--scale-minor/i.test(h);
  const baseline = /baseline|贯穿|rule-bar|rulebar|贯穿基线/i.test(h);
  const tick = /tick|刻度|ruler/i.test(h);
  console.log(`  ${id}: 刻度元素=${tick} 主刻度=${major} 次刻度=${minor} 贯穿基线=${baseline}`);
}

/* L3 数值对比 */
console.log('\n=== L3 可测值对比 ===');
const fmt = (v) => (v === undefined || v === null ? '—' : String(v));
for (const id of Object.keys(rows)) {
  console.log(`  ${id}: headBody=${fmt(rows[id].headBodyRatio)}  h1=${fmt(rows[id].h1Size)}  body=${fmt(rows[id].bodySize)}`);
}

if (rows.S31) {
  const a = rows.S31.headBodyRatio, b = rows.S98.headBodyRatio;
  if (a && b) {
    const dev = Math.abs(b - a) / a;
    console.log(`\n字号比：S31=${a}  S98=${b}  偏差=${(dev * 100).toFixed(1)}%`);
    console.log(dev <= 0.20
      ? '  → 两者相差 ≤20%，说明「文字描述」把字号关系也传过去了'
      : '  → 两者相差 >20%，说明删掉数值后字号关系没传过去');
  }
}

/* 关键判定 */
console.log('\n=== 判定 ===');
const s98Text = readFileSync(files.S98, 'utf8');
const hasTicks = /tick|刻度|ruler/i.test(s98Text);
const hasTwoTiers = /major/i.test(s98Text) && /minor/i.test(s98Text);
if (hasTicks && hasTwoTiers) {
  console.log('S98 做出了刻度带且有主次两级 → 文字描述足以传递这个结构');
  console.log('  ⇒ 「承重的是数值」这一假说被否定；S31 的结论可以维持');
} else if (hasTicks) {
  console.log('S98 做出了刻度但分不出主次 → 文字传了「有刻度」，没传「两级递进」');
  console.log('  ⇒ 部分承重：结构靠文字，比例靠数值');
} else {
  console.log('S98 完全没做出刻度带 → 没有数值就做不出这个结构');
  console.log('  ⇒ 「承重的是数值」成立；「提示词有效」需要再下调');
}

process.exit(0);
