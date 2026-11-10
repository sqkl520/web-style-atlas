// 任务 1 的决策数据：13 / 15 / 16px 三档，在**当前已稳定的文件**上同页 A/B。
// 产出：每档 × 每视口的闸门 findings（用仓库自己的 probe+judge）、基线五条、以及
// line-clamp 在 16px 下是否仍成立（可见字数 / 省略号）。
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
const CASES = [
  { k: '13px', css: '.row-family{font-size:13px!important;line-height:1.5!important}' },
  { k: '15px', css: '.row-family{font-size:15px!important;line-height:1.5!important}' },
  { k: '16px', css: '' }, // 现状即 16px / 1.45
];

// 每个 .row-family 的两行 clamp 实际露出多少字（用 Range 逐字量），以及是否出现省略号
const CLAMP = () => {
  const out = [];
  const spans = [...document.querySelectorAll('.row-family')];
  for (const s of spans) {
    const cs = getComputedStyle(s);
    const lh = parseFloat(cs.lineHeight);
    const lines = Math.round(s.clientHeight / lh);
    out.push({
      chars: s.textContent.length,
      clientH: s.clientHeight,
      scrollH: s.scrollHeight,
      lh,
      lines,
      truncated: s.scrollHeight > s.clientHeight + 1,
      clamped: cs.webkitLineClamp || cs.getPropertyValue('-webkit-line-clamp'),
    });
  }
  const trunc = out.filter((o) => o.truncated).length;
  const lines = {};
  for (const o of out) lines[o.lines] = (lines[o.lines] || 0) + 1;
  return {
    n: out.length,
    truncatedCount: trunc,
    lineHistogram: lines,
    chars: { min: Math.min(...out.map((o) => o.chars)), max: Math.max(...out.map((o) => o.chars)) },
    sample: out.slice(0, 3),
  };
};

const MEASURE = () => {
  const rc = (e) => { const b = e.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1), bottom: +b.bottom.toFixed(1) }; };
  const rows = [...document.querySelectorAll('.row')].map(rc);
  const vh = innerHeight;
  const fam = document.querySelector('.row-family');
  const h1 = document.querySelector('h1');
  return {
    vh,
    firstTop: rows[0].top, firstH: rows[0].h,
    complete: rows.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length,
    h1: +getComputedStyle(h1).fontSize.replace('px', ''),
    rail: +document.querySelector('.rail').getBoundingClientRect().height.toFixed(1),
    mast: +document.querySelector('.mast').getBoundingClientRect().height.toFixed(1),
    famSize: getComputedStyle(fam).fontSize,
    famLH: getComputedStyle(fam).lineHeight,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = await serve(ROOT, 8409);
const url = server.url + '/prototypes/_selection/index.html';
const out = { url, at: new Date().toISOString(), runs: {} };
const browser = await Browser.launch({ width: 1440, height: 900 });
try {
  for (const vp of [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }]) {
    for (const c of CASES) {
      const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.w < 600 });
      await page.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.w < 600 });
      await page.goto(url, { settleMs: 2000 });
      await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
      if (c.css) await page.eval(`(() => { const s=document.createElement('style'); s.textContent=${JSON.stringify(c.css)}; document.head.appendChild(s); return true; })()`);
      await sleep(900);
      const m = await page.eval(probe);
      const f = judge(m, { width: vp.w });
      const rec = {
        bodySize: m.type.body?.size, leading: m.type.body?.leading,
        hairlines: m.surfaces.hairlines, measureChars: m.type.measureChars,
        findings: f.map((x) => ({ level: x.level, id: x.id, msg: x.message })),
        sorts: {},
      };
      rec.clamp = await page.eval(CLAMP);
      for (const s of SORTS) {
        await page.eval(`(() => { const el=document.querySelector('#sort'); el.value=${JSON.stringify(s)}; el.dispatchEvent(new Event('change',{bubbles:true})); window.scrollTo(0,0); return true; })()`);
        await sleep(450);
        const mm = await page.eval(MEASURE);
        const id = await page.eval(() => document.querySelector('.row')?.dataset.id);
        rec.sorts[s] = { id, top: mm.firstTop, h: mm.firstH, complete: mm.complete };
        if (s === 'n') rec.base = mm;
      }
      await page.eval(`(() => { const el=document.querySelector('#sort'); el.value='n'; el.dispatchEvent(new Event('change',{bubbles:true})); window.scrollTo(0,0); return true; })()`);
      await sleep(400);
      await page.eval(() => { document.querySelector('.row').click(); return true; });
      await sleep(800);
      rec.detail = await page.eval(() => { const d=document.querySelector('#detail'); return d && !d.hidden ? d.scrollHeight : null; });
      out.runs[`${vp.w}|${c.k}`] = rec;
      const g = rec.findings.map((x) => x.level[0] + ':' + x.id).join(' ') || 'clean';
      console.log(`[${vp.w} ${c.k}] body=${rec.bodySize} lh=${rec.leading} hair=${rec.hairlines} ` +
        `card=${rec.base.firstTop}/${rec.base.firstH} full=${rec.sorts.n.complete} det=${rec.detail} ` +
        `fam=${rec.base.famSize}/${rec.base.famLH} clampLines=${JSON.stringify(rec.clamp.lineHistogram)} trunc=${rec.clamp.truncatedCount}/${rec.clamp.n} ` +
        `| ${g}`);
      await page.close();
    }
  }
} finally {
  await browser.close().catch(() => {});
  server.server.close();
}
writeFileSync(join(HERE, 'rf-decide.json'), JSON.stringify(out, null, 1));
console.log('\nwrote rf-decide.json');
