/* 变体实验 10（最后一轮）：视口切换按钮放在折叠条**外面**还是里面。
   变体 9 把整个 .viewer 折起来（含 tabs），桌面 493–543、移动 605–668 都过。
   但那样「1440 / 768 / 390」三颗切换按钮也要先展开才看得到。
   如果把它们留在折叠条外面，多 38px（tabs 30 + margin 8），量一下余量还剩多少。
   判定：移动端仍 ≤720 且余量 ≥20px 就用「tabs 在外」——少一次点击就少一次打断。 */
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const VARIANTS = {
  'tabsOut_thumb64': { tabsOut: true, thumb: 64 },
  'tabsIn_thumb64': { tabsOut: false, thumb: 64 },
};

function apply(arg) {
  const { tabsOut, thumb } = arg;
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
    const sum = '<summary><img class="fold-thumb" src="' + src + '" alt="">' +
      '<span>原型截图预览（1440 / 768 / 390 三档）<br>点开看全图，限高可滚动</span></summary>';
    const d = mk('fold-view', sum);
    if (tabsOut) {
      const tabs = viewer.querySelector('.viewer-tabs');
      viewer.parentNode.insertBefore(d, viewer);
      // tabs 留在外面：把 viewer 的其余内容搬进 details
      if (tabs) viewer.parentNode.insertBefore(tabs, d);
      d.appendChild(viewer);
    } else {
      viewer.parentNode.insertBefore(d, viewer); d.appendChild(viewer);
    }
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
  const rel = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: +(r.top - dRect.top + st).toFixed(1), h: +r.height.toFixed(1) }; };
  const f = document.querySelector('#d-body .field');
  return {
    contentH: detail.scrollHeight,
    firstField: f ? rel(f).top : null,
    tabsVisible: rel(document.querySelector('#d-body .viewer-tabs')),
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
        over720: rows.filter((r) => r.firstField > 720).map((r) => r.id),
        over3800: rows.filter((r) => r.contentH > 3800).length,
        tabsVisible: rows[0].tabsVisible,
        hOvMax: Math.max(...rows.map((r) => r.hOv)), docOvMax: Math.max(...rows.map((r) => r.docOv)),
        rows,
      };
      const v2 = out.variants[key];
      console.log(`${key.padEnd(22)} ff ${v2.firstField.min}–${v2.firstField.max} (avg ${v2.firstField.avg})  ch ${v2.contentH.min}–${v2.contentH.max}  超720:${v2.over720.length}  超3800:${v2.over3800}  tabs=${v2.tabsVisible ? v2.tabsVisible.top + '/' + v2.tabsVisible.h : 'inside'}  hOv ${v2.hOvMax}`);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'panel-variants10.json'), JSON.stringify(out, null, 2));
console.log('\nwrote panel-variants10.json');
