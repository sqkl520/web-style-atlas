/* 变体实验 9：把大图折叠的 summary 改成「缩略图 + 文字」横向一行。
   F3（缩略图 64px，图在上、字在下）实测折叠条 96.8px，移动端首字段 max 713.2（余量 6.8px，太薄）。
   横向排之后折叠条高度应为 max(缩略图, 单行文字) + padding ≈ 72px，省 ~25px。
   本脚本量 64 / 56 / 48 三个缩略图尺寸，确认移动端能拿到 ≥25px 余量，且桌面余量更大。 */
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const VARIANTS = {
  row64: { thumb: 64 },
  row56: { thumb: 56 },
  row48: { thumb: 48 },
  row72: { thumb: 72 },
};

function apply(arg) {
  const { thumb } = arg;
  const T = '.viewer{margin-bottom:12px}.open-proto{margin-bottom:12px}.gate-box{margin-bottom:0}.parts{margin-bottom:0}';
  const old = document.getElementById('__exp'); if (old) old.remove();
  const st = document.createElement('style'); st.id = '__exp';
  st.textContent = '.viewer-stage{max-height:200px}' + T +
    '.fold>summary{display:flex;align-items:center;gap:10px;list-style-position:inside}' +
    '.fold-thumb{height:' + thumb + 'px;width:auto;display:block;border:1px solid var(--rule-2);flex:none}';
  document.head.appendChild(st);
  const mk = (cls, sum) => { const d = document.createElement('details'); d.className = 'fold ' + cls; d.innerHTML = sum; return d; };
  const viewer = document.querySelector('#d-body .viewer');
  if (viewer && !viewer.closest('details')) {
    const img = document.querySelector('#d-body .viewer-stage img');
    const src = img ? img.getAttribute('src') : '';
    const d = mk('fold-view',
      '<summary><img class="fold-thumb" src="' + src + '" alt="">' +
      '<span>原型截图预览（1440 / 768 / 390 三档）<br>点开看全图，限高 200px 可滚动</span></summary>');
    viewer.parentNode.insertBefore(d, viewer); d.appendChild(viewer);
  }
  const parts = document.querySelector('#d-body .parts');
  if (parts && !parts.closest('details')) {
    const n = parts.querySelectorAll('li').length;
    const d = mk('fold-parts', '<summary>上站文案 ' + n + ' 段：主张句 / 按钮 / 空状态 / 错误状态</summary>');
    parts.parentNode.insertBefore(d, parts); d.appendChild(parts);
  }
  const gate = document.querySelector('#d-body .gate-box');
  if (gate && !gate.closest('details')) {
    const tags = [...gate.querySelectorAll('.tag')].map((t) => t.textContent).join(' · ');
    const nums = (gate.querySelector('.gate-line span') || {}).textContent || '';
    const d = mk('fold-gate', '<summary>闸门：' + tags + '　' + nums + '</summary>');
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
  return {
    contentH: detail.scrollHeight,
    firstField: f ? rel(f).top : null,
    foldHeights: [...document.querySelectorAll('#d-body details')].map((d) => +d.getBoundingClientRect().height.toFixed(1)),
    thumbW: (() => { const t = document.querySelector('.fold-thumb'); return t ? +t.getBoundingClientRect().width.toFixed(1) : null; })(),
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
        thumbW: rows[0].thumbW, foldHeights: rows[0].foldHeights,
        rows,
      };
      const v2 = out.variants[key];
      console.log(`${key.padEnd(20)} ff ${v2.firstField.min}–${v2.firstField.max} (avg ${v2.firstField.avg})  ch ${v2.contentH.min}–${v2.contentH.max}  超720:${v2.over720}  超3800:${v2.over3800}  hOv ${v2.hOvMax}  thumbW ${v2.thumbW}  folds ${v2.foldHeights.join('/')}`);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'panel-variants9.json'), JSON.stringify(out, null, 2));
console.log('\nwrote panel-variants9.json');
