/* 闸门之后的第二道自检：**成句否定**还剩多少。
 *
 * 闸门判的是 L1/L2/L2b/标记词 —— 它故意放过 L3（"零圆角"这类设计事实）。
 * 但任务的要求比闸门严：「读起来像给 AI 的施工说明，不是评审记录」。
 * 「全站没有一处柔和投影」在闸门里合规（L3），可读起来仍是"在驳什么"。
 * 所以这里把残留逐个列出来，供人工判断：留下的是"设计事实"，改掉的是"还在反驳"。
 *
 * ⚠️ 这**不是**判据，是清单。把否定词一律判硬错就会逼人删掉
 * 「零圆角」这种本案主张 —— 那正是闸门注释里记录过的错法。
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../../');
const R = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json'), 'utf8'));

const NEG = /不是[^，。；]{0,20}|没有任何|没有一处|不存在|而不是|而非|不靠|不设|不做|不用|不得|不许|无纯|不参与|不生成|不出现|不交叉|不吸顶|不模糊|不填|不算/g;
const KEEP_OK = /零\s*(?:圆角|图标|渐变|box-shadow|box shadow|位图)|全站一律 0|一律 0|圆角为 0|为 0|直角/g;

let total = 0;
const rows = [];
for (const [id, r] of Object.entries(R).sort()) {
  const hits = [...r.after.matchAll(NEG)].map((m) => {
    const ctx = r.after.slice(Math.max(0, m.index - 12), m.index + m[0].length + 16);
    return { t: m[0], ctx };
  });
  if (hits.length) { rows.push({ id, hits }); total += hits.length; }
}
for (const r of rows) {
  console.log(`${r.id}  ${r.hits.length} 处`);
  for (const h of r.hits) console.log(`    「${h.t}」 …${h.ctx}…`);
}
console.log(`\n合计 ${total} 处成句否定（35 案 / ${Object.keys(R).length} 段）。` +
  `\n对照：改写前是 287 处（含 3–5 处/案的"不是…而是"+「跳脱之处」子句）。`);
