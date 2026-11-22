/* 「同一输入、不同结果」的对照组：7 个案的提示词结构约束完全同构
 * （slots=6, have=5），产物图片数却分成两组。
 *
 * 这个脚本要回答的是一个容易答错的问题：
 *   「4 个案图片不够，是不是提示词写错了？」
 *
 * 答案是不是。如果提示词是原因，同构的 7 份提示词应该产生同一个结果。
 * 实测分成 4:3 两拨 —— 说明这是模型侧的概率性失手，不是施工图的缺陷。
 *
 * 这条对照的价值在于：它会否掉「改提示词就能修好」这个诱人但错误的行动。
 * 所以它必须一直跑着 —— 一旦有人真去改提示词，这 7 份就不再同构，
 * 脚本会红，提醒「你的对照组没了」。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BT = join(resolve(HERE, '..'), '_blindtest');

/* S09-r2 是第二轮，同样 slots=6/have=5 的提示词。放进同构组是**故意的**：
 * 它给同一案提供了第二个样本，而且两轮同为失手（1 张 vs 4 张，都不够 5）。
 *
 * S21-r4 更重要：它与 S21-r2/r3 **提示词逐字相同**（md5 137348de），
 * 而 r2/r3 排 5 张达标、r4 排 4 张失手。
 * ⇒ 同一个案、同一份提示词、跑三次，结果分成两组。
 * 这是「案难不难」这个变量被固定住之后仍然出现的分化 ——
 * 比"同构但不同案"强一档，因为不同案之间总可以辩一句"那几个案本来就难"。 */
const CASES = ['S01', 'S09', 'S09-r2', 'S15', 'S24', 'S20', 'S21', 'S21-r2', 'S21-r3', 'S21-r4', 'S22', 'S23'];
const SIGNATURE = /这个版式有 (\d+) 个图片位，但你只有 (\d+) 条内容/;

function readArtifact(id) {
  const d = join(BT, id);
  if (!existsSync(d)) return null;
  const f = readdirSync(d).find((x) => x.endsWith('.html'));
  const p = join(d, '_prompt.txt');
  if (!f || !existsSync(p)) return null;
  const html = readFileSync(join(d, f), 'utf8');
  const prompt = readFileSync(p, 'utf8');
  const m = prompt.match(SIGNATURE);
  return {
    id,
    file: f,
    slots: m ? +m[1] : null,
    have: m ? +m[2] : null,
    imgs: (html.match(/<img[\s>]/g) || []).length,
    bytes: Buffer.byteLength(html, 'utf8'),
  };
}

const rows = CASES.map(readArtifact).filter(Boolean);

/* 只保留「结构约束同构」的那批 —— slots=6, have=5 */
const same = rows.filter((r) => r.slots === 6 && r.have === 5);
const need = 5;

console.log('同构组（slots=6, have=5）：提示词要求放 5 张不同的图\n');
console.log('案    产物 img   判定      产物字节');
console.log('─'.repeat(48));
const ok = [], bad = [];
for (const r of same) {
  const pass = r.imgs >= need;
  (pass ? ok : bad).push(r);
  console.log(`${r.id}    ${String(r.imgs).padEnd(8)} ${pass ? '✓ 达标' : '✗ 少 ' + (need - r.imgs) + ' 张'}`.padEnd(26) + `  ${r.bytes}`);
}
console.log('─'.repeat(48));
console.log(`达标 ${ok.length} 案：${ok.map((r) => r.id).join(' ')}`);
console.log(`失手 ${bad.length} 案：${bad.map((r) => r.id).join(' ')}`);
console.log(`字节区间：达标 ${Math.min(...ok.map((r) => r.bytes))}–${Math.max(...ok.map((r) => r.bytes))}　`
  + `失手 ${bad.length ? Math.min(...bad.map((r) => r.bytes)) + '–' + Math.max(...bad.map((r) => r.bytes)) : '—'}`);

/* ── 结论与断言 ────────────────────────────────────────────────────
 * 只有在「两组都非空」时才下「概率性失手」这个结论。
 * 若某一组空了，说明上游变了或提示词被改了，那时这个对照不再成立，
 * 脚本必须红，而不是继续打印一个已经没有对照作基础的结论。 */
console.log('');
if (same.length < 6) {
  console.error(`✗ 同构组只剩 ${same.length} 案（应 ≥6）—— 对照组没了，结论不成立`);
  process.exit(1);
}
if (!ok.length || !bad.length) {
  console.error(`✗ 只有一组：达标 ${ok.length} / 失手 ${bad.length} —— 无法区分「提示词缺陷」与「模型失手」`);
  process.exit(1);
}
console.log('✓ 结论：同一份结构约束下产物分成两组 →');
console.log('  图片数不够**不是提示词缺陷**，是模型侧的概率性失手。');
console.log('  证据：同构提示词既产生了 5–6 张的产物，也产生了 1–4 张的产物。');
console.log('  ⇒「改提示词就能修好这 4 案」这个行动方向被这组数据否掉了。');

/* ── 同案分化断言（2026-11-22 加，这是最强的一档证据）──────────────
 *
 * 上面那个结论靠的是「同构但不同案」。它留了一个反驳空间：
 * 也许失手的那几个案本来就比达标的案难。
 *
 * S21 跑了三次（r2/r3/r4），提示词逐字相同（md5 相同），
 * 前两次 5 张达标、第三次 4 张失手 —— **案难不难这个变量被固定住了**。
 *
 * 所以这条断言查的是：同一个案号，有没有同时出现在「达标」和「失手」两栏。
 * 有 → 直接证据成立；没有 → 只算间接证据，结论要降一档说。 */
const byBase = new Map();
for (const r of same) {
  const base = r.id.match(/^S\d{2}/)[0];
  if (!byBase.has(base)) byBase.set(base, { ok: [], bad: [] });
  (r.imgs >= need ? byBase.get(base).ok : byBase.get(base).bad).push(`${r.id}=${r.imgs}`);
}
const split = [...byBase.entries()].filter(([, v]) => v.ok.length && v.bad.length);

console.log('');
if (split.length) {
  console.log('✓ 同案分化（最强证据）：');
  for (const [base, v] of split) {
    console.log(`   ${base}  达标 ${v.ok.join(' / ')}　失手 ${v.bad.join(' / ')}`);
  }
  console.log('   ⇒ 同一个案、同一份提示词，结果仍然分成两栏。');
  console.log('     「案本身更难」这个解释被排除了 —— 概率性失手成立。');
} else {
  console.log('~ 没有同案分化：结论只是「同构不同案」这一档的间接证据。');
  console.log('  要升级成直接证据，需要同一个案跑两次以上且提示词相同。');
}
