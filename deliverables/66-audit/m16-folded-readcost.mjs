// m16-folded-readcost.mjs — 折叠方案的「展开成本」：从首屏滚到底、要展开几次、展开后总高
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const HELPERS = `
  function foldField(f) {
    var dt = f.querySelector(':scope > dt'), dd = f.querySelector(':scope > dd');
    if (!dt || !dd || f.dataset.folded) return;
    f.dataset.folded = '1';
    var det = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = dt.textContent;
    s.style.cssText = 'font-size:13px;color:var(--ink-3);cursor:pointer;line-height:1.6;padding:2px 0';
    dt.remove(); det.appendChild(s); det.appendChild(dd); f.appendChild(det);
  }
  var LAB4 = ['布局与网格','可落地要点','关键视觉元素','动效与交互'];
  function foldLabels(list) {
    document.querySelectorAll('#d-body .fields > .field').forEach(function (f) {
      var dt = f.querySelector(':scope > dt');
      if (dt && list.indexOf(dt.textContent.trim()) >= 0) foldField(f);
    });
  }
  function foldCta() {
    var fill = document.querySelector('#d-body .prompt-fill');
    var note = document.querySelector('#d-body .prompt-fill-note');
    if (!fill || !note) return;
    var d = document.createElement('details');
    var s = document.createElement('summary'); s.textContent = '填写提示词开头（不填也能复制）';
    s.style.cssText = 'font-size:13px;cursor:pointer;padding:4px 0;line-height:1.6;color:var(--ink-2)';
    fill.parentNode.insertBefore(d, fill); d.appendChild(s); d.appendChild(fill); d.appendChild(note);
  }
`;

// 折叠态 vs 全部展开态的总高（= 用户「读完全部」的真实成本）
const MEASURE = () => {
  const d = document.getElementById('detail');
  d.scrollTop = 0;
  const folded = d.scrollHeight;
  const chain = document.querySelectorAll('#d-body details');
  chain.forEach((x) => { x.open = true; });
  return { foldedH: folded, expandedH: d.scrollHeight, detailCount: chain.length };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { measuredAt: new Date().toISOString(), data: {} };
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  out.data[vp.k] = {};
  for (const id of ['S01', 'S13', 'S26']) {
    out.data[vp.k][id] = {};
    for (const [k, code] of [['baseline', ''], ['VH', 'foldLabels(LAB4);foldCta();'], ['VG', `foldLabels(LAB4.concat(['字体策略']));foldCta();`]]) {
      await p.eval((sid) => {
        document.querySelectorAll('style[data-lab]').forEach((s) => s.remove());
        document.querySelectorAll('#d-body details[data-lab]').forEach((d) => d.remove());
        document.querySelector('.row[data-id="' + sid + '"]').click();
        document.getElementById('detail').scrollTop = 0;
      }, id);
      await new Promise((r) => setTimeout(r, 150));
      if (code) { await p.eval((payload) => { new Function(payload.h + payload.c)(); }, { h: HELPERS, c: code }); await new Promise((r) => setTimeout(r, 120)); }
      const m = await p.eval(MEASURE);
      out.data[vp.k][id][k] = m;
      console.log(`[${vp.k}] ${id} ${k}: 折叠态 ${m.foldedH} → 全展开 ${m.expandedH}（${m.detailCount} 个 details）`);
    }
  }
  await p.close();
}
writeFileSync(join(HERE, 'data-m16-readcost.json'), JSON.stringify(out, null, 1));
await browser.close();
