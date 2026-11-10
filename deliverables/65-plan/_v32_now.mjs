// 定稿：30 案当前真实状态（不再叠加任何改动）
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
  const kids = [...document.querySelectorAll('#d-body .fields > *')];
  const ai = kids.findIndex((k) => k.textContent.includes('审查点'));
  const ri = kids.findIndex((k) => k.textContent.includes('反 AI 味风险'));
  return {
    contentH: d.scrollHeight, screens: +(d.scrollHeight / d.clientHeight).toFixed(2),
    ctaTop: rel(document.querySelector('.prompt-cta')) && rel(document.querySelector('.prompt-cta')).top,
    stageH: rel(document.querySelector('.viewer-stage')) && rel(document.querySelector('.viewer-stage')).h,
    first: fs.length ? rel(fs[0]).top : null,
    second: fs.length > 1 ? rel(fs[1]).top : null,
    visible: fs.filter((el) => rel(el).top < d.clientHeight).length,
    detailsN: document.querySelectorAll('#d-body details').length,
    auditBeforeRisk: ai >= 0 && ri >= 0 ? ai < ri : null,
    hasFillDetails: !!document.querySelector('.prompt-fill') && !!document.querySelector('.prompt-fill').closest('details'),
  };
};
const ids = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));
const out = [];
try {
  for (const sid of ids) {
    const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 700 });
    await page.eval((id) => { const r = document.querySelector('.row[data-id="' + id + '"]'); if (r) r.click(); }, sid);
    await sleep(500);
    await page.eval('document.getElementById("detail").scrollTop = 0');
    await sleep(100);
    out.push({ sid, ...(await page.eval(probe)) });
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'panel30-now.json'), JSON.stringify(out, null, 2));

const q = (a, p) => a.slice().sort((x, y) => x - y)[p];
const f = out.map((x) => x.first), s = out.map((x) => x.second), h = out.map((x) => x.contentH),
  sc = out.map((x) => x.screens), v = out.map((x) => x.visible);
console.log('=== 当前真实状态（30 案，无任何 overlay）===');
console.log(`首字段      ${q(f,0)} / ${q(f,15)} / ${q(f,29)}`);
console.log(`第二字段    ${q(s,0)} / ${q(s,15)} / ${q(s,29)}`);
console.log(`面板内容高  ${q(h,0)} / ${q(h,29)}   →  ${q(sc,0)}–${q(sc,29)} 屏`);
console.log(`首屏可见字段 ${q(v,0)} / ${q(v,15)} / ${q(v,29)}`);
console.log(`details 数  ${[...new Set(out.map(x=>x.detailsN))].join(',')}`);
console.log(`ctaTop      ${[...new Set(out.map(x=>x.ctaTop))].join(',')}`);
console.log(`stageH      ${[...new Set(out.map(x=>x.stageH))].join(',')}`);
console.log(`audit 在 risk 之前: ${[...new Set(out.map(x=>x.auditBeforeRisk))].join(',')}`);
console.log(`.prompt-fill 已折叠: ${[...new Set(out.map(x=>x.hasFillDetails))].join(',')}`);
console.log(`\n首屏可见字段为 2 的案: ${v.filter(x=>x===2).length}/30`);
