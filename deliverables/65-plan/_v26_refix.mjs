// 裁决 5 重测：并发改动后（prompt-cta 加了两个输入框 +253px），最小改动还要多少
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
    contentH: d.scrollHeight, clientH: d.clientHeight,
    screens: +(d.scrollHeight / d.clientHeight).toFixed(2),
    cta: rel(document.querySelector('.prompt-cta')),
    fill: rel(document.querySelector('.prompt-fill')),
    viewer: rel(document.querySelector('.viewer')),
    stage: rel(document.querySelector('.viewer-stage')),
    parts: rel(document.querySelector('.parts')),
    proto: rel(document.querySelector('.open-proto')),
    gate: rel(document.querySelector('.gate-box')),
    firstFieldTop: fs.length ? rel(fs[0]).top : null,
    visible: fs.filter((el) => rel(el).top < d.clientHeight).length,
  };
};
const apply = (mode) => {
  if (mode.includes('d1')) {
    const s = document.querySelector('.viewer-stage');
    if (s) { s.style.maxHeight = '200px'; s.style.overflowY = 'auto'; }
  }
  if (mode.includes('d2')) {
    const ul = document.querySelector('.parts');
    if (ul && !ul.closest('details')) {
      const det = document.createElement('details');
      const sm = document.createElement('summary');
      sm.textContent = '真实上站文案（主张句 / 按钮 / 空状态 / 错误状态）';
      ul.parentNode.insertBefore(det, ul); det.appendChild(sm); det.appendChild(ul);
    }
  }
  if (mode.includes('d3')) {
    // 折叠 prompt-fill（两个输入框）
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

const ids = ['S01', 'S08', 'S13', 'S15', 'S24', 'S26', 'S30'];
const out = [];
try {
  for (const sid of ids) {
    for (const mode of ['base', 'd1', 'd2', 'd1+d2', 'd1+d2+d3']) {
      const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
      await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 900 });
      await page.eval((id) => { const r = document.querySelector('.row[data-id="' + id + '"]'); if (r) r.click(); }, sid);
      await sleep(600);
      if (mode !== 'base') { await page.eval(apply, mode); await sleep(300); }
      await page.eval('document.getElementById("detail").scrollTop = 0');
      await sleep(150);
      const m = await page.eval(probe);
      out.push({ sid, mode, ...m });
      console.log(`${sid} ${mode.padEnd(9)} cta=${m.cta.h} viewer=${m.viewer.h} parts=${m.parts.h} firstField=${String(m.firstFieldTop).padStart(7)} vis=${m.visible} screens=${m.screens}`);
      await page.close();
    }
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'panel-fix2.json'), JSON.stringify(out, null, 2));

console.log('\n=== 汇总 ===');
for (const mode of ['base', 'd1', 'd2', 'd1+d2', 'd1+d2+d3']) {
  const g = out.filter((x) => x.mode === mode);
  const f = g.map((x) => x.firstFieldTop).sort((a, b) => a - b);
  const h = g.map((x) => x.contentH).sort((a, b) => a - b);
  const v = g.map((x) => x.visible);
  console.log(`${mode.padEnd(9)} firstField ${f[0]}/${f[3]}/${f[6]}  contentH ${h[0]}/${h[6]}  可见字段 ${Math.min(...v)}/${Math.max(...v)}`);
}
console.log('\n=== base 的各段高度（S15 样本）===');
const b = out.find((x) => x.sid === 'S15' && x.mode === 'base');
for (const k of ['cta', 'viewer', 'stage', 'proto', 'gate', 'parts']) console.log(`  ${k.padEnd(8)} h=${b[k].h}`);
console.log('  fill 子块 h =', b.fill && b.fill.h);
