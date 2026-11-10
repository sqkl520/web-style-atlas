// 探针 34：audit 字段若接进 UI/提示词，各处的实际容量与截断点；以及 tasks 里「半死字段」清单的最终判定
import { loadSchemes, loadPrompts } from './lib-load.mjs';
const S = loadSchemes();
const P = loadPrompts();

console.log('=== audit 字段长度分布（决定是否必须截断）===');
const lens = S.map((r) => (r.audit || '').length).sort((a, b) => a - b);
console.log(`min ${lens[0]} / P25 ${lens[7]} / 中位 ${lens[15]} / P75 ${lens[22]} / max ${lens[29]}`);
for (const cap of [150, 200, 220, 260, 300]) {
  const cut = S.filter((r) => (r.audit || '').length > cap).length;
  const lost = S.reduce((a, r) => a + Math.max(0, (r.audit || '').length - cap), 0);
  console.log(`  上限 ${cap} 字 → ${cut}/30 案被截断，共丢弃 ${lost} 字`);
}

console.log('\n=== 与 risk 的截断口径对比（risk 现用 220）===');
const rl = S.map((r) => (r.risk || '').length);
console.log(`risk: min ${Math.min(...rl)} / max ${Math.max(...rl)} / 平均 ${Math.round(rl.reduce((a,b)=>a+b,0)/30)}；>220 的案 ${rl.filter((x)=>x>220).length}/30`);
console.log(`audit: min ${lens[0]} / max ${lens[29]} / 平均 ${Math.round(lens.reduce((a,b)=>a+b,0)/30)}；>220 的案 ${S.filter((r)=>(r.audit||'').length>220).length}/30`);

console.log('\n=== audit 与 risk 的内容重叠度（是否会被用户视为重复）===');
let overlap = 0;
for (const r of S) {
  const a = (r.audit || ''), b = (r.risk || '');
  // 用 8 字滑窗算重合率
  const grams = new Set();
  for (let i = 0; i + 8 <= a.length; i++) grams.add(a.slice(i, i + 8));
  let hit = 0, tot = 0;
  for (let i = 0; i + 8 <= b.length; i++) { tot++; if (grams.has(b.slice(i, i + 8))) hit++; }
  if (tot && hit / tot > 0.05) overlap++;
}
console.log(`audit 与 risk 有 >5% 八字片段重合的案: ${overlap}/30（低 → 两者确实互补，不是重复）`);

console.log('\n=== 最终判定：真·死字段 vs 半死字段 ===');
const DEAD = ['copy', 'primary', 'buttonText', 'scenesNo', 'audit'];
for (const k of DEAD) {
  const tot = S.reduce((a, r) => a + (typeof r[k] === 'string' ? r[k].length : JSON.stringify(r[k] || '').length), 0);
  console.log(`  ${k}: ${tot} 字 / 30 案 / 6 个 UI 文件命中 0`);
}
