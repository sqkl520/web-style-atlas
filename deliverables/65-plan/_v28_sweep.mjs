// 裁决 5：找出「首屏 2 个字段」的精确门槛——stage 限高取多少
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
    first: fs.length ? rel(fs[0]).top : null,
    second: fs.length > 1 ? rel(fs[1]).top : null,
    third: fs.length > 2 ? rel(fs[2]).top : null,
    visible: fs.filter((el) => rel(el).top < d.clientHeight).length,
    stage: rel(document.querySelector('.viewer-stage')),
  };
};
const apply = (arg) => {
  const { h } = arg;
  const s = document.querySelector('.viewer-stage');
  if (s) { s.style.maxHeight = h + 'px'; s.style.overflowY = 'auto'; }
  const ul = document.querySelector('.parts');
  if (ul && !ul.closest('details')) {
    const det = document.createElement('details');
    const sm = document.createElement('summary');
    sm.textContent = '真实上站文案';
    ul.parentNode.insertBefore(det, ul); det.appendChild(sm); det.appendChild(ul);
  }
  const f = document.querySelector('.prompt-fill');
  if (f && !f.closest('details')) {
    const det = document.createElement('details');
    const sm = document.createElement('summary');
    sm.textContent = '填写你的信息（不填也能复制）';
    f.parentNode.insertBefore(det, f); det.appendChild(sm); det.appendChild(f);
  }
  return true;
};

const ids = ['S01', 'S08', 'S13', 'S15', 'S24', 'S26', 'S30'];
const out = [];
try {
  for (const h of [200, 170, 150, 120]) {
    for (const sid of ids) {
      const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
      await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 800 });
      await page.eval((id) => { const r = document.querySelector('.row[data-id="' + id + '"]'); if (r) r.click(); }, sid);
      await sleep(550);
      await page.eval(apply, { h }); await sleep(250);
      await page.eval('document.getElementById("detail").scrollTop = 0');
      await sleep(120);
      const m = await page.eval(probe);
      out.push({ stageH: h, sid, ...m });
      console.log(`stage=${h} ${sid} first=${String(m.first).padStart(7)} second=${String(m.second).padStart(7)} third=${String(m.third).padStart(7)} vis=${m.visible}`);
      await page.close();
    }
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'stage-sweep.json'), JSON.stringify(out, null, 2));

console.log('\n=== 各 stage 限高下，7 案的首屏可见字段数 ===');
for (const h of [200, 170, 150, 120]) {
  const g = out.filter((x) => x.stageH === h);
  const v = g.map((x) => x.visible);
  const sec = g.map((x) => x.second).sort((a, b) => a - b);
  const fst = g.map((x) => x.first).sort((a, b) => a - b);
  console.log(`stage=${h}px  first ${fst[0]}–${fst[6]}  second ${sec[0]}–${sec[6]}  可见 ${Math.min(...v)}/${Math.max(...v)}`);
}
