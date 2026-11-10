// 现状直查：并发 Agent 落地了什么（不加任何 overlay）
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from './_v_srv.mjs';

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
    fillExists: !!document.querySelector('.prompt-fill'),
    fillOpen: (() => { const f = document.querySelector('.prompt-fill'); if (!f) return null; const det = f.closest('details'); return det ? det.open : 'not-in-details'; })(),
    partsInDetails: (() => { const p = document.querySelector('.parts'); if (!p) return null; const det = p.closest('details'); return det ? det.open : 'not-in-details'; })(),
    detailsCount: document.querySelectorAll('#d-body details').length,
    summaries: [...document.querySelectorAll('#d-body details > summary')].map((s) => s.textContent.trim().slice(0, 40)),
    fieldLabels: fs.map((el) => (el.querySelector('dt') || {}).textContent),
    firstFieldTop: fs.length ? rel(fs[0]).top : null,
    visible: fs.filter((el) => rel(el).top < d.clientHeight).length,
    stageH: rel(document.querySelector('.viewer-stage')) && rel(document.querySelector('.viewer-stage')).h,
    auditSummary: (() => { const el = [...document.querySelectorAll('#d-body .field')].find((x) => ((x.querySelector('dt') || {}).textContent || '').includes('审查点')); return el ? el.textContent.trim().slice(0, 120) : null; })(),
    famText: (() => { const el = document.querySelector('.row[data-id="S13"] .row-family'); return el ? el.textContent.slice(0, 60) : null; })(),
    famH: (() => { const el = document.querySelector('.row[data-id="S13"] .row-family'); return el ? +el.getBoundingClientRect().height.toFixed(1) : null; })(),
    rowH: (() => { const el = document.querySelector('.row[data-id="S13"]'); return el ? +el.getBoundingClientRect().height.toFixed(1) : null; })(),
  };
};
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1200 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(500);
  const list = await page.eval(probe);
  console.log('=== 列表页（未开详情）===');
  console.log('S13 row-family 高度:', list.famH, '  行高:', list.rowH);
  console.log('S13 row-family 文本:', list.famText);
  await page.eval(() => { const r = document.querySelector('.row[data-id="S13"]'); if (r) r.click(); });
  await sleep(800);
  const m = await page.eval(probe);
  console.log('\n=== 详情（S13）当前真实状态 ===');
  for (const k of ['contentH', 'screens', 'ctaH', 'stageH', 'firstFieldTop', 'visible', 'fillExists', 'fillOpen', 'partsInDetails', 'detailsCount']) console.log(`  ${k.padEnd(16)} ${m[k]}`);
  console.log('  summaries:', JSON.stringify(m.summaries));
  console.log('  fieldLabels:', JSON.stringify(m.fieldLabels));
  console.log('  auditSummary:', m.auditSummary);
  await page.close();
} finally { await browser.close(); await srv.close(); }
