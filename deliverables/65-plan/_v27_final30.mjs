// 裁决 5 最终定稿：并发改动后 30 案全量，base vs 三档改动
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from './_v_srv.mjs';

const OUT = resolve('deliverables/65-plan/_v_out');
const srv = await startServer({ root: resolve('.') });
const browser = await Browser.launch();

const probe = () => {
  const d = document.getElementById('detail');
  const dR = d.getBoundingClientRect();
  const rel = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: +(r.top - dR.top + d.scrollTop).toFixed(1), h: +r.height.toFixed(1) }; };
  const fs = [...document.querySelectorAll('#d-body .field')];
  return {
    contentH: d.scrollHeight, screens: +(d.scrollHeight / d.clientHeight).toFixed(2),
    cta: rel(document.querySelector('.prompt-cta')),
    viewer: rel(document.querySelector('.viewer')),
    parts: rel(document.querySelector('.parts')),
    firstFieldTop: fs.length ? rel(fs[0]).top : null,
    visible: fs.filter((el) => rel(el).top < d.clientHeight).length,
  };
};
const apply = (mode) => {
  if (mode !== 'base') {
    const s = document.querySelector('.viewer-stage');
    if (s) { s.style.maxHeight = '200px'; s.style.overflowY = 'auto'; }
  }
  if (mode === 'd2' || mode === 'd3') {
    const ul = document.querySelector('.parts');
    if (ul && !ul.closest('details')) {
      const det = document.createElement('details');
      const sm = document.createElement('summary');
      sm.textContent = '真实上站文案';
      ul.parentNode.insertBefore(det, ul); det.appendChild(sm); det.appendChild(ul);
    }
  }
  if (mode === 'd3') {
    const f = document.querySelector('.prompt-fill');
    if (f && !f.closest('details')) {
      const det = document.createElement('details');
      const sm = document.createElement('summary');
      sm.textContent = '填写你的信息（不填也能复制）';
      f.parentNode.insertBefore(det, f); det.appendChild(sm); det.appendChild(f);
    }
  }
  return true;
};

const ids = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const out = [];
try {
  for (const mode of ['base', 'd1', 'd3']) {
    for (const sid of ids) {
      const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
      await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 800 });
      await page.eval((id) => { const r = document.querySelector('.row[data-id="' + id + '"]'); if (r) r.click(); }, sid);
      await sleep(550);
      if (mode !== 'base') { await page.eval(apply, mode); await sleep(250); }
      await page.eval('document.getElementById("detail").scrollTop = 0');
      await sleep(120);
      out.push({ sid, mode, ...(await page.eval(probe)) });
      await page.close();
    }
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'panel30-v2.json'), JSON.stringify(out, null, 2));

for (const mode of ['base', 'd1', 'd3']) {
  const g = out.filter((x) => x.mode === mode);
  const f = g.map((x) => x.firstFieldTop).sort((a, b) => a - b);
  const h = g.map((x) => x.contentH).sort((a, b) => a - b);
  const s = g.map((x) => x.screens).sort((a, b) => a - b);
  const v = g.map((x) => x.visible).sort((a, b) => a - b);
  console.log(`${mode.padEnd(5)} firstField ${f[0]}/${f[15]}/${f[29]}  contentH ${h[0]}/${h[29]}  screens ${s[0]}–${s[29]}  可见字段 min${v[0]} p50${v[15]} max${v[29]}`);
}
console.log('\nCTA 高度（base）:', [...new Set(out.filter(x=>x.mode==='base').map(x=>x.cta.h))].join(' '));
