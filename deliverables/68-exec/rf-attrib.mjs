// 归因：把「并发 Agent 新增的 #self-gate」与「我的 .row-family 字号」两笔账分开。
//   A = 现状原样
//   B = 仅隐藏 #self-gate（还原并发改动之前的页头）
//   B+15 / B+16 = 在 B 之上叠加 row-family 字号（这才是我的 delta）
// 全程只在运行时注入 <style>，不碰任何文件。
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
const HIDE_SELF = '#self-gate { display: none !important; }';
const CASES = [
  { key: 'A-asis', css: [] },
  { key: 'B-noself', css: [HIDE_SELF] },
  { key: 'B15', css: [HIDE_SELF, '.row-family { font-size: 15px; }'] },
  { key: 'B16', css: [HIDE_SELF, '.row-family { font-size: 16px; }'] },
];

const COLLECT = () => {
  const rc = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; };
  const rows = [...document.querySelectorAll('.row')];
  const boxes = rows.map(rc);
  const vh = innerHeight;
  const fam = document.querySelector('.row-family');
  const cs = fam ? getComputedStyle(fam) : null;
  const h1 = document.querySelector('h1');
  const sg = document.querySelector('#self-gate');
  return {
    vh, n: rows.length,
    firstTop: boxes[0] ? boxes[0].top : null,
    firstH: boxes[0] ? boxes[0].h : null,
    complete: boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    h1Size: h1 ? getComputedStyle(h1).fontSize : null,
    h1H: h1 ? +h1.getBoundingClientRect().height.toFixed(1) : null,
    h1Lines: h1 ? Math.round(h1.getBoundingClientRect().height / (parseFloat(getComputedStyle(h1).fontSize) * 1.14)) : null,
    mastH: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
    railH: +document.querySelector('.rail').getBoundingClientRect().height.toFixed(1),
    famSize: cs ? cs.fontSize : null,
    famH: fam ? +fam.getBoundingClientRect().height.toFixed(1) : null,
    famScrollH: fam ? fam.scrollHeight : null,
    famClientH: fam ? fam.clientHeight : null,
    famTruncated: fam ? fam.scrollHeight > fam.clientHeight + 1 : null,
    selfGateShown: sg ? getComputedStyle(sg).display !== 'none' : null,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = await serve(ROOT, 8404);
const url = server.url + '/prototypes/_selection/index.html';
const out = { url, at: new Date().toISOString(), cases: {} };

const browser = await Browser.launch({ width: 1440, height: 900 });
try {
  for (const vp of [{ w: 1440, h: 900 }, { w: 390, h: 844 }]) {
    for (const c of CASES) {
      const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.w < 600 });
      await page.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.w < 600 });
      await page.goto(url, { settleMs: 1400 });
      await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
      if (c.css.length) {
        await page.eval(`(() => { const s=document.createElement('style'); s.textContent=${JSON.stringify(c.css.join('\n'))}; document.head.appendChild(s); return true; })()`);
      }
      await sleep(600);
      const m = await page.eval(probe);
      const f = judge(m, { width: vp.w });
      const rec = {
        gate: { bodySize: m.type.body?.size, leading: m.type.body?.leading, hairlines: m.surfaces.hairlines, measureChars: m.type.measureChars },
        findings: f.map((x) => x.level + ':' + x.id),
        sorts: {},
      };
      for (const s of SORTS) {
        await page.eval(`(() => { const el=document.querySelector('#sort'); el.value=${JSON.stringify(s)}; el.dispatchEvent(new Event('change',{bubbles:true})); window.scrollTo(0,0); return true; })()`);
        await sleep(400);
        const cc = await page.eval(COLLECT);
        rec.sorts[s] = { firstTop: cc.firstTop, firstH: cc.firstH, complete: cc.complete };
        if (s === 'n') rec.base = cc;
      }
      // 详情面板 scrollH
      await page.eval(`(() => { const el=document.querySelector('#sort'); el.value='n'; el.dispatchEvent(new Event('change',{bubbles:true})); window.scrollTo(0,0); return true; })()`);
      await sleep(400);
      await page.eval(() => { document.querySelector('.row').click(); return true; });
      await sleep(700);
      rec.detail = await page.eval(() => { const d = document.querySelector('#detail'); return d && !d.hidden ? d.scrollHeight : null; });
      out.cases[`${vp.w}|${c.key}`] = rec;
      console.log(`[${vp.w} ${c.key}] body=${rec.gate.bodySize} hair=${rec.gate.hairlines} mast=${rec.base.mastH} h1=${rec.base.h1Lines}行/${rec.base.h1H} ` +
        `card=${rec.base.firstTop}/${rec.base.firstH} full=${rec.base.complete} det=${rec.detail} ovf=${rec.base.overflowX} ` +
        `fam=${rec.base.famSize} famH=${rec.base.famH} trunc=${rec.base.famTruncated} | ${rec.findings.join(',') || 'clean'}`);
      await page.close();
    }
  }
} finally {
  await browser.close().catch(() => {});
  server.server.close();
}
writeFileSync(join(HERE, 'rf-attrib.json'), JSON.stringify(out, null, 1));
console.log('\nwrote rf-attrib.json');
