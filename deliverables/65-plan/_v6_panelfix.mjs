// 裁决 5：最小改动的收益实测（只改 CSS/包 details，不改仓库，纯 DOM 动态注入）
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from './_v_srv.mjs';

const OUT = resolve('deliverables/65-plan/_v_out');
mkdirSync(OUT, { recursive: true });
const srv = await startServer({ root: resolve('.') });
const browser = await Browser.launch();
const res = [];

const probe = () => {
  const detail = document.getElementById('detail');
  const head = document.querySelector('.detail-head');
  const dRect = detail.getBoundingClientRect();
  const st = detail.scrollTop;
  const rel = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: +(r.top - dRect.top + st).toFixed(1), h: +r.height.toFixed(1) }; };
  const fields = [...document.querySelectorAll('#d-body .field')];
  return {
    contentH: detail.scrollHeight,
    clientH: detail.clientHeight,
    headH: +head.getBoundingClientRect().height.toFixed(1),
    screens: +(detail.scrollHeight / detail.clientHeight).toFixed(2),
    firstFieldTop: fields.length ? rel(fields[0]).top : null,
    viewer: rel(document.querySelector('.viewer')),
    stage: rel(document.querySelector('.viewer-stage')),
    parts: rel(document.querySelector('.parts')),
    // 首屏内可见的字段数
    visibleFields: fields.filter((el) => { const t = rel(el).top; return t < detail.clientHeight - 0; }).length,
  };
};

// 变体注入：D1 只压预览器；D2 只折叠 parts；D3 两者都做
const apply = (mode) => {
  const body = document.getElementById('d-body');
  if (mode === 'd1' || mode === 'd3') {
    const s = document.querySelector('.viewer-stage');
    if (s) { s.style.maxHeight = '200px'; s.style.overflow = 'auto'; }
  }
  if (mode === 'd2' || mode === 'd3') {
    const ul = document.querySelector('.parts');
    if (ul && !ul.closest('details')) {
      const d = document.createElement('details');
      d.className = 'parts-fold';
      const sm = document.createElement('summary');
      sm.textContent = '真实上站文案（主张句 / 按钮 / 空状态 / 错误状态）';
      ul.parentNode.insertBefore(d, ul);
      d.appendChild(sm);
      d.appendChild(ul);
    }
  }
  return true;
};

try {
  for (const sid of ['S01', 'S08', 'S13', 'S15', 'S24', 'S26', 'S30']) {
    for (const mode of ['base', 'd1', 'd2', 'd3']) {
      const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
      await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1100 });
      await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
      await page.eval((id) => { const r = document.querySelector('.row[data-id="' + id + '"]'); if (r) r.click(); }, sid);
      await sleep(700);
      if (mode !== 'base') { await page.eval(apply, mode); await sleep(350); }
      await page.eval('document.getElementById("detail").scrollTop = 0');
      await sleep(200);
      const m = await page.eval(probe);
      res.push({ id: sid, mode, ...m });
      console.log(`${sid} ${mode.padEnd(5)} contentH=${String(m.contentH).padStart(5)} screens=${m.screens} firstField=${String(m.firstFieldTop).padStart(7)} stage=${m.stage && m.stage.h} parts=${m.parts && m.parts.h} visibleFields=${m.visibleFields}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
  await srv.close();
}
writeFileSync(join(OUT, 'panel-fix.json'), JSON.stringify(res, null, 2));

console.log('\n=== 汇总（7 案）===');
for (const mode of ['base', 'd1', 'd2', 'd3']) {
  const g = res.filter((x) => x.mode === mode);
  const f = g.map((x) => x.firstFieldTop).sort((a, b) => a - b);
  const h = g.map((x) => x.contentH).sort((a, b) => a - b);
  console.log(`${mode.padEnd(5)} firstField min/p50/max = ${f[0]}/${f[3]}/${f[6]}  contentH min/max = ${h[0]}/${h[6]}  visibleFields avg=${(g.reduce((a,b)=>a+b.visibleFields,0)/g.length).toFixed(2)}`);
}
