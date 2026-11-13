/* 检查：机制句里的可测值，有没有**独立的数据字段**承载它？
 *
 * ⚠️ 第一版是恒真的：我把机制句里的数字拿去 JSON.stringify(dna) 里找，
 * 而机制句本身就在 dna 里 —— 数字当然找得到。
 * 实测：S31 的 34px / 60px 只出现在 dna.mechanism 与 dna.risk 里，
 * 那是同一段文字，不是独立的数值字段。
 *
 * 正确的判据：**排除 mechanism / risk / reuse 这几个「描述性」字段**，
 * 只在实际承载数值的结构化字段里找（lineWidths / h1Size / bodySize / palette / fonts / radius / shadow）。
 *
 * 它回答的问题是：如果模型要「精确执行」机制句里的每个数，
 * 提示词的其它部分有没有把这些数复述一遍？如果没有，那些数只出现过一次，
 * 全靠机制句里那一句话承载 —— 这正是 S98 暴露的脆弱形态。
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const c = { window: {} };
vm.createContext(c);
vm.runInContext(readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8'), c);
const P = c.window.STYLE_PROMPTS.schemes;

/* 描述性字段：它们是人写的句子，不是独立数据 */
const DESCRIPTIVE = new Set(['mechanism', 'risk', 'reuse', 'degrades']);

const rows = [];
for (const s of P) {
  const d = s.dna || {};
  const mech = String(d.mechanism || '');

  const nums = new Set();
  for (const m of mech.matchAll(/(\d+(?:\.\d+)?)\s*(px|vw|fr|%|mm|deg|°)/g)) nums.add(m[0].replace(/\s/g, ''));
  for (const m of mech.matchAll(/\b\d+:\d+(?::\d+)?\b/g)) nums.add(m[0]);

  /* 只在实际数据字段里找 */
  const dataOnly = {};
  for (const [k, v] of Object.entries(d)) {
    if (DESCRIPTIVE.has(k)) continue;
    dataOnly[k] = v;
  }
  const dataText = JSON.stringify(dataOnly);

  /* 裸数字匹配太松（"3" 几乎必然出现），要求带单位或不带单位的完整 token */
  const hit = [...nums].filter((n) => {
    const bare = n.replace(/(px|vw|fr|%|mm|deg|°)$/, '');
    /* 完整带单位的形式，或作为一个独立数字出现（前后不是数字） */
    return dataText.includes(n) || new RegExp(`(^|[^\\d.])${bare.replace('.', '\\.')}([^\\d]|$)`).test(dataText);
  });
  const miss = [...nums].filter((n) => !hit.includes(n));

  rows.push({ id: s.id, total: nums.size, hit: hit.length, miss });
}

const w = (s, n) => String(s).padEnd(n);
console.log(w('案', 5) + w('机制值数', 10) + w('数据字段里有', 14) + '只在机制句里出现的');
console.log('─'.repeat(80));
let risky = 0;
for (const r of rows) {
  const flag = r.miss.length ? ' ⚠' : '';
  if (r.miss.length) risky++;
  console.log(w(r.id, 5) + w(r.total, 10) + w(r.hit, 14) + (r.miss.join(' ') || '—') + flag);
}

console.log('\n=== 汇总 ===');
console.log(`机制句含可测值的案：${rows.filter((r) => r.total > 0).length}/${rows.length}`);
console.log(`有值只在机制句里出现（数据字段里没有）的案：${risky}/${rows.length}`);
const clean = rows.filter((r) => r.miss.length === 0);
console.log(`全部值都有独立字段承载的案：${clean.length}/${rows.length}`);

if (risky) {
  console.log('\n=== 这意味着什么 ===');
  console.log('那些值只出现在机制句这一句话里。模型要精确执行它们，只能靠读懂那句话。');
  console.log('如果哪天机制句被改写或截断，这些值就没有第二处承载 —— S98 实验说明');
  console.log('「机制句具体但缺值」会让提示词静默失效。');
}
