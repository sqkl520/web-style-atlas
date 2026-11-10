/* 诊断 3：并发改动后的现状基线。
   ⚠️ 事实：另一个 Agent 在本轮进行中改了 prompt-copy.js（05:05:56）与 style.css（05:05:25），
   给 .prompt-cta 增加了 .prompt-cta-row / .prompt-fill（两个输入框）/ .prompt-fill-note。
   于是「字段区之前」的高度与我开工时（panel-before.json）已经不同。
   我必须在**现状**下重新量一次基线，否则改后对比是在跟一个已经不存在的页面比。
   这个脚本量 30 案的现状，并把 .prompt-cta 的内部构成拆开，好把它的成本与我要改的
   viewer/parts/gate 分开记账。 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
mkdirSync(OUT, { recursive: true });
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const probe = () => {
  const detail = document.getElementById('detail');
  const dRect = detail.getBoundingClientRect();
  const st = detail.scrollTop;
  const rel = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: +(r.top - dRect.top + st).toFixed(1), h: +r.height.toFixed(1) };
  };
  const cta = document.querySelector('#d-body .prompt-cta');
  const f = document.querySelector('#d-body .field');
  return {
    contentH: detail.scrollHeight,
    clientH: detail.clientHeight,
    firstField: f ? rel(f).top : null,
    cta: rel(cta),
    ctaParts: cta ? [...cta.children].map((c) => ({ cls: c.className, ...rel(c) })) : [],
    blocks: [...document.querySelectorAll('#d-body > *')].map((el) => ({
      cls: String(el.className).split(' ')[0] || el.tagName.toLowerCase(), ...rel(el),
    })),
    details: [...document.querySelectorAll('#d-body details')].map((d) => ({
      sum: ((d.querySelector('summary') || {}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      open: d.open, ...rel(d),
    })),
    hOv: detail.scrollWidth - detail.clientWidth,
    docOv: document.documentElement.scrollWidth - innerWidth,
  };
};

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), desktop: [], mobile: [] };
try {
  for (const vp of [{ k: 'desktop', w: 1440, h: 900, mobile: false }, { k: 'mobile', w: 390, h: 844, mobile: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1400 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    for (const id of IDS) {
      await page.eval((sid) => { location.hash = '#' + sid; }, id);
      await sleep(400);
      await page.eval(() => { document.getElementById('detail').scrollTop = 0; });
      await sleep(60);
      const m = await page.eval(probe);
      m.id = id;
      out[vp.k].push(m);
      console.log(`[${vp.k}] ${id} contentH=${m.contentH} firstField=${m.firstField} cta=${m.cta.h} blocks=${m.blocks.map((b) => b.cls + ':' + b.h).join(',')}`);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'panel-now.json'), JSON.stringify(out, null, 2));
const s = (arr, k) => { const v = arr.map((x) => x[k]).filter((x) => typeof x === 'number'); return { min: Math.min(...v), max: Math.max(...v), avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length) }; };
console.log('\nNOW desktop firstField', JSON.stringify(s(out.desktop, 'firstField')), 'contentH', JSON.stringify(s(out.desktop, 'contentH')), 'cta', JSON.stringify(s(out.desktop, 'cta.h')));
console.log('NOW mobile  firstField', JSON.stringify(s(out.mobile, 'firstField')), 'contentH', JSON.stringify(s(out.mobile, 'contentH')), 'cta', JSON.stringify(s(out.mobile, 'cta.h')));
