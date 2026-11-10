// p-curbudget.mjs — 当前树的三类空间预算（30 案平均），每一项直接量，不做推断
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const PROBE = () => {
  const d = document.getElementById('detail');
  const dl = d.querySelector('#d-body .fields');
  const cs = getComputedStyle;
  const H = (e) => +e.getBoundingClientRect().height.toFixed(1);
  const kids = Array.from(dl.children);
  const flat = kids.filter((k) => !k.classList.contains('field-fold'));
  const folded = kids.filter((k) => k.classList.contains('field-fold'));
  const ddBodies = flat.map((f) => f.querySelector('dd'));
  const sums = folded.map((f) => f.querySelector('summary'));
  // dd 行盒与行数
  const lineInfo = (el) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (w.nextNode()) { if ((w.currentNode.nodeValue || '').trim()) nodes.push(w.currentNode); }
    const rg = document.createRange(); const lines = [];
    for (const n of nodes) { rg.selectNodeContents(n); for (const rc of rg.getClientRects()) { if (rc.height < 1) continue; const hit = lines.find((l) => Math.abs(l.top - rc.top) < 2); if (hit) hit.w += rc.width; else lines.push({ top: rc.top, w: rc.width }); } }
    return lines.length;
  };
  let ddLines = 0;
  ddBodies.forEach((e) => { ddLines += lineInfo(e); });
  const dtHs = flat.reduce((s, f) => { const t = f.querySelector('dt'); return s + (t ? H(t) : 0); }, 0);
  const dtMbs = flat.reduce((s, f) => { const t = f.querySelector('dt'); return s + (t ? parseFloat(cs(t).marginBottom) : 0); }, 0);
  const pads = kids.reduce((s, k) => s + parseFloat(cs(k).paddingTop) + parseFloat(cs(k).paddingBottom), 0);
  const borders = kids.reduce((s, k) => s + parseFloat(cs(k).borderBottomWidth), 0);
  const sumHs = sums.reduce((s, e) => s + H(e), 0);
  return {
    scrollH: d.scrollHeight, fieldsH: +H(dl).toFixed(1),
    nFlat: flat.length, nFolded: folded.length,
    flatH: +flat.reduce((s, f) => s + H(f), 0).toFixed(1),
    foldedH: +folded.reduce((s, f) => s + H(f), 0).toFixed(1),
    ddLines, ddLineBox: ddLines * 25.92,
    dtH: +dtHs.toFixed(1), dtMb: +dtMbs.toFixed(1),
    pads: +pads.toFixed(1), borders: +borders.toFixed(1), sumH: +sumHs.toFixed(1),
    ddW: flat.length ? +ddBodies[0].getBoundingClientRect().width.toFixed(1) : null,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await p.goto(PAGE, { settleMs: 1500 });
const arr = [];
for (const id of IDS) {
  await p.eval((sid) => { document.querySelector('.row[data-id="' + sid + '"]').click(); document.getElementById('detail').scrollTop = 0; }, id);
  await new Promise((r) => setTimeout(r, 110));
  arr.push({ id, ...(await p.eval(PROBE)) });
}
const avg = (k) => +(arr.reduce((s, x) => s + x[k], 0) / arr.length).toFixed(1);
const out = { rows: arr, avg: {} };
for (const k of ['scrollH', 'fieldsH', 'nFlat', 'nFolded', 'flatH', 'foldedH', 'ddLines', 'dtH', 'dtMb', 'pads', 'borders', 'sumH']) out.avg[k] = avg(k);
out.avg.ddLineBox = +(out.avg.ddLines * 25.92).toFixed(1);
console.log(JSON.stringify(out.avg, null, 1));
// 校验
const a = out.avg;
console.log('\n校验 fields = ddLineBox + dtH + dtMb + pads + borders + sumH:');
console.log(' ', a.ddLineBox, '+', a.dtH, '+', a.dtMb, '+', a.pads, '+', a.borders, '+', a.sumH, '=',
  (a.ddLineBox + a.dtH + a.dtMb + a.pads + a.borders + a.sumH).toFixed(1), ' vs 实测', a.fieldsH);
writeFileSync(join(HERE, 'data-curbudget.json'), JSON.stringify(out, null, 1));
await p.close();
await browser.close();
