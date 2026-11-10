/* 变体实验 7：最终形态定稿前的最后一轮。
   已知：
     · 折掉整个 viewer（默认收起）→ 桌面 455–505、移动 605–668，两档都过；
       但那样"预览图"要在展开后才存在，与验收 3「预览图仍能看全（限高后可滚）」的
       本意（图应当在、能滚）不符。所以先测「viewer 默认展开、stage 限高」能做到多少。
     · 桌面单靠 stage 限高 + 折 parts/gate/strip 时，V1 量到 601–651（但那是 stage 被收进
       details 的构型，多了 summary 又少了图）。
   本轮把 stage **留在外面**（可见、限高、可滚），只把 strip 与 parts/gate 收起来，
   量桌面能不能落在 720 以内；移动端同时量"viewer 整体默认收起"的构型。 */
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const VARIANTS = {
  // stage 可见 + 折 strip + 折 parts/gate
  'G1_s200_vis_strip': { stage: 200, foldStrip: true },
  'G2_s160_vis_strip': { stage: 160, foldStrip: true },
  'G3_s160_vis_strip_tight': { stage: 160, foldStrip: true, tight: true },
  'G4_s140_vis_keepstrip': { stage: 140, foldStrip: false, tight: true },
  // 移动端方案：整个 viewer 默认收起
  'G5_viewclosed': { viewClosed: true, tight: true },
  'G6_viewclosed_stripvis': { viewClosed: true, tight: true, stripInside: false },
};

function apply(arg) {
  const { stage, foldStrip, tight, viewClosed } = arg;
  const T = '.viewer{margin-bottom:12px}.open-proto{margin-bottom:12px}.gate-box{margin-bottom:0}.parts{margin-bottom:0}';
  const old = document.getElementById('__exp'); if (old) old.remove();
  const st = document.createElement('style'); st.id = '__exp';
  st.textContent = '.viewer-stage{max-height:' + stage + 'px}' + (tight ? T : '');
  document.head.appendChild(st);

  const mk = (cls, sum) => {
    const d = document.createElement('details');
    d.className = 'fold ' + cls;
    d.innerHTML = '<summary>' + sum + '</summary>';
    return d;
  };
  const viewer = document.querySelector('#d-body .viewer');
  if (viewClosed && viewer && !viewer.closest('details')) {
    const d = mk('fold-view', '原型截图预览（点开看 1440 / 768 / 390 三档）');
    viewer.parentNode.insertBefore(d, viewer); d.appendChild(viewer);
  }
  const stripEl = document.querySelector('#d-body .viewer-strip');
  if (foldStrip && stripEl && !stripEl.closest('details')) {
    const n = stripEl.querySelectorAll('button').length;
    const d = mk('fold-strip', n > 1 ? '更多截图 ' + n + ' 张（逐张切换）' : '截图说明');
    stripEl.parentNode.insertBefore(d, stripEl); d.appendChild(stripEl);
  }
  const parts = document.querySelector('#d-body .parts');
  if (parts && !parts.closest('details')) {
    const n = parts.querySelectorAll('li').length;
    const d = mk('fold-parts', '上站文案 ' + n + ' 段：主张句 / 按钮 / 空状态 / 错误状态');
    parts.parentNode.insertBefore(d, parts); d.appendChild(parts);
  }
  const gate = document.querySelector('#d-body .gate-box');
  if (gate && !gate.closest('details')) {
    const tags = [...gate.querySelectorAll('.tag')].map((t) => t.textContent).join(' · ');
    const nums = (gate.querySelector('.gate-line span') || {}).textContent || '';
    const d = mk('fold-gate', '闸门：' + tags + '　' + nums);
    gate.parentNode.insertBefore(d, gate); d.appendChild(gate);
  }
  return true;
}

const probe = () => {
  const detail = document.getElementById('detail');
  const dRect = detail.getBoundingClientRect();
  const st = detail.scrollTop;
  const rel = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: +(r.top - dRect.top + st).toFixed(1), h: +r.height.toFixed(1) };
  };
  const f = document.querySelector('#d-body .field');
  const stageEl = document.querySelector('.viewer-stage');
  return {
    contentH: detail.scrollHeight,
    firstField: f ? rel(f).top : null,
    stageH: stageEl ? +stageEl.getBoundingClientRect().height.toFixed(1) : null,
    stageScrollable: stageEl ? stageEl.scrollHeight > stageEl.clientHeight + 2 : null,
    hOv: detail.scrollWidth - detail.clientWidth,
    docOv: document.documentElement.scrollWidth - innerWidth,
  };
};

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), variants: {} };
try {
  for (const vp of [{ k: 'desktop', w: 1440, h: 900, mobile: false }, { k: 'mobile', w: 390, h: 844, mobile: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1500 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    for (const [name, v] of Object.entries(VARIANTS)) {
      const rows = [];
      for (const id of IDS) {
        await page.eval((sid) => { location.hash = '#' + sid; }, id);
        await sleep(400);
        await page.eval(apply, v);
        await sleep(90);
        await page.eval(() => { document.getElementById('detail').scrollTop = 0; });
        rows.push({ id, ...(await page.eval(probe)) });
      }
      const ff = rows.map((r) => r.firstField), ch = rows.map((r) => r.contentH);
      const key = vp.k + ':' + name;
      out.variants[key] = {
        firstField: { min: Math.min(...ff), max: Math.max(...ff), avg: Math.round(ff.reduce((a, b) => a + b, 0) / ff.length) },
        contentH: { min: Math.min(...ch), max: Math.max(...ch) },
        over720: rows.filter((r) => r.firstField > 720).length,
        over3800: rows.filter((r) => r.contentH > 3800).length,
        hOvMax: Math.max(...rows.map((r) => r.hOv)), docOvMax: Math.max(...rows.map((r) => r.docOv)),
        rows,
      };
      const v2 = out.variants[key];
      console.log(`${key.padEnd(38)} ff ${v2.firstField.min}–${v2.firstField.max} (avg ${v2.firstField.avg})  ch ${v2.contentH.min}–${v2.contentH.max}  超720:${v2.over720}/30  超3800:${v2.over3800}/30  hOv ${v2.hOvMax}`);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'panel-variants7.json'), JSON.stringify(out, null, 2));
console.log('\nwrote panel-variants7.json');
