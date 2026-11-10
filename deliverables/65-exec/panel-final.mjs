/* 交付物用的最终实测：改前 / 改后各 30 案 × 两档，一次跑完，输出一张对照表的数据。
   「改前」怎么来：不是拿旧 json 顶替（那是不同时刻的页面），而是在**同一个页面**上
   把三个折叠块强行展开、把 stage 的 200px 限高去掉、把间距恢复成原值 ——
   这正好等价于本次改动之前的结构（预览/tabs/缩略图/说明/闸门/上站文案全部平铺）。
   这样改前/改后是同一份 DOM、同一套字体、同一轮渲染，差异只来自本次改动本身。
   验证这个等价性：本脚本的 "before" 应该 ≈ panel-before.json 的旧数值（1,109–1,208）。 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
const SHOTS = join(OUT, 'shots-panel');
mkdirSync(SHOTS, { recursive: true });
const ids = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

/* 把页面还原成「改动之前」：展开全部折叠块 + 取消 stage 限高 + 恢复原间距。 */
function toBefore() {
  const st = document.createElement('style');
  st.id = '__before';
  st.textContent =
    '.viewer-stage{max-height:62vh !important}' +
    '.viewer{margin-bottom:22px !important}' +
    '.open-proto{margin-bottom:20px !important}' +
    '.fold{margin:0 !important;border-top:none !important}' +
    '.fold > summary{display:none !important}' +
    '.fold > .fold-body{padding:0 !important}' +
    '.fold > .fold-body > .parts{border-top:2px solid var(--ink) !important;margin-bottom:18px !important}' +
    '.fold > .fold-body > .gate-box{margin-bottom:20px !important}' +
    '.viewer-strip{margin-top:8px !important}';
  document.head.appendChild(st);
  document.querySelectorAll('#d-body details').forEach((d) => { if (d.classList.contains('fold')) d.open = true; });
  const d = document.getElementById('detail');
  d.scrollTop = 0;
  return true;
}

function measure() {
  const detail = document.getElementById('detail');
  const dr = detail.getBoundingClientRect();
  const st = detail.scrollTop;
  const f = document.querySelector('#d-body .field');
  const r = f.getBoundingClientRect();
  const stage = document.querySelector('.viewer-stage');
  const parts = document.querySelector('#d-body .parts');
  const gate = document.querySelector('#d-body .gate-box');
  const view = document.querySelector('#d-body .viewer');
  return {
    firstField: +(r.top - dr.top + st).toFixed(1),
    contentH: detail.scrollHeight,
    clientH: detail.clientHeight,
    stageH: stage ? +stage.getBoundingClientRect().height.toFixed(1) : null,
    stageScrollable: stage ? stage.scrollHeight > stage.clientHeight + 2 : null,
    partsH: parts ? +parts.getBoundingClientRect().height.toFixed(1) : null,
    gateH: gate ? +gate.getBoundingClientRect().height.toFixed(1) : null,
    viewerH: view ? +view.getBoundingClientRect().height.toFixed(1) : null,
    partsItems: parts ? parts.querySelectorAll('li').length : 0,
    hOv: detail.scrollWidth - detail.clientWidth,
  };
}

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), before: {}, after: {}, shots: [] };
try {
  for (const vp of [{ k: 'desktop', w: 1440, h: 900, mobile: false }, { k: 'mobile', w: 390, h: 844, mobile: true }]) {
    for (const phase of ['before', 'after']) {
      const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
      await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1500 });
      await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
      const rows = [];
      for (const id of ids) {
        await page.eval((sid) => { location.hash = '#' + sid; }, id);
        await sleep(430);
        if (phase === 'before') await page.eval(toBefore);
        await page.eval(() => { document.getElementById('detail').scrollTop = 0; });
        await sleep(80);
        rows.push({ id, ...(await page.eval(measure)) });
      }
      out[phase][vp.k] = rows;
      const ff = rows.map((r) => r.firstField), ch = rows.map((r) => r.contentH);
      console.log(`${phase.padEnd(6)} ${vp.k.padEnd(8)} firstField ${Math.min(...ff)}–${Math.max(...ff)} (avg ${Math.round(ff.reduce((a, b) => a + b, 0) / 30)})  contentH ${Math.min(...ch)}–${Math.max(...ch)} `);

      // 截图：S01 / S13 / S26
      for (const id of ['S01', 'S13', 'S26']) {
        await page.eval((sid) => { location.hash = '#' + sid; }, id);
        await sleep(500);
        if (phase === 'before') await page.eval(toBefore);
        await page.eval(() => { document.getElementById('detail').scrollTop = 0; });
        await sleep(200);
        const file = join(SHOTS, `${phase}-${vp.w}x${vp.h}-${id}.jpg`);
        const clip = vp.k === 'desktop' ? { x: 880, y: 0, width: 560, height: 900, scale: 1 } : undefined;
        await page.screenshot({ path: file, quality: 84, clip });
        out.shots.push({ file: file.replace(resolve('.'), '').replace(/\\/g, '/').replace(/^\//, ''), phase, vp: vp.k, id });
      }
      await page.close();
    }
  }
} finally { await browser.close(); await srv.close(); }

writeFileSync(join(OUT, 'panel-final.json'), JSON.stringify(out, null, 2));
console.log('\nshots:', out.shots.map((s) => s.file).join('\n       '));
console.log('wrote panel-final.json');
