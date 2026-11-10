// p-decompose.mjs — 把 66-audit 的 R2（= 乙折4字段 + CTA折 + 排版收紧）拆开归因
// 目的：验证「−48.7% 是压排版省下来的」这句话。R2 里排版到底贡献多少 px？
// 只读：折叠用原生 <details> 在运行时构造，样式用注入 <style>。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const SHOTS = join(HERE, 'shots');
mkdirSync(SHOTS, { recursive: true });
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

// 折叠助手逐字照抄 66-audit/m32-definitive.mjs:57-81（保证可比）
const HELPERS = `
  function addStyle(css){var s=document.createElement('style');s.setAttribute('data-lab','1');s.textContent=css;document.head.appendChild(s);}
  function foldField(f){
    var dt=f.querySelector(':scope > dt'),dd=f.querySelector(':scope > dd');
    if(!dt||!dd||f.dataset.folded)return;
    f.dataset.folded='1';
    var det=document.createElement('details');
    var s=document.createElement('summary');s.textContent=dt.textContent;
    s.style.cssText='font-size:13px;color:var(--ink-3);cursor:pointer;line-height:1.6;padding:4px 0;min-height:24px';
    dt.remove();det.appendChild(s);det.appendChild(dd);f.appendChild(det);
  }
  var LAB4=['布局与网格','可落地要点','关键视觉元素','动效与交互'];
  function foldLong(){
    document.querySelectorAll('#d-body .fields > .field').forEach(function(f){
      var dt=f.querySelector(':scope > dt');
      if(dt&&LAB4.indexOf(dt.textContent.trim())>=0)foldField(f);
    });
  }
  function foldCta(){
    var fill=document.querySelector('#d-body .prompt-fill');
    var note=document.querySelector('#d-body .prompt-fill-note');
    if(!fill||!note)return;
    var d=document.createElement('details');d.setAttribute('data-lab','1');
    var s=document.createElement('summary');s.textContent='填写提示词开头（不填也能复制）';
    s.style.cssText='font-size:13px;cursor:pointer;padding:6px 0;line-height:1.6;color:var(--ink-2);min-height:24px';
    fill.parentNode.insertBefore(d,fill);d.appendChild(s);d.appendChild(fill);d.appendChild(note);
  }
  // 审计的排版收紧（m32:83-84）
  var TYPO_AUDIT='#detail .field{padding:8px 0}#detail .field dd{line-height:1.5}'
    +'#detail .field dt{margin-bottom:2px}#d-body{padding-left:10px;padding-right:10px}';
  // 我的推荐：行高只动到 1.6、内距 10、dt 3、面板内距 14（每一项都留在安全区）
  var TYPO_MINE='#detail .field{padding:10px 0}#detail .field dd{line-height:1.6}'
    +'#detail .field dt{margin-bottom:3px}#d-body{padding-left:14px;padding-right:14px}'
    +'#detail .fields .field-fold{padding:10px 0}#d-body .field-fold .fold-body{line-height:1.65}';
  var TYPO_MINE_NOFOLD='#detail .field{padding:10px 0}#detail .field dd{line-height:1.6}'
    +'#detail .field dt{margin-bottom:3px}#d-body{padding-left:14px;padding-right:14px}';
`;

const VARIANTS = {
  'V0 现状': '',
  'L 只折 CTA': 'foldCta();',
  'H 只折 4 长字段': 'foldLong();',
  'I 乙 = 4折 + CTA折（不压排版）': 'foldLong();foldCta();',
  'R2 审计 = 乙 + 排版收紧(1.5/8/2/10)': 'addStyle(TYPO_AUDIT);foldLong();foldCta();',
  'J 我的推荐 = 乙 + 1.6/10/3/14': 'addStyle(TYPO_MINE);foldLong();foldCta();',
  'K 我的推荐（不折字段，只压排版）': 'addStyle(TYPO_MINE_NOFOLD);foldCta();',
  'M 只把行高 1.62→1.6（其余不动）': 'addStyle("#detail .field dd{line-height:1.6}");',
};

const PROBE = () => {
  const d = document.getElementById('detail');
  const dl = d.querySelector('#d-body .fields');
  const vh = d.clientHeight;
  const cs = (e) => getComputedStyle(e);
  const kids = Array.from(dl.children);
  const fields = kids.map((el) => {
    const r = el.getBoundingClientRect();
    return { top: +(r.top - d.getBoundingClientRect().top).toFixed(1), h: +r.height.toFixed(1) };
  });
  const dd0 = dl.querySelector('.field dd');
  const dt0 = dl.querySelector('.field dt');
  const f0 = dl.querySelector('.field');
  const ddr = dd0.getBoundingClientRect();
  const dtr = dt0 ? dt0.getBoundingClientRect() : null;
  const fsDd = parseFloat(cs(dd0).fontSize);
  const lhDd = parseFloat(cs(dd0).lineHeight);
  const padField = parseFloat(cs(f0).paddingTop);
  // 每行实际字数：Range 行盒
  const measure = (el) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let chars = 0; const nodes = [];
    while (w.nextNode()) { const t = w.currentNode.nodeValue || ''; const n = t.replace(/\s+/g, '').length; if (n) { chars += n; nodes.push(w.currentNode); } }
    const rg = document.createRange(); const lines = [];
    for (const n of nodes) { rg.selectNodeContents(n); for (const rc of rg.getClientRects()) { if (rc.height < 1) continue; const hit = lines.find((l) => Math.abs(l.top - rc.top) < 2); if (hit) hit.w += rc.width; else lines.push({ top: rc.top, w: rc.width }); } }
    return { chars, nLines: lines.length };
  };
  let allChars = 0, allLines = 0;
  Array.from(dl.querySelectorAll('.field dd')).forEach((e) => { const m = measure(e); allChars += m.chars; allLines += m.nLines; });
  const gaps = [];
  for (let i = 1; i < kids.length; i++) {
    const a = kids[i - 1].getBoundingClientRect(), b = kids[i].getBoundingClientRect();
    gaps.push(+(b.top - a.bottom).toFixed(1));
  }
  // 4 个折叠块 + CTA 的块高
  const g = (s) => { const e = d.querySelector(s); return e ? +e.getBoundingClientRect().height.toFixed(1) : null; };
  return {
    scrollH: d.scrollHeight, screens: +(d.scrollHeight / vh).toFixed(2),
    fieldsH: +dl.getBoundingClientRect().height.toFixed(1),
    firstFieldTop: fields.length ? fields[0].top : null,
    fieldsFully: fields.filter((f) => f.top >= 0 && f.top + f.h <= vh).length,
    dd: {
      fs: fsDd, lh: lhDd, lhRatio: +(lhDd / fsDd).toFixed(3), leading: +(lhDd - fsDd).toFixed(2),
      w: +ddr.width.toFixed(1), cap: Math.floor(ddr.width / fsDd),
      cpl: +(allChars / Math.max(1, allLines)).toFixed(1), lines: allLines,
      chars: allChars,
    },
    dt: dtr ? {
      fs: parseFloat(cs(dt0).fontSize), lh: parseFloat(cs(dt0).lineHeight).toFixed(2),
      mb: parseFloat(cs(dt0).marginBottom),
      gapToDd: +(ddr.top - dtr.bottom).toFixed(1),
      opticalGap: +(ddr.top - dtr.bottom + (parseFloat(cs(dt0).lineHeight) - parseFloat(cs(dt0).fontSize)) / 2 + (lhDd - fsDd) / 2).toFixed(1),
    } : null,
    field: { padT: padField, padB: parseFloat(cs(f0).paddingBottom), borderB: parseFloat(cs(f0).borderBottomWidth) },
    fieldGap: gaps.length ? gaps[0] : null,
    // 「字段间距 / 行间距」——结构可辨性比值
    structureRatio: +(gaps.length ? (gaps[0] + 1) / (lhDd - fsDd) : 0).toFixed(2),
    blocks: {
      head: g('.detail-head'), promptCta: g('.prompt-cta'), viewer: g('.viewer'),
      proto: g('.open-proto'), gate: g('.fold-gate'), parts: g('.fold-parts'),
      fields: g('.fields'), auditFold: g('#d-body .fields .field-fold'),
    },
    bodyPad: parseFloat(cs(document.getElementById('d-body')).paddingLeft),
    openDetails: d.querySelectorAll('#d-body details[open]').length,
    allDetails: d.querySelectorAll('#d-body details').length,
    overflowX: d.scrollWidth - d.clientWidth,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), variants: Object.keys(VARIANTS), data: {} };
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await p.goto(PAGE, { settleMs: 1600 });

for (const id of IDS) {
  out.data[id] = {};
  for (const [name, code] of Object.entries(VARIANTS)) {
    await p.eval((sid) => {
      document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
      document.querySelector('.row[data-id="' + sid + '"]').click();
      document.getElementById('detail').scrollTop = 0;
    }, id);
    await new Promise((r) => setTimeout(r, 110));
    if (code) { await p.eval((x) => { new Function(x.h + x.c)(); }, { h: HELPERS, c: code }); await new Promise((r) => setTimeout(r, 110)); }
    out.data[id][name] = await p.eval(PROBE);
  }
  const v0 = out.data[id]['V0 现状'], r2 = out.data[id]['R2 审计 = 乙 + 排版收紧(1.5/8/2/10)'], iy = out.data[id]['I 乙 = 4折 + CTA折（不压排版）'], j = out.data[id]['J 我的推荐 = 乙 + 1.6/10/3/14'];
  const pct = (a, b) => (100 * (b - a) / a).toFixed(1);
  console.log(`${id} V0=${v0.scrollH} 乙=${iy.scrollH}(${pct(v0.scrollH, iy.scrollH)}%) R2=${r2.scrollH}(${pct(v0.scrollH, r2.scrollH)}%) 排班贡献=${(100 * (r2.scrollH - iy.scrollH) / (v0.scrollH - iy.scrollH)).toFixed(0)}% 我的J=${j.scrollH}(${pct(v0.scrollH, j.scrollH)}%)`);
}

// 汇总
const agg = {};
for (const name of Object.keys(VARIANTS)) {
  const a = IDS.map((id) => out.data[id][name]);
  const sh = a.map((x) => x.scrollH);
  const base = IDS.map((id) => out.data[id]['V0 现状'].scrollH);
  agg[name] = {
    min: Math.min(...sh), max: Math.max(...sh), avg: Math.round(sh.reduce((x, y) => x + y, 0) / sh.length),
    deltaAvg: Math.round(sh.reduce((x, y) => x + y, 0) / sh.length - base.reduce((x, y) => x + y, 0) / base.length),
    pctAvg: +(100 * (sh.reduce((x, y) => x + y, 0) - base.reduce((x, y) => x + y, 0)) / base.reduce((x, y) => x + y, 0)).toFixed(1),
    over3800: sh.filter((x) => x > 3800).length,
    screensMax: Math.max(...a.map((x) => x.screens)),
    ffAvg: +(a.reduce((s, x) => s + x.fieldsFully, 0) / a.length).toFixed(1),
    lhRatio: a[0].dd.lhRatio, leading: a[0].dd.leading, cap: a[0].dd.cap, cpl: a[0].dd.cpl,
    dtMb: a[0].dt ? a[0].dt.mb : null, dtOpticalGap: a[0].dt ? a[0].dt.opticalGap : null,
    fieldPad: a[0].field.padT, bodyPad: a[0].bodyPad,
    fieldGap: a[0].fieldGap, structureRatio: a[0].structureRatio,
    details: a[0].allDetails,
  };
}
out.agg = agg;
console.log('\n| 变体 | scrollH min–max (avg) | Δavg | Δ% | 超3800 | 屏数max | 首屏完整字段 | lh比 | leading | 每行容量 | 每行实际字数 | dt下距 | 标签光学间距 | 字段内距 | 面板内距 | 字段间距/行间距 |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const [k, v] of Object.entries(agg)) {
  console.log(`| ${k} | ${v.min}–${v.max} (${v.avg}) | ${v.deltaAvg > 0 ? '+' : ''}${v.deltaAvg} | ${v.pctAvg > 0 ? '+' : ''}${v.pctAvg}% | ${v.over3800}/30 | ${v.screensMax} | ${v.ffAvg} | ${v.lhRatio} | ${v.leading} | ${v.cap} | ${v.cpl} | ${v.dtMb} | ${v.dtOpticalGap} | ${v.fieldPad} | ${v.bodyPad} | ${v.structureRatio} |`);
}
console.log('\nS01 blocks:', JSON.stringify(out.data.S01['V0 现状'].blocks));
console.log('S01 现状 fieldsH/scrollH:', out.data.S01['V0 现状'].fieldsH, out.data.S01['V0 现状'].scrollH);
console.log('S01 乙 blocks:', JSON.stringify(out.data.S01['I 乙 = 4折 + CTA折（不压排版）'].blocks));

await p.close();
writeFileSync(join(HERE, 'data-decompose.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('written data-decompose.json');
