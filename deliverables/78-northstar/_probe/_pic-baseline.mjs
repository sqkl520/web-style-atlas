/* 全量基线：走 alt 分支（slots > have）的产物，图片数达标率是多少。
 *
 * 为什么要基线：
 * 「图片少一张」可能是缺陷也可能是常态，区别只在**基数**。
 * 2026-11-23 首次实测 24 份里 15 份达标（63%），偏差 8/9 是「少」。
 *
 * 这个数的用处不是判断对错，是给未来的改动一个参照：
 *   · 改了提示词再跑一批，达标率 60% 上下 → 和现在没区别，别把波动读成改善
 *   · 掉到 40% → 真退化了
 *   · 涨到 85% → 真改善了
 * 没有基线，任何一次「跑完发现 X 案失手」都无法判断是好是坏。
 *
 * 顺带产出两条结构性观察：
 *   ① 偏差方向分布 —— 如果绝大多数是「少」，说明模型有系统性保守倾向
 *   ② 同案跨轮次的极差 —— 直接给出「随机波动有多大」
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BT = join(resolve(HERE, '..'), '_blindtest');

const SIGNATURE = /这个版式有 (\d+) 个图片位，但你只有 (\d+) 条内容/;

const dirs = readdirSync(BT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}(-r\d+)?$/.test(d.name))
  .map((d) => d.name).sort();

const rows = [];
for (const id of dirs) {
  const hp = join(BT, id, 'index.html');
  const pp = join(BT, id, '_prompt.txt');
  if (!existsSync(hp) || !existsSync(pp)) continue;
  const m = readFileSync(pp, 'utf8').match(SIGNATURE);
  if (!m) continue;   // 不是 alt 分支，不在本基线的口径内
  const html = readFileSync(hp, 'utf8');
  const imgs = (html.match(/<img[\s>]/g) || []).length;
  const slots = Number(m[1]);
  const have = Number(m[2]);
  const need = Math.min(slots, have);
  rows.push({ id, slots, have, need, imgs, ok: imgs >= need, diff: imgs - need });
}

if (!rows.length) {
  console.log('没有 alt 分支的产物 —— 基线无法计算');
  process.exit(0);
}

const okN = rows.filter((r) => r.ok).length;
const rate = Math.round((okN / rows.length) * 100);

console.log(`全量基线：alt 分支（slots > have）的产物 ${rows.length} 份\n`);
console.log('案         slots have 合格线 实得 偏差');
console.log('─'.repeat(46));
for (const r of rows) {
  const d = r.diff === 0 ? '0' : (r.diff > 0 ? '+' + r.diff : String(r.diff));
  console.log(`${r.id.padEnd(10)} ${String(r.slots).padStart(5)} ${String(r.have).padStart(4)} `
    + `${String(r.need).padStart(6)} ${String(r.imgs).padStart(4)} ${d.padStart(5)} ${r.ok ? '✓' : '✗'}`);
}
console.log('─'.repeat(46));
console.log(`达标 ${okN}/${rows.length} = ${rate}%`);

/* ① 偏差方向 */
const under = rows.filter((r) => r.diff < 0).length;
const over = rows.filter((r) => r.diff > 0).length;
const exact = rows.filter((r) => r.diff === 0).length;
console.log(`\n偏差方向：刚好 ${exact} ／ 少 ${under} ／ 多 ${over}`);
if (under > over * 3 && under >= 3) {
  console.log('  · 偏差高度偏向「少」→ 模型对数量约束有系统性保守倾向');
  console.log('    这条可能同样适用于条目数、线宽级数、动效动作数等「要求数量」的约束');
}

/* ② 同案跨轮次极差 —— 直接量出随机波动有多大 */
const byBase = new Map();
for (const r of rows) {
  const base = r.id.match(/^S\d{2}/)[0];
  if (!byBase.has(base)) byBase.set(base, []);
  byBase.get(base).push(r);
}
const multi = [...byBase.entries()].filter(([, v]) => v.length > 1);
if (multi.length) {
  console.log('\n同案跨轮次（直接看随机波动多大）：');
  for (const [base, v] of multi) {
    const imgs = v.map((r) => r.imgs);
    const range = Math.max(...imgs) - Math.min(...imgs);
    console.log(`  ${base}  ${v.map((r) => r.id + '=' + r.imgs).join(' / ')}　极差 ${range}`);
  }
  console.log('  · 极差 > 0 的案说明：同一案不同轮次结果不同，');
  console.log('    所以「某案失手了」不能直接当成提示词有问题。');
}

console.log(`\n结论：当前达标率基线 ${rate}%。`);
console.log('  以后改了提示词再跑一批：60% 上下 = 没变化，40% = 退化，85% = 改善。');
