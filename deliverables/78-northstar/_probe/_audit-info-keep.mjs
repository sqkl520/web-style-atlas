/* 信息守恒：改写稿必须保住原文里的每个具体值。
 *
 * 判据与闸门里的 valuesOf 同源（BANNED_TARGET_RE 排除那些"被禁做法的靶值"，
 * 它们本来就该消失）。这里把它跑在全部 35 案上，并把每个丢失的值点名列出 ——
 * 因为"改写时顺手删掉一个 24px"是这个任务里最容易犯、也最难被闸门发现的错：
 * 闸门只判负面措辞，不判数值还在不在。
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../../');
const rewrites = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/_audit-rewrites/rewrites.json'), 'utf8'));

const BANNED_TARGET_RE = /#FFFFFF|#000000|24px\s*圆角|16\s*至\s*32px\s*圆角|32px\s*圆角|48px\s*高/gi;
const VAL_RE = /#[0-9A-Fa-f]{6}\b|\d+(?:\.\d+)?\s*(?:px|mm|%|°|ms|级|档|栏|条|枚|张|个|行|格)/g;

function valuesOf(text) {
  const t = String(text || '').replace(BANNED_TARGET_RE, ' ');
  const hits = t.match(VAL_RE) || [];
  return [...new Set(hits.map((v) => v.replace(/\s/g, '').toUpperCase()))];
}

let lostCases = 0, totalLost = 0;
const rows = [];
for (const [id, r] of Object.entries(rewrites).sort()) {
  const bv = valuesOf(r.before);
  const av = new Set(valuesOf(r.after));
  const miss = bv.filter((v) => !av.has(v));
  rows.push({ id, bv, miss });
  if (miss.length) { lostCases++; totalLost += miss.length; }
}

/* 只打印"像值"的 token，跳过被 BANNED_TARGET_RE 挖空后产生的噪声 */
for (const r of rows) {
  const flag = r.miss.length ? '❌' : '✅';
  console.log(`${flag} ${r.id}  值 ${r.bv.length} 个${r.miss.length ? `  丢失: ${r.miss.join(' ')}` : ''}`);
}
console.log(`\n${lostCases ? `❌ ${lostCases}/35 案有值丢失，合计 ${totalLost} 个` : '✅ 35/35 案数值全部保留'}`);
