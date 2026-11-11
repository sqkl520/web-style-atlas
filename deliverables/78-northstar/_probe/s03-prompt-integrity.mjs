#!/usr/bin/env node
/* s03 —— 提示词完整性审计：把 35 案的提示词真生成一遍，看哪些字段是空的。
 *
 * 为什么这件事属于抽样任务：如果某一类"难点案"的提示词本身是坏的，
 * 拿它做盲测复刻，测到的是提示词缺陷，不是风格难度 —— 会把两类信号混在一起。
 * 所以选样之前必须先量：哪些案的提示词能正常生成。
 *
 * 加载方式抄 deliverables/74-q7/make-prompts.mjs 的 DOM stub（那是本仓库唯一
 * 验证过能跑通 prompt-copy.js 的读法）。不写任何文件，只在内存里生成并统计。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const SEL = join(ROOT, 'prototypes/_selection');

function loadBuildPrompt() {
  const dataSrc = readFileSync(join(SEL, 'data.js'), 'utf8');
  const promptsSrc = readFileSync(join(SEL, 'prompts.js'), 'utf8');
  const copySrc = readFileSync(join(SEL, 'prompt-copy.js'), 'utf8');
  const w = { console: { warn() {}, log() {} } };
  w.window = w;
  new Function('window', dataSrc)(w);
  new Function('window', promptsSrc)(w);
  const stubEl = () => ({
    style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, appendChild() {}, addEventListener() {},
    querySelector: () => null, querySelectorAll: () => [], innerHTML: '', textContent: '',
    insertBefore() {}, removeChild() {}, remove() {}, focus() {}, cloneNode() { return stubEl(); },
  });
  w.document = {
    createElement: stubEl, querySelector: () => null, querySelectorAll: () => [],
    body: stubEl(), addEventListener() {}, documentElement: stubEl(),
    getElementById: () => null, readyState: 'complete',
  };
  w.navigator = { clipboard: { writeText: async () => {} } };
  w.setTimeout = () => 0; w.clearTimeout = () => {};
  new Function('window', 'document', 'navigator', 'setTimeout', 'clearTimeout', copySrc)(
    w, w.document, w.navigator, w.setTimeout, w.clearTimeout);
  return { build: w.buildStylePrompt, w };
}

const { build, w } = loadBuildPrompt();
if (!build) { console.error('取不到 buildStylePrompt'); process.exit(1); }
const SCHEMES = w.SCHEMES;
const PROMPTS = w.STYLE_PROMPTS;
const rows = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s01-dataset.json'), 'utf8'));

const BIZ = '一家只做手冲的咖啡店，5 个产区的豆子，加微信订、不做在线支付';
const ACTION = '看完豆单就想问价';

console.log('s03 —— 提示词完整性审计（35 案全部真生成一遍）');
console.log('='.repeat(78));
console.log('输入固定：biz/action 全案相同，只有案号不同 —— 差异只可能来自数据。\n');

const out = [];
for (const r of rows) {
  const text = build(r.id, { biz: BIZ, action: ACTION });
  const p = PROMPTS.schemes.find((x) => x.id === r.id) || {};
  /* 逐项检查：都是"提示词里出现了不该出现的东西"，可字符串判定 */
  const checks = {
    // 1. 「请把整页做成这个风格：。」—— plain 为空导致的空槽
    emptyStyleSlot: text.includes('请把整页做成这个风格：。'),
    // 2. 「拿远半米看：……是不是「」这一种气质」
    emptyMoodSlot: text.includes('是不是「」'),
    // 3. 「这个风格的签名动作：。具体到实现：」—— mechanism 与 plain 双空
    emptyMech: /这个风格的签名动作：。/.test(text),
    // 4. minPics 与 capacity 冲突（S34：提示词要 3 张，而案本身是零位图）
    picContradiction: r.minPicsPrompt !== r.minPics,
  };
  out.push({
    id: r.id, len: text.length, ...checks,
    minPicsShown: r.minPicsPrompt, minPicsReal: r.minPics,
    plainLen: (p.plain || '').length, scenesLen: (p.scenes || []).length,
    toneLen: (SCHEMES.find((s) => s.id === r.id).tone || '').length,
  });
}

const bad = out.filter((x) => x.emptyStyleSlot || x.emptyMoodSlot || x.emptyMech || x.picContradiction);
console.log('## 有缺陷的案（任一判定项成立）');
console.log('  案号  长度  style空  mood空  mech空  minPics冲突  plain长度  scenes数');
for (const x of bad) {
  console.log(`  ${x.id}  ${String(x.len).padStart(5)}   ${x.emptyStyleSlot ? '  ✗  ' : '  .  '}  ${x.emptyMoodSlot ? ' ✗ ' : ' . '}   ${x.emptyMech ? ' ✗ ' : ' . '}    ${x.picContradiction ? '✗ (' + x.minPicsShown + ' vs ' + x.minPicsReal + ')' : '.'}      ${String(x.plainLen).padStart(2)}        ${x.scenesLen}`);
}
console.log(`\n  合计 ${bad.length} / 35 案有提示词缺陷`);
const clean = out.filter((x) => !bad.includes(x));
console.log(`  干净的案 ${clean.length} / 35: ${clean.map((x) => x.id).join(' ')}`);

console.log('\n## 按新旧分组');
const oldOnes = out.filter((x) => Number(x.id.slice(1)) < 31);
const newOnes = out.filter((x) => Number(x.id.slice(1)) >= 31);
console.log(`  老 30 案：有缺陷 ${oldOnes.filter((x) => bad.includes(x)).length} / 30  （${oldOnes.filter((x) => bad.includes(x)).map((x) => x.id).join(' ') || '无'}）`);
console.log(`  新 5 案：有缺陷 ${newOnes.filter((x) => bad.includes(x)).length} / 5  （${newOnes.filter((x) => bad.includes(x)).map((x) => x.id).join(' ') || '无'}）`);

console.log('\n## plain 字段缺失的直接后果（原文摘录）');
for (const id of ['S31', 'S34']) {
  const t = build(id, { biz: BIZ, action: ACTION });
  const line = t.split('\n').find((l) => l.includes('请把整页做成这个风格'));
  console.log(`  ${id}: ${JSON.stringify(line)}`);
}
console.log('\n  对照 S30（老案，plain 完好）:');
const t30 = build('S30', { biz: BIZ, action: ACTION });
console.log(`  S30: ${JSON.stringify(t30.split('\n').find((l) => l.includes('请把整页做成这个风格')))}`);

console.log('\n## S34 的第二处自相矛盾');
const t34 = build('S34', { biz: BIZ, action: ACTION });
const picsLine = t34.split('\n').find((l) => l.includes('个**不同的**图片位置'));
console.log(`  提示词写：${JSON.stringify(picsLine)}`);
const mech34 = PROMPTS.schemes.find((x) => x.id === 'S34').dna.mechanism;
console.log(`  而机制句写：${JSON.stringify(mech34)}`);
console.log(`  该案 gate.realPictures=${rows.find((r) => r.id === 'S34').realPictures}，minitems-parsed.minPics=${rows.find((r) => r.id === 'S34').minPics}`);
console.log('  → 提示词要求「至少 3 个不同的图片位置」，而这一案的签名机制是「全页零位图」。');

console.log('\n## 提示词长度分布（有无缺陷是否影响长度）');
const lens = out.map((x) => x.len);
console.log(`  全部: min ${Math.min(...lens)} max ${Math.max(...lens)} mean ${(lens.reduce((a, b) => a + b, 0) / lens.length).toFixed(0)}`);
const badLens = bad.map((x) => x.len);
if (badLens.length) console.log(`  有缺陷: min ${Math.min(...badLens)} max ${Math.max(...badLens)} mean ${(badLens.reduce((a, b) => a + b, 0) / badLens.length).toFixed(0)}`);
console.log('  逐案长度: ' + out.map((x) => `${x.id}=${x.len}`).join(' '));

writeFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s03-prompt-audit.json'),
  JSON.stringify({ rows: out, bad: bad.map((x) => x.id), clean: clean.map((x) => x.id) }, null, 1));
console.log('\n→ s03-prompt-audit.json 已写');
