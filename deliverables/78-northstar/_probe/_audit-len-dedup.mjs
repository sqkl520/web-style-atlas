/* 涨幅的**净**口径：整段追加(v B) vs 只追加"提示词里还没有的那部分"。
 *
 * 为什么要量这个：纪律文档要求"信息量不丢"，但**不要求重复**。
 * 实测提示词里已有：配色 4 值（硬约束 1）、圆角 0（硬约束 3）、无阴影（硬约束 4）、
 * 线宽级别（硬约束 5）、字号（硬约束 6）、机制句、动效、防退化 8 条。
 * 而改写后的 audit 仍在重复说「全站一律 0 / #E7E7E0 / 圆角为 0」——
 * 那是同一件事说两遍。真实接入时会去重，所以 v B 是**上限**，不是预期值。
 *
 * 判据（保守，宁可高估）：把 after 里"整条都在说提示词已有的东西"的句子才算重复。
 * 以**句**为单位（。；：），一句里只要有一个 token 是提示词没有的，就整句计入不重复。
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../../');
const SEL = join(ROOT, 'prototypes/_selection');
const rewrites = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json'), 'utf8'));

const win = {};
const doc = { readyState: 'complete', addEventListener() {}, querySelector: () => null,
  querySelectorAll: () => [], getElementById: () => null,
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }) };
const sb = { window: win, document: doc, console };
vm.createContext(sb);
for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) vm.runInContext(readFileSync(join(SEL, f), 'utf8'), sb, { filename: f });
const build = win.buildStylePrompt;

const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };

/* 一条"事实 token"：值、或一个够具体的短语。用来判"这句是不是在说提示词已有的东西"。 */
const TOK = /#[0-9A-Fa-f]{6}|\d+(?:\.\d+)?\s*(?:px|mm|%|°|ms|级|档|栏|条|枚|张|个|行|格)|圆角|直角|阴影|投影|网格|图标/g;

function dedupSaving(id, promptText) {
  const after = rewrites[id].after;
  const p = promptText.replace(/\s/g, '');
  /* 按 。；： 切句，保留分隔符 */
  const sents = after.match(/[^。；：]+[。；：]?/g) || [];
  let keep = '';
  const dropped = [];
  for (const s of sents) {
    const toks = [...new Set((s.match(TOK) || []).map((t) => t.replace(/\s/g, '')))];
    /* 这句所有 token 都已在提示词里 → 视为重复（保守：仍需至少 1 个 token 才算） */
    const allKnown = toks.length > 0 && toks.every((t) => p.includes(t));
    if (allKnown) dropped.push(s.trim().slice(0, 24));
    else keep += s;
  }
  return { keepLen: keep.length, dropped };
}

const lensBase = [], lensFull = [], lensDedup = [];
const detail = [];
for (const s of win.SCHEMES) {
  const base = build(s.id);
  const after = rewrites[s.id].after;
  const d = dedupSaving(s.id, base);
  lensBase.push(base.length);
  lensFull.push(base.length + 1 + after.length);
  /* 去重后：保留"不重复的句子"，并按比例保留编号符 */
  lensDedup.push(base.length + 1 + d.keepLen);
  detail.push({ id: s.id, base: base.length, full: base.length + 1 + after.length, dd: base.length + 1 + d.keepLen, drop: d.dropped });
}

console.log('案    现状   整段追加  去重后   省');
for (const d of detail) {
  console.log(`${d.id}  ${String(d.base).padStart(5)}  ${String(d.full).padStart(8)}  ${String(d.dd).padStart(6)}  ${String(d.full - d.dd).padStart(3)}`);
}
const pct = (x, y) => ((x / y - 1) * 100);
console.log('');
console.log(`现状       median ${med(lensBase)}`);
console.log(`整段追加   median ${med(lensFull)}   +${pct(med(lensFull), med(lensBase)).toFixed(2)}%  ← 上限`);
console.log(`去重后     median ${med(lensDedup)}   +${pct(med(lensDedup), med(lensBase)).toFixed(2)}%  ← 更接近实际`);
console.log('');
const dropTotal = detail.reduce((a, d) => a + (d.full - d.dd), 0);
console.log(`被判定为重复而可省的正文：${dropTotal} 字 / 全库 ${Object.values(rewrites).reduce((a, r) => a + r.after.length, 0)} 字 = ${(dropTotal / Object.values(rewrites).reduce((a, r) => a + r.after.length, 0) * 100).toFixed(0)}%`);
console.log('\n抽样（被判为重复的句子）:');
for (const d of detail.slice(0, 6)) if (d.drop.length) console.log(`  ${d.id}: ${d.drop.join(' | ')}`);
