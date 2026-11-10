// m23-no-fold.mjs — 「不折叠任何字段」路线的最优组合：排版收紧 + CTA 折，全字段平铺
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const HELPERS = `
  function addStyle(css) { var s = document.createElement('style'); s.setAttribute('data-lab','1'); s.textContent = css; document.head.appendChild(s); }
  function foldCta() {
    var fill = document.querySelector('#d-body .prompt-fill');
    var note = document.querySelector('#d-body .prompt-fill-note');
    if (!fill || !note) return;
    var d = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = '填写提示词开头（不填也能复制）';
    s.style.cssText = 'font-size:13px;cursor:pointer;padding:4px 0;line-height:1.6;color:var(--ink-2)';
    fill.parentNode.insertBefore(d, fill); d.appendChild(s); d.appendChild(fill); d.appendChild(note);
  }
  var T2 = '#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.5}#detail .field dt{margin-bottom:2px}';
  var T2W = T2 + '#d-body{padding-left:10px;padding-right:10px}';
`;

const V = {
  'N0 现状': '',
  'N1 CTA折': 'foldCta();',
  'N2 T2排版': 'addStyle(' + JSON.stringify('#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.5}#detail .field dt{margin-bottom:2px}') + ');',
  'N3 T2+CTA折': 'addStyle(' + JSON.stringify('#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.5}#detail .field dt{margin-bottom:2px}') + ');foldCta();',
  'N4 T2+加宽+CTA折': 'addStyle(' + JSON.stringify('#detail .field{padding:8px 0}#detail .field dd{font-size:15px;line-height:1.5}#detail .field dt{margin-bottom:2px}#d-body{padding-left:10px;padding-right:10px}') + ');foldCta();',
};

const MEASURE = () => {
  const d = document.getElementById('detail');
  const vh = d.clientHeight;
  const dl = document.querySelector('#d-body .fields');
  const fields = Array.from(dl.children).map((el) => {
    const dt = el.querySelector(':scope > dt');
    const r = el.getBoundingClientRect();
    return { top: +(r.top - d.getBoundingClientRect().top).toFixed(1), h: +r.height.toFixed(1), label: (dt || { textContent: '?' }).textContent.trim() };
  });
  return {
    scrollH: d.scrollHeight, screens: +(d.scrollHeight / vh).toFixed(2),
    hOv: d.scrollWidth - d.clientWidth,
    fieldsFully: fields.filter((f) => f.top >= 0 && f.top + f.h <= vh).length,
    firstFieldTop: fields[0].top,
    fieldsH: +dl.getBoundingClientRect().height.toFixed(1),
    // 所有字段都还在（一个都没折）
    fieldCount: fields.length,
  };
};

const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), vps: {} };
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  out.vps[vp.k] = {};
  for (const id of IDS) {
    out.vps[vp.k][id] = {};
    for (const [k, code] of Object.entries(V)) {
      await p.eval((sid) => {
        document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
        document.querySelectorAll('#d-body details[data-lab]').forEach((x) => x.remove());
        document.querySelector('.row[data-id="' + sid + '"]').click();
        document.getElementById('detail').scrollTop = 0;
      }, id);
      await new Promise((r) => setTimeout(r, 140));
      if (code) { await p.eval((payload) => { new Function(payload.h + payload.c)(); }, { h: HELPERS, c: code }); await new Promise((r) => setTimeout(r, 100)); }
      out.vps[vp.k][id][k] = await p.eval(MEASURE);
    }
  }
  await p.close();
}
writeFileSync(join(HERE, 'data-m23-nofold.json'), JSON.stringify(out, null, 1));
for (const vp of ['390', '414']) {
  for (const k of Object.keys(V)) {
    const a = Object.values(out.vps[vp]).map((x) => x[k]);
    const sh = a.map((x) => x.scrollH);
    console.log(`[${vp}] ${k.padEnd(16)} ${Math.min(...sh)}–${Math.max(...sh)} (avg ${Math.round(sh.reduce((p, q) => p + q, 0) / 30)}) ≤3800=${sh.filter((x) => x <= 3800).length}/30 字段数=${a[0].fieldCount} 首屏完整字段=${(a.reduce((p, q) => p + q.fieldsFully, 0) / 30).toFixed(1)}`);
  }
}
await browser.close();
