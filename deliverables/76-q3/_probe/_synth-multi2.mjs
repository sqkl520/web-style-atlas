// 修正判据后的统计。上一版有两个 bug：
// ① repeat(auto-fit, minmax(..., 1fr)) 被算成「无 fr 轨道」——它其实是响应式自适应，不是固定比例；
// ② minmax(0, 1fr) 里的 1fr 没被抽出——它确实有比例（1:1 之类）。
import { parse } from './_extract-v2.mjs';
import { splitTracks } from './_track-split.mjs';
import { readdirSync } from 'node:fs';

const dirs = readdirSync('prototypes').filter(d => /^S\d{2}-/.test(d)).sort();

function analyze(decls) {
  const gtc = decls.filter(x => x.prop === 'grid-template-columns' && !x.media);
  if (!gtc.length) return { kind: 'none' };
  const pick = gtc.slice().sort((a, b) => splitTracks(b.val).length - splitTracks(a.val).length)[0];
  const v = pick.val;
  // 响应式自适应：auto-fit / auto-fill，没有固定比例可言
  const adaptive = /repeat\(\s*auto-(fit|fill)/.test(v);
  const frs = [], mins = [], other = [];
  for (const t of splitTracks(v)) {
    let m;
    if ((m = t.match(/minmax\(\s*([\d.]+)(px|fr|em|ch)?\s*,\s*([\d.]+)fr\s*\)/))) {
      // minmax(0, 1fr) → 纯 fr；minmax(210px, 3fr) → 有最小宽
      const min = parseFloat(m[1]);
      if (m[2] === 'fr' || min === 0) frs.push(parseFloat(m[3]));
      else { mins.push(m[1]); frs.push(parseFloat(m[3])); }
      continue;
    }
    if ((m = t.match(/^([\d.]+)fr$/))) { frs.push(parseFloat(m[1])); continue; }
    if (/^\d+(\.\d+)?(px|em|ch|%)$/.test(t)) { other.push(t); continue; }
    // 混合单位如 12% 54% 34%
    if (/^[\d.]+%$/.test(t)) { other.push(t); continue; }
  }
  const mixedMin = mins.length > 0;
  return { kind: adaptive ? 'adaptive' : 'fixed', sel: pick.sel, val: v, frs, mins, other, mixedMin, line: pick.line };
}

const stat = { adaptive: [], fixedRatio: [], mixedMin: [], otherUnit: [], none: [] };
console.log('案   值                                   类型        可写的比例');
for (const dir of dirs) {
  const a = analyze(parse(`prototypes/${dir}/style.css`));
  let kind = a.kind, desc = '—';
  if (kind === 'none') { stat.none.push(dir); kind = '无'; }
  else if (kind === 'adaptive') { stat.adaptive.push(dir); kind = '自适应'; desc = '无固定比例'; }
  else if (a.mixedMin) { stat.mixedMin.push(dir); kind = '混合最小宽'; desc = a.frs.join(':') + `（含 ${a.mins.join('/')} 最小宽）`; }
  else if (a.frs.length >= 1) { stat.fixedRatio.push(dir); kind = '固定比例'; desc = a.frs.join(':'); }
  else { stat.otherUnit.push(dir); kind = '其他单位'; desc = a.other.join(' ') || '—'; }
  console.log(dir.slice(0,3).padEnd(4), (a.val||'—').slice(0,36).padEnd(37), kind.padEnd(10), desc.slice(0,30));
}
console.log('');
console.log('=== 分类统计 ===');
for (const [k, v] of Object.entries(stat)) console.log(`  ${k.padEnd(12)} ${String(v.length).padStart(2)} 案  ${v.map(x=>x.slice(0,3)).join(' ')}`);
