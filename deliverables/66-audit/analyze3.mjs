// analyze3.mjs — 汇总 m5b-*（详情压深方案）与 m9/m10/m11/m4（列表方案）
import { readFileSync } from 'node:fs';
const rd = (f) => JSON.parse(readFileSync(new URL('./' + f, import.meta.url), 'utf8'));

const m5 = { '390': rd('data-m5b-detailvar-390.json'), '414': rd('data-m5b-detailvar-414.json') };
const LABELS = rd('data-m5b-detailvar-390.json').vdefs;
const ORDER = ['V0', 'VA', 'VA5', 'VB', 'VB5', 'VC', 'VD', 'VE', 'VF', 'VG'];

for (const vp of ['390', '414']) {
  const data = m5[vp].vps[vp];
  const ids = Object.keys(data).sort();
  console.log(`\n===== 详情面板方案 ${vp}×${vp === '390' ? 844 : 896}（n=${ids.length}）`);
  console.log('方案  scrollH min–max (avg)  屏数 max  >3800  首字段 min–max   首屏完整字段数 avg  字段区 avg');
  for (const k of ORDER) {
    const a = ids.map((id) => data[id][k]);
    const sh = a.map((x) => x.scrollH);
    const avg = (f) => (a.reduce((p, q) => p + f(q), 0) / a.length);
    console.log(`${k.padEnd(4)} ${String(Math.min(...sh)).padStart(5)}–${String(Math.max(...sh)).padStart(5)} (${String(Math.round(avg((x) => x.scrollH))).padStart(5)})  `
      + `${avg((x) => x.screens).toFixed(2)}  ${String(sh.filter((x) => x > 3800).length).padStart(2)}/30  `
      + `${String(Math.min(...a.map((x) => x.firstFieldTop))).padStart(6)}–${String(Math.max(...a.map((x) => x.firstFieldTop))).padStart(6)}  `
      + `${avg((x) => x.fieldsFullyInFirstScreen).toFixed(1)}  ${Math.round(avg((x) => x.fieldsH)).toString().padStart(5)}`);
  }
  console.log(' 备注：');
  for (const k of ORDER) console.log(`  ${k}: ${LABELS[k]}`);
}

// 逐案表：V0 vs 推荐组合
console.log('\n\n===== 390 逐案：V0 / VB / VF / VG');
const d390 = m5['390'].vps['390'];
const ids = Object.keys(d390).sort();
console.log('id    V0    VB    VF    VG    VB-Δ   VF-Δ   VG-Δ');
for (const id of ids) {
  const r = d390[id];
  console.log(`${id}  ${String(r.V0.scrollH).padStart(4)}  ${String(r.VB.scrollH).padStart(4)}  ${String(r.VF.scrollH).padStart(4)}  ${String(r.VG.scrollH).padStart(4)}  ${String(r.VB.scrollH - r.V0.scrollH).padStart(6)} ${String(r.VF.scrollH - r.V0.scrollH).padStart(6)} ${String(r.VG.scrollH - r.V0.scrollH).padStart(6)}`);
}

// 列表方案
const m11 = rd('data-m11-firstscreen2.json');
console.log('\n\n===== 列表首屏方案');
for (const vp of ['390', '414', '1440']) {
  console.log(`--- ${vp}`);
  for (const [k, m] of Object.entries(m11.vps[vp])) {
    console.log(`  ${k.padEnd(22)} mast=${String(m.mastH).padStart(5)} rail=${String(m.railH).padStart(5)} bar=${String(m.barH).padStart(5)} 首卡top=${String(m.firstRowTop).padStart(7)} 卡高=${String(m.firstRowH).padStart(6)} 完整=${m.completeCards} 可见=${m.firstCardVisiblePct}% ovX=${m.overflowX}`);
  }
}
