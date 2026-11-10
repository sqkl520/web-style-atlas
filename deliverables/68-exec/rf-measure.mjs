// 68-exec 任务 1+3 的实测口。
// 目的：在**不改文件**的前提下，对 .row-family 的 13/15/16px 三档同时测：
//   (a) 闸门判据复算（body-size / body leading / hairlines）
//   (b) 任务书要求的 5 条不退化基线
// 做法：page.setViewport 真正切换视口（坑 1）；字号用 addStyleTag 注入（不改盘）；
//       判据直接用仓库自己的 probe() + judge()，不自己抄一份。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { probe } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/probe.mjs';
import { judge } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs';
import { serve } from './_srv.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT = join(HERE, 'rf-measure.json');

const SORTS = ['n', 'fr', 'thr', 'gate', 'built'];
const VARIANTS = [
  { key: 'base', css: null },
  { key: 's15', css: '.row-family { font-size: 15px; }' },
  { key: 's16', css: '.row-family { font-size: 16px; }' },
];

// 任务书指定必须复核的基线
const COLLECT = () => {
  const rc = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1), w: +b.width.toFixed(1) }; };
  const rows = [...document.querySelectorAll('.row')];
  const boxes = rows.map(rc);
  const vh = innerHeight;
  const complete = boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length;
  const fam = document.querySelector('.row-family');
  const famCS = fam ? getComputedStyle(fam) : null;
  const h1 = document.querySelector('h1');
  const rail = document.querySelector('.rail');
  const detail = document.querySelector('#detail');
  return {
    vw: innerWidth, vh,
    count: rows.length,
    firstTop: boxes.length ? boxes[0].top : null,
    firstH: boxes.length ? boxes[0].h : null,
    completeCards: complete,
    partialCards: boxes.filter((b) => b.top < vh && b.bottom > vh).length,
    h1px: h1 ? +getComputedStyle(h1).fontSize.replace('px', '') : null,
    railH: rail ? +rail.getBoundingClientRect().height.toFixed(1) : null,
    famFontSize: famCS ? famCS.fontSize : null,
    famLineHeight: famCS ? famCS.lineHeight : null,
    famClamp: famCS ? (famCS.webkitLineClamp || famCS.getPropertyValue('-webkit-line-clamp') || '') : null,
    famClampedH: fam ? +fam.getBoundingClientRect().height.toFixed(1) : null,
    famScrollH: fam ? fam.scrollHeight : null,
    // 被 clamp 吃掉的比例：scrollHeight > clientHeight 即截断
    famClientH: fam ? fam.clientHeight : null,
    detailHidden: detail ? detail.hidden : null,
    detailScrollH: detail ? detail.scrollHeight : null,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

// 数 CSSStyleSheet 里 font-size < 13px 的声明
const TINY = () => {
  let n = 0; const hits = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list) => {
      for (const r of list) {
        if (r.cssRules) { walk(r.cssRules); continue; }
        if (!r.style) continue;
        const v = r.style.getPropertyValue('font-size') || r.style.fontSize;
        if (!v) continue;
        for (const m of String(v).matchAll(/(\d+(?:\.\d+)?)px/g)) {
          const px = parseFloat(m[1]);
          if (px < 13) { n++; if (hits.length < 20) hits.push(r.selectorText + ' → ' + v); }
        }
      }
    };
    walk(rules);
  }
  return { count: n, hits };
};

const openDetail = () => {
  const row = document.querySelector('.row');
  if (!row) return { ok: false };
  row.click();
  return { ok: !document.querySelector('#detail').hidden };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await serve(ROOT, 8402);
const url = server.url + '/prototypes/_selection/index.html';
const out = { url, at: new Date().toISOString(), variants: {} };

const browser = await Browser.launch({ width: 1440, height: 900 });
try {
  for (const vp of [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }]) {
    for (const v of VARIANTS) {
      const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.w < 600 });
      await page.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.w < 600 });
      await page.goto(url, { settleMs: 1200 });
      await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
      if (v.css) {
        await page.eval(`(() => { const s = document.createElement('style'); s.id='__rf_inject'; s.textContent = ${JSON.stringify(v.css)}; document.head.appendChild(s); return true; })()`);
      }
      await sleep(500);

      const key = `${vp.w}x${vp.h}|${v.key}`;
      const rec = { vp, variant: v.key, css: v.css, sorts: {} };

      // 闸门：用仓库自己的 probe + judge
      const m = await page.eval(probe);
      const findings = judge(m, { width: vp.w });
      rec.gate = {
        bodySize: m.type.body ? m.type.body.size : null,
        bodyLeading: m.type.body ? m.type.body.leading : null,
        bodyFont: m.type.body ? m.type.body.font : null,
        hairlines: m.surfaces.hairlines,
        hairlineSamples: m.surfaces.hairlineSamples,
        measureChars: m.type.measureChars,
        findings: findings.map((f) => ({ level: f.level, id: f.id, message: f.message })),
      };

      // 五种排序 × 首屏完整卡
      for (const s of SORTS) {
        await page.eval(`(() => { const el = document.querySelector('#sort'); el.value = ${JSON.stringify(s)}; el.dispatchEvent(new Event('change', {bubbles:true})); window.scrollTo(0,0); return el.value; })()`);
        await sleep(420);
        const c = await page.eval(COLLECT);
        rec.sorts[s] = { firstTop: c.firstTop, firstH: c.firstH, complete: c.completeCards, partial: c.partialCards, count: c.count };
        if (s === 'n') rec.list = c;
      }

      // 详情面板 scrollH（回到默认排序，点第一张卡）
      await page.eval(`(() => { const el = document.querySelector('#sort'); el.value='n'; el.dispatchEvent(new Event('change', {bubbles:true})); window.scrollTo(0,0); return true; })()`);
      await sleep(420);
      const od = await page.eval(openDetail);
      await sleep(700);
      const det = await page.eval(() => {
        const d = document.querySelector('#detail');
        return d && !d.hidden ? { scrollH: d.scrollHeight, clientH: d.clientHeight } : null;
      });
      rec.detail = { opened: !!od.ok, ...(det || {}) };

      // 横向溢出 + <13px 声明数（在详情关闭态量一次、开启态量一次）
      await page.eval(() => { const d = document.querySelector('#detail'); if (d && !d.hidden) { d.hidden = true; document.body.classList.remove('detail-open'); } return true; });
      await sleep(300);
      rec.overflowClosed = (await page.eval(COLLECT)).overflowX;
      rec.tiny = await page.eval(TINY);

      out.variants[key] = rec;
      console.log(`[${key}] body=${rec.gate.bodySize}px lh=${rec.gate.bodyLeading} hair=${rec.gate.hairlines} ` +
        `card=${rec.list.firstTop}/${rec.list.firstH} full=${rec.list.completeCards} ` +
        `detScrollH=${rec.detail.scrollH ?? '-'} ovf=${rec.overflowClosed} tiny=${rec.tiny.count} ` +
        `gate=[${rec.gate.findings.map((f) => f.level[0] + ':' + f.id).join(' ') || 'clean'}]`);
      await page.close();
    }
  }
} finally {
  await browser.close().catch(() => {});
  server.server.close();
}

writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('\nwrote ' + OUT);
