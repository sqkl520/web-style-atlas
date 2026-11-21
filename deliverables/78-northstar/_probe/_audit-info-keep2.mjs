/* 信息守恒（第二版）：逐个丢失值给出**原文上下文**，让人判断它是"该删的靶值/条款号"还是"真丢了"。
 * 第一版只报值，结果 40 个"丢失"里绝大多数是 `第 N 条` 拆出来的 `N条` —— 那是判据的噪声，
 * 不是改写的问题。判据收窄：排除条款号碎片与三类别必要删的靶值，并打印上下文供人工核。 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../../');
const rewrites = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json'), 'utf8'));

/* 该删的三类：① 被禁做法的靶值 ② 内部条款号 `第 N 条` 的碎片 ③ 跨案对照句里的值 */
const DROP_TARGET = /#FFFFFF|#000000|24px\s*圆角|16\s*至\s*32px\s*圆角|32px\s*圆角|24px\s*网格|1\.5\s*[–-]\s*2px\s*描边/gi;
const VAL_RE = /#[0-9A-Fa-f]{6}\b|\d+(?:\.\d+)?\s*(?:px|mm|%|°|ms|级|档|栏|条|枚|张|个|行|格)/g;

function hits(text) {
  const out = [];
  for (const m of String(text || '').matchAll(VAL_RE)) {
    const v = m[0].replace(/\s/g, '').toUpperCase();
    const ctx = text.slice(Math.max(0, m.index - 14), m.index + m[0].length + 10);
    out.push({ v, ctx });
  }
  return out;
}

let real = 0;
for (const id of Object.keys(rewrites).sort()) {
  const r = rewrites[id];
  const after = r.after.replace(/\s/g, '').toUpperCase();
  const dropped = r.before.replace(DROP_TARGET, ' ');
  const miss = [];
  for (const { v, ctx } of hits(dropped)) {
    if (after.includes(v)) continue;
    if (miss.some((x) => x.v === v)) continue;
    /* 条款号碎片：`第 11 条` → `11条`，删掉是对的 */
    if (/第\s*\d+\s*条/.test(r.before.slice(Math.max(0, r.before.indexOf(ctx) , ), r.before.indexOf(ctx) + ctx.length + 5))
        && /^\d+条$/.test(v)) continue;
    miss.push({ v, ctx });
  }
  if (miss.length) {
    real += miss.length;
    console.log(`❌ ${id}`);
    for (const m of miss) console.log(`     ${m.v.padEnd(8)} 原文: …${m.ctx}…`);
  }
}
console.log(`\n${real ? `${real} 个值需人工判断（见上）` : '✅ 35/35 案，除"该删的靶值/条款号"外无值丢失'}`);
