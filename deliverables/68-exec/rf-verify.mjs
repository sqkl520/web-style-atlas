// 独立复核（不改盘）：
//   1) 三档当前状态 vs 任务书基线的偏差，以及偏差归因（逐块高度）
//   2) .row-family 13px vs 16px 的**净 delta**（同页 A/B，隔离别人的改动）
//   3) 五种排序 × 首屏完整卡、详情面板 scrollH、横向溢出、<13px 声明数
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { probe } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/probe.mjs';
import { judge } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs';
import { serve } from './_srv.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SORTS = ['n', 'fr', 'thr', 'gate', 'built'];

const MEASURE = () => {
  const rc = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1), w: +b.width.toFixed(1) }; };
  const desc = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).join('.') : '');
  const rows = [...document.querySelectorAll('.row')];
  const boxes = rows.map(rc);
  const vh = innerHeight;
  const fam = document.querySelector('.row-family');
  const fcs = fam ? getComputedStyle(fam) : null;
  const h1 = document.querySelector('h1');
  const mast = document.querySelector('.mast');
  const rail = document.querySelector('.rail');
  const sg = document.querySelector('#self-gate');
  return {
    vh,
    rowCount: rows.length,
    firstTop: boxes[0] ? boxes[0].top : null,
    firstH: boxes[0] ? boxes[0].h : null,
    complete: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    partial: boxes.filter((b) => b.top < vh && b.bottom > vh).length,
    h1Size: h1 ? +getComputedStyle(h1).fontSize.replace('px', '') : null,
    h1H: h1 ? +h1.getBoundingClientRect().height.toFixed(1) : null,
    mastH: +mast.getBoundingClientRect().height.toFixed(1),
    mastKids: [...mast.children].map((c) => ({ el: desc(c), ...rc(c) })),
    mastIdKids: [...document.querySelector('.mast-id').children].map((c) => ({ el: desc(c), ...rc(c) })),
    railH: +rail.getBoundingClientRect().height.toFixed(1),
    famSize: fcs ? fcs.fontSize : null,
    famLH: fcs ? fcs.lineHeight : null,
    famClamp: fcs ? (fcs.webkitLineClamp || '') : null,
    famH: fam ? +fam.getBoundingClientRect().height.toFixed(1) : null,
    famTruncated: fam ? fam.scrollHeight > fam.clientHeight + 1 : null,
    selfGate: sg ? { shown: getComputedStyle(sg).display !== 'none', ...rc(sg) } : null,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    docH: document.documentElement.scrollHeight,
  };
};

const TINY = () => {
  let n = 0; const hits = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list) => {
      for (const r of list) {
        if (r.cssRules) { walk(r.cssRules); continue; }
        if (!r.style) continue;
        const v = r.style.getPropertyValue('font-size');
        if (!v) continue;
        for (const m of String(v).matchAll(/(\d+(?:\.\d+)?)px/g)) {
          if (parseFloat(m[1]) < 13) { n++; if (hits.length < 20) hits.push((r.selectorText || '?') + ' → ' + v); }
        }
      }
    };
    walk(rules);
  }
  return { count: n, hits };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = await serve(ROOT, 8405);
const url = server.url + '/prototypes/_selection/index.html';
const out = { url, at: new Date().toISOString(), runs: {} };

const ASIS = null;                                   // 现状（=16px，别人已改）
const FORCE13 = '.row-family { font-size: 13px !important; line-height: 1.5 !important; }';
const VARIANTS = [{ key: 'asis16', css: ASIS }, { key: 'forced13', css: FORCE13 }];

const browser = await Browser.launch({ width: 1440, height: 900 });
try {
  for (const vp of [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }]) {
    for (const v of VARIANTS) {
      const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.w < 600 });
      await page.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.w < 600 });
      await page.goto(url, { settleMs: 1500 });
      await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
      if (v.css) await page.eval(`(() => { const s=document.createElement('style'); s.textContent=${JSON.stringify(v.css)}; document.head.appendChild(s); return true; })()`);
      await sleep(600);

      const m = await page.eval(probe);
      const f = judge(m, { width: vp.w });
      const rec = {
        gate: {
          bodySize: m.type.body?.size, bodyFam: m.type.body?.font, leading: m.type.body?.leading,
          hairlines: m.surfaces.hairlines, hairlineSamples: m.surfaces.hairlineSamples,
          measureChars: m.type.measureChars, sizes: m.type.sizes,
          findings: f.map((x) => ({ level: x.level, id: x.id, msg: x.message })),
        },
        sorts: {},
      };
      for (const s of SORTS) {
        await page.eval(`(() => { const el=document.querySelector('#sort'); el.value=${JSON.stringify(s)}; el.dispatchEvent(new Event('change',{bubbles:true})); window.scrollTo(0,0); return true; })()`);
        await sleep(400);
        const c = await page.eval(MEASURE);
        const rowId = await page.eval(() => document.querySelector('.row')?.dataset.id || null);
        rec.sorts[s] = { firstId: rowId, firstTop: c.firstTop, firstH: c.firstH, complete: c.complete, partial: c.partial };
        if (s === 'n') { rec.base = c; rec.tiny = await page.eval(TINY); }
      }
      // 详情面板
      await page.eval(`(() => { const el=document.querySelector('#sort'); el.value='n'; el.dispatchEvent(new Event('change',{bubbles:true})); window.scrollTo(0,0); return true; })()`);
      await sleep(400);
      await page.eval(() => { document.querySelector('.row').click(); return true; });
      await sleep(800);
      rec.detail = await page.eval(() => { const d=document.querySelector('#detail'); return d && !d.hidden ? { scrollH: d.scrollHeight, clientH: d.clientHeight } : null; });
      rec.overflowDetailOpen = await page.eval(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      out.runs[`${vp.w}|${v.key}`] = rec;

      const b = rec.base;
      console.log(`[${vp.w} ${v.key}] body=${rec.gate.bodySize}px(${rec.gate.bodyFam}) lh=${rec.gate.leading} hair=${rec.gate.hairlines} ` +
        `card=${b.firstTop}/${b.firstH} full=${b.complete} mast=${b.mastH} h1=${b.h1Size}px/${b.h1H} rail=${b.railH} ` +
        `det=${rec.detail?.scrollH ?? '-'} ovf=${b.overflowX} tiny=${rec.tiny.count} fam=${b.famSize}/${b.famLH}` +
        ` | ${rec.gate.findings.map((x) => x.level[0] + ':' + x.id).join(' ') || 'clean'}`);
      await page.close();
    }
  }
} finally {
  await browser.close().catch(() => {});
  server.server.close();
}
writeFileSync(join(HERE, 'rf-verify.json'), JSON.stringify(out, null, 1));
console.log('\nwrote rf-verify.json');
