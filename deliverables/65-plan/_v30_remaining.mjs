// 定稿：当前真实状态（family 已修 / parts+audit 已折叠）还差什么
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
    ctaH: rel(document.querySelector('.prompt-cta')) && rel(document.querySelector('.prompt-cta')).h,
    stageH: rel(document.querySelector('.viewer-stage')) && rel(document.querySelector('.viewer-stage')).h,
    firstFieldTop: fs.length ? rel(fs[0]).top : null,
    secondTop: fs.length > 1 ? rel(fs[1]).top : null,
    visible: fs.filter((el) => rel(el).top < d.clientHeight).length,
  };
};
const apply = (mode) => {
  if (mode === 's150' || mode === 's200' || mode === 'all') {
    const s = document.querySelector('.viewer-stage');
    const h = mode === 's200' ? 200 : 150;
    if (s) { s.style.maxHeight = h + 'px'; s.style.overflowY = 'auto'; }
  }
  if (mode === 'all' || mode === 'fill') {
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
  for (const mode of ['base', 'fill', 's150', 'all']) {
    for (const sid of ids) {
      const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
      await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 700 });
      await page.eval((id) => { const r = document.querySelector('.row[data-id="' + id + '"]'); if (r) r.click(); }, sid);
      await sleep(500);
      if (mode !== 'base') { await page.eval(apply, mode); await sleep(220); }
      await page.eval('document.getElementById("detail").scrollTop = 0');
      await sleep(100);
      out.push({ sid, mode, ...(await page.eval(probe)) });
      await page.close();
    }
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'panel30-final.json'), JSON.stringify(out, null, 2));

console.log('=== 当前真实状态 + 剩余改动（30 案）===');
for (const mode of ['base', 'fill', 's150', 'all']) {
  const g = out.filter((x) => x.mode === mode);
  const f = g.map((x) => x.firstFieldTop).sort((a, b) => a - b);
  const sec = g.map((x) => x.secondTop).sort((a, b) => a - b);
  const h = g.map((x) => x.contentH).sort((a, b) => a - b);
  const s = g.map((x) => x.screens).sort((a, b) => a - b);
  const v = g.map((x) => x.visible).sort((a, b) => a - b);
  console.log(`${mode.padEnd(6)} first ${f[0]}/${f[15]}/${f[29]}  second ${sec[0]}/${sec[15]}/${sec[29]}`);
  console.log(`       contentH ${h[0]}/${h[29]}  screens ${s[0]}–${s[29]}  可见字段 ${v[0]}/${v[15]}/${v[29]}`);
}
