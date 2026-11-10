/* 变体实验 6：确定「预览块怎么折」的最终形态。
   已确定的算术（现状，S15 最差案）：
     桌面 head 70.8 + body pad 18 + CTA 348.7 + 间距 ≈ 245（tabs/缩略图/说明/原型链接/两个折叠条）
     ⇒ 即使把大图收成 0px，也要 682px；只剩 ~38px 给可见的图。**图不能既可见又≤720。**
   所以图只能默认收起。本脚本比较三种收法在 1440 与 390 两档的实际像素：
     V1 只收 stage（tabs/缩略图/说明仍在外面）
     V2 收整个 viewer（tabs+stage+缩略图+说明 一起收）
     V3 收整个 viewer + parts/gate 也收 + 间距收紧
   另外验证 stage 展开后是否可滚（验收 3）。 */
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const VARIANTS = {
  'V1_stagefold_only': { whole: false },
  'V2_wholeviewer': { whole: true },
  'V3_wholeviewer_tight': { whole: true, tight: true },
  'V3b_wholeviewer_tight_compacthead': { whole: true, tight: true, head: true },
};

function apply(arg) {
  const { whole, tight, head } = arg;
  const T = '.viewer{margin-bottom:12px}.open-proto{margin-bottom:12px}.gate-box{margin-bottom:0}.parts{margin-bottom:0}';
  const H = '.detail-head{padding:8px 16px}.detail-title h2{font-size:20px}';
  const old = document.getElementById('__exp'); if (old) old.remove();
  const st = document.createElement('style'); st.id = '__exp';
  st.textContent = '.viewer-stage{max-height:200px}' + (tight ? T : '') + (head ? H : '');
  document.head.appendChild(st);

  const mk = (cls, sum) => {
    const d = document.createElement('details');
    d.className = 'fold ' + cls;
    d.innerHTML = '<summary>' + sum + '</summary>';
    return d;
  };
  const viewer = document.querySelector('#d-body .viewer');
  const stage = document.querySelector('#d-body .viewer-stage');
  if (whole && viewer && !viewer.closest('details')) {
    const d = mk('fold-view', '原型截图预览（1440 / 768 / 390 三档，点开看大图）');
    viewer.parentNode.insertBefore(d, viewer); d.appendChild(viewer);
  } else if (!whole && stage && !stage.closest('details')) {
    const d = mk('fold-shot', '展开大图（可滚动看全）');
    stage.parentNode.insertBefore(d, stage); d.appendChild(stage);
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
    stageInClosed: !!(stageEl && stageEl.closest('details') && !stageEl.closest('details').open),
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
      console.log(`${key.padEnd(42)} ff ${v2.firstField.min}–${v2.firstField.max} (avg ${v2.firstField.avg})  ch ${v2.contentH.min}–${v2.contentH.max}  超720:${v2.over720}/30  超3800:${v2.over3800}/30  hOv ${v2.hOvMax}`);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'panel-variants6.json'), JSON.stringify(out, null, 2));
console.log('\nwrote panel-variants6.json');
