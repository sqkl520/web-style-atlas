// 裁决 5 全量：30 案 base vs 最小改动
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
  const cta = document.querySelector('.prompt-cta');
  return {
    contentH: d.scrollHeight, clientH: d.clientHeight,
    screens: +(d.scrollHeight / d.clientHeight).toFixed(2),
    firstFieldTop: fs.length ? rel(fs[0]).top : null,
    ctaTop: cta ? rel(cta).top : null,
    visibleFieldLabels: fs.filter((el) => rel(el).top < d.clientHeight).map((el) => (el.querySelector('dt') || {}).textContent),
    nFields: fs.length,
  };
};
const apply = () => {
  const s = document.querySelector('.viewer-stage');
  if (s) { s.style.maxHeight = '200px'; s.style.overflow = 'auto'; }
  const ul = document.querySelector('.parts');
  if (ul && !ul.closest('details')) {
    const det = document.createElement('details');
    const sm = document.createElement('summary');
    sm.textContent = '真实上站文案（主张句 / 按钮 / 空状态 / 错误状态）';
    ul.parentNode.insertBefore(det, ul);
    det.appendChild(sm); det.appendChild(ul);
  }
  return true;
};

const ids = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const out = [];
try {
  for (const mode of ['base', 'fix']) {
    for (const sid of ids) {
      const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
      await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 900 });
      await page.eval((id) => { const r = document.querySelector('.row[data-id="' + id + '"]'); if (r) r.click(); }, sid);
      await sleep(600);
      if (mode === 'fix') { await page.eval(apply); await sleep(300); }
      await page.eval('document.getElementById("detail").scrollTop = 0');
      await sleep(150);
      const m = await page.eval(probe);
      out.push({ id: sid, mode, ...m });
      await page.close();
    }
  }
} finally { await browser.close(); await srv.close(); }

writeFileSync(join(OUT, 'panel30.json'), JSON.stringify(out, null, 2));
for (const mode of ['base', 'fix']) {
  const g = out.filter((x) => x.mode === mode);
  const f = g.map((x) => x.firstFieldTop).sort((a, b) => a - b);
  const h = g.map((x) => x.contentH).sort((a, b) => a - b);
  const screens = g.map((x) => x.screens).sort((a, b) => a - b);
  const vis = g.map((x) => x.visibleFieldLabels.length).sort((a, b) => a - b);
  console.log(`${mode}: firstField min ${f[0]} / p50 ${f[15]} / max ${f[29]}`);
  console.log(`      contentH min ${h[0]} / max ${h[29]}  screens min ${screens[0]} / max ${screens[29]}`);
  console.log(`      首屏可见字段数 min ${vis[0]} / p50 ${vis[15]} / max ${vis[29]}`);
  console.log(`      ctaTop 恒定: ${new Set(g.map((x) => x.ctaTop)).size === 1} (${g[0].ctaTop})`);
}
