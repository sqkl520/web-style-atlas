/* 65-exec 变体实验 2：在变体 1 的结论上细化——stage 高度 × 是否折 gate × 间距压缩。
   变体 1 已证明：
     · 62vh 在 1440×900 下从未生效（stage 内容高仅 323px，不是 558px），限高只省 123px 而非 200–350px；
     · 只做「stage 200 + 折 parts」首字段 max=741，**仍超 720**（差 21px）；
     · 再折 gate 后 max=670，才留出余量。
   本脚本要回答：该用 200 还是 220/240（预览越大越好），以及折 gate 的 summary 成本是否被算准。 */
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const MARGINS = '.viewer{margin-bottom:14px}.open-proto{margin-bottom:14px}.gate-box{margin-bottom:0}.parts{margin-bottom:14px}';

const VARIANTS = {
  '220': { stage: 220, foldParts: true, foldGate: true },
  '200+margins': { stage: 200, foldParts: true, foldGate: true, margins: true },
  '220+margins': { stage: 220, foldParts: true, foldGate: true, margins: true },
  '240+margins': { stage: 240, foldParts: true, foldGate: true, margins: true },
  '240+margins+strip48': { stage: 240, foldParts: true, foldGate: true, margins: true, strip: 48 },
};

function apply(arg) {
  const { stage, foldParts, foldGate, margins, strip } = arg;
  const M = '.viewer{margin-bottom:14px}.open-proto{margin-bottom:14px}.gate-box{margin-bottom:0}.parts{margin-bottom:14px}';
  const old = document.getElementById('__exp'); if (old) old.remove();
  let css = '.viewer-stage{max-height:' + stage + 'px}' + (margins ? M : '') +
    (strip ? '.viewer-strip button{width:' + strip + 'px}' : '');
  const st = document.createElement('style'); st.id = '__exp'; st.textContent = css;
  document.head.appendChild(st);
  const parts = document.querySelector('#d-body .parts');
  if (foldParts && parts && !parts.closest('details')) {
    const n = parts.querySelectorAll('li').length;
    const d = document.createElement('details');
    d.className = 'fold';
    d.innerHTML = '<summary>上站文案 ' + n + ' 段</summary>';
    parts.parentNode.insertBefore(d, parts); d.appendChild(parts);
  }
  const gate = document.querySelector('#d-body .gate-box');
  if (foldGate && gate && !gate.closest('details')) {
    const tags = [...gate.querySelectorAll('.tag')].map((t) => t.textContent).join(' ');
    const nums = (gate.querySelector('.gate-line span') || {}).textContent || '';
    const d = document.createElement('details');
    d.className = 'fold';
    d.innerHTML = '<summary>闸门 ' + tags + ' ' + nums + '</summary>';
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
    stageSh: stageEl ? stageEl.scrollHeight : null,
    stageScrollable: stageEl ? stageEl.scrollHeight > stageEl.clientHeight + 2 : null,
    folds: [...document.querySelectorAll('#d-body details')].map((d) => ({
      sum: ((d.querySelector('summary') || {}).textContent || '').trim().slice(0, 40),
      h: +d.getBoundingClientRect().height.toFixed(1),
    })),
  };
};

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), variants: {} };
try {
  for (const vp of [{ k: 'desktop', w: 1440, h: 900, mobile: false }, { k: 'mobile', w: 390, h: 844, mobile: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1400 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    for (const [name, v] of Object.entries(VARIANTS)) {
      const rows = [];
      for (const id of IDS) {
        await page.eval((sid) => { location.hash = '#' + sid; }, id);
        await sleep(360);
        await page.eval(apply, v);
        await sleep(80);
        await page.eval(() => { document.getElementById('detail').scrollTop = 0; });
        const m = await page.eval(probe);
        const hOv = await page.eval(() => {
          const d = document.getElementById('detail');
          return [d.scrollWidth - d.clientWidth, document.documentElement.scrollWidth - innerWidth];
        });
        rows.push({ id, ...m, hOv: hOv[0], docOv: hOv[1] });
      }
      const ff = rows.map((r) => r.firstField), ch = rows.map((r) => r.contentH);
      const key = vp.k + ':' + name;
      out.variants[key] = {
        firstField: { min: Math.min(...ff), max: Math.max(...ff), avg: Math.round(ff.reduce((a, b) => a + b, 0) / ff.length) },
        contentH: { min: Math.min(...ch), max: Math.max(...ch) },
        stageScrollable: rows.filter((r) => r.stageScrollable).length,
        hOvMax: Math.max(...rows.map((r) => r.hOv)), docOvMax: Math.max(...rows.map((r) => r.docOv)),
        rows,
      };
      console.log(`${key.padEnd(26)} firstField ${Math.min(...ff)}–${Math.max(...ff)} (avg ${out.variants[key].firstField.avg})  contentH ${Math.min(...ch)}–${Math.max(...ch)}  stage可滚 ${out.variants[key].stageScrollable}/30  hOv ${out.variants[key].hOvMax}`);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'panel-variants2.json'), JSON.stringify(out, null, 2));
console.log('\nwrote panel-variants2.json');
