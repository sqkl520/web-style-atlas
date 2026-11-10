// 在多案上跑同样的合成，统计失败模式。判据：合成结果里有多少是「读起来就不对」的。
import { parse } from './_extract-v2.mjs';
import { readdirSync } from 'node:fs';

const dirs = readdirSync('prototypes').filter(d => /^S\d{2}-/.test(d)).sort();

function ratioText(decls) {
  const gtc = decls.filter(x => x.prop === 'grid-template-columns' && !x.media);
  if (!gtc.length) return { text: null, why: '无显式 grid-template-columns' };
  // 挑轨道最多的
  const pick = gtc.slice().sort((a, b) => b.val.split(/\s+/).length - a.val.split(/\s+/).length)[0];
  const tracks = pick.val.split(/\s+/);
  const frs = [];
  const mins = [];
  const pxs = [];
  for (const t of tracks) {
    const mm = t.match(/minmax\(\s*([\d.]+px)\s*,\s*([\d.]+fr)\s*\)/);
    if (mm) { mins.push(parseFloat(mm[1])); frs.push(parseFloat(mm[2])); continue; }
    if (/fr$/.test(t)) { frs.push(parseFloat(t)); continue; }
    if (/^\d+(\.\d+)?px$/.test(t)) { pxs.push(parseFloat(t)); continue; }
  }
  // 关键判断：如果 fr 与 minmax 混在同一个值里，单纯写比例是误导
  const mixed = mins.length > 0 && frs.length > mins.length;
  return {
    sel: pick.sel, val: pick.val, frs, mins, pxs, mixed,
    text: mixed
      ? `⚠ 混合写法（${mins.length} 个 minmax 有最小宽、${frs.length} 个 fr），不能只写比例`
      : (frs.length ? `比例 ${frs.join(':')}` : `无 fr 轨道（${pxs.join('px、') || 'auto'}）`),
    line: pick.line,
  };
}

let total = 0, warn = 0, noGtc = 0;
console.log('案   主导轨值                              合成                              判定');
for (const dir of dirs) {
  const d = parse(`prototypes/${dir}/style.css`);
  const r = ratioText(d);
  total++;
  let verdict = 'ok';
  if (!r.text) { noGtc++; verdict = '✗ 抽不到'; }
  else if (r.mixed) { warn++; verdict = '⚠ 会误导'; }
  console.log(
    dir.slice(0, 3).padEnd(4),
    (r.val || '—').slice(0, 34).padEnd(36),
    (r.text || '—').slice(0, 30).padEnd(32),
    verdict
  );
}
console.log('');
console.log(`共 ${total} 案：抽不到 ${noGtc} 案，会误导 ${warn} 案，可用 ${total - noGtc - warn} 案`);
