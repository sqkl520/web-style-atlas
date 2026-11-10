// p-r3current.mjs — 在**当前树**（折叠已实现）上测我的排版建议：只做不承载阅读的四刀
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const R3 = '#detail .field{padding:10px 0}'
  + '#detail .fields .field-fold{padding:10px 0}'
  + '#d-body{padding-left:14px;padding-right:14px;padding-bottom:32px}';
const R2 = '#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}'
  + '#detail .field dt{margin-bottom:2px}#d-body{padding-left:10px;padding-right:10px}';

const V = {
  'C0 当前树': null,
  'R2 审计排版（lh1.5/内距8/dt2/内宽10）': R2,
  'R3 我的：内距10/内宽14/底32（行高与dt不动）': R3,
};

const PROBE = () => {
  const d = document.getElementById('detail');
  const dl = d.querySelector('#d-body .fields');
  const cs = getComputedStyle;
  const flatF = dl.querySelector('.field:not(.field-fold)');
  const dd = flatF ? flatF.querySelector('dd') : null;
  const dt = flatF ? flatF.querySelector('dt') : null;
  const body = document.getElementById('d-body');
  const headNo = d.querySelector('.detail-no');
  const sum = dl.querySelector('summary');
  const lineBox = dd ? parseFloat(cs(dd).lineHeight) : null;
  const fs = dd ? parseFloat(cs(dd).fontSize) : null;
  const dtOpt = (dt && dd) ? +(dd.getBoundingClientRect().top - dt.getBoundingClientRect().bottom
    + (parseFloat(cs(dt).lineHeight) - parseFloat(cs(dt).fontSize)) / 2 + (lineBox - fs) / 2).toFixed(1) : null;
  return {
    scrollH: d.scrollHeight, screens: +(d.scrollHeight / d.clientHeight).toFixed(2),
    fs: dd ? cs(dd).fontSize : null, lhRatio: dd ? +(lineBox / fs).toFixed(3) : null,
    ddW: dd ? +dd.getBoundingClientRect().width.toFixed(1) : null,
    dtMb: dt ? parseFloat(cs(dt).marginBottom) : null,
    dtOpticalGap: dtOpt,
    structureRatio: (dtOpt && lineBox && fs) ? +(dtOpt / (lineBox - fs)).toFixed(2) : null,
    bodyPadL: parseFloat(cs(body).paddingLeft), bodyPadB: parseFloat(cs(body).paddingBottom),
    ddLeft: dd ? +dd.getBoundingClientRect().left.toFixed(1) : null,
    headNoLeft: headNo ? +headNo.getBoundingClientRect().left.toFixed(1) : null,
    alignDelta: (dd && headNo) ? +(dd.getBoundingClientRect().left - headNo.getBoundingClientRect().left).toFixed(1) : null,
    sumH: sum ? +sum.getBoundingClientRect().height.toFixed(1) : null,
    overX: d.scrollWidth - d.clientWidth,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
const out = { data: {} };
for (const id of IDS) {
  out.data[id] = {};
  for (const [name, css] of Object.entries(V)) {
    await p.goto(PAGE, { settleMs: 800 });
    await p.eval((sid) => { document.querySelector('.row[data-id="' + sid + '"]').click(); document.getElementById('detail').scrollTop = 0; }, id);
    await new Promise((r) => setTimeout(r, 120));
    if (css) { await p.eval((c) => { const s = document.createElement('style'); s.setAttribute('data-lab', '1'); s.textContent = c; document.head.appendChild(s); }, css); await new Promise((r) => setTimeout(r, 100)); }
    out.data[id][name] = await p.eval(PROBE);
  }
}
const agg = {};
for (const name of Object.keys(V)) {
  const a = IDS.map((id) => out.data[id][name]);
  const sh = a.map((x) => x.scrollH);
  const base = IDS.map((id) => out.data[id]['C0 当前树'].scrollH);
  const avg = (z) => z.reduce((x, y) => x + y, 0) / z.length;
  agg[name] = {
    min: Math.min(...sh), max: Math.max(...sh), avg: Math.round(avg(sh)),
    pct: +(100 * (avg(sh) - avg(base)) / avg(base)).toFixed(1),
    over: sh.filter((x) => x > 3800).length,
    screensMax: Math.max(...a.map((x) => x.screens)),
    fs: a[0].fs, lhRatio: a[0].lhRatio, ddW: a[0].ddW, dtMb: a[0].dtMb,
    dtOpticalGap: a[0].dtOpticalGap, structureRatio: a[0].structureRatio,
    bodyPadL: a[0].bodyPadL, ddLeft: a[0].ddLeft, headNoLeft: a[0].headNoLeft,
    alignDelta: a[0].alignDelta, sumH: a[0].sumH, overX: Math.max(...a.map((x) => x.overX)),
  };
}
out.agg = agg;
console.log('| 方案 | 字号 | 行高比 | dt下距 | 正文宽 | 内距 | scrollH min–max (avg) | Δ% | 超3800 | 屏数max | 标签光学间距 | 结构比 | dd左 | 对齐差 | summary高 |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [k, v] of Object.entries(agg)) {
  console.log(`| ${k} | ${v.fs} | ${v.lhRatio} | ${v.dtMb} | ${v.ddW} | ${v.bodyPadL} | ${v.min}–${v.max} (${v.avg}) | ${v.pct > 0 ? '+' : ''}${v.pct}% | ${v.over}/30 | ${v.screensMax} | ${v.dtOpticalGap} | ${v.structureRatio}× | ${v.ddLeft} | ${v.alignDelta} | ${v.sumH} |`);
}
writeFileSync(join(HERE, 'data-r3current.json'), JSON.stringify(out, null, 1));
await p.close();
await browser.close();
console.log('\nwritten data-r3current.json');
