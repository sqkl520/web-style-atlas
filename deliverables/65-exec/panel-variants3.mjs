/* 65-exec 变体实验 3：只针对 390×844。
   变体 2 结果：200+margins 在移动端 max=717.3，**离 720 只剩 2.7px**——余量太薄，
   一次字体回退或中文字重变化就会破线。而且 390 档 0.8 屏严格说是 675px（844×0.8）。
   本脚本找移动端的第二档余量：stage 更矮 + 面板内边距收紧 + 缩略图变小。
   桌面不动（240px stage 在桌面已有 24px 余量）。 */
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const VARIANTS = {
  'm200': { stage: 200, fold: true, margins: true },
  'm180': { stage: 180, fold: true, margins: true },
  'm180+pad': { stage: 180, fold: true, margins: true, pad: true },
  'm160+pad': { stage: 160, fold: true, margins: true, pad: true },
  'm180+pad+head': { stage: 180, fold: true, margins: true, pad: true, head: true },
  'm160+pad+head': { stage: 160, fold: true, margins: true, pad: true, head: true },
};

function apply(arg) {
  const { stage, fold, margins, pad, head } = arg;
  const M = '.viewer{margin-bottom:14px}.open-proto{margin-bottom:14px}.gate-box{margin-bottom:0}.parts{margin-bottom:14px}';
  const PAD = '.detail-body{padding:12px 16px 60px}.detail-head{padding:10px 14px}';
  const old = document.getElementById('__exp'); if (old) old.remove();
  const css = '.viewer-stage{max-height:' + stage + 'px}' + (margins ? M : '') + (pad ? PAD : '') +
    (head ? '.detail-title h2{font-size:20px}' : '');
  const st = document.createElement('style'); st.id = '__exp'; st.textContent = css;
  document.head.appendChild(st);
  const parts = document.querySelector('#d-body .parts');
  if (fold && parts && !parts.closest('details')) {
    const n = parts.querySelectorAll('li').length;
    const d = document.createElement('details'); d.className = 'fold';
    d.innerHTML = '<summary>上站文案 ' + n + ' 段</summary>';
    parts.parentNode.insertBefore(d, parts); d.appendChild(parts);
  }
  const gate = document.querySelector('#d-body .gate-box');
  if (fold && gate && !gate.closest('details')) {
    const tags = [...gate.querySelectorAll('.tag')].map((t) => t.textContent).join(' ');
    const nums = (gate.querySelector('.gate-line span') || {}).textContent || '';
    const d = document.createElement('details'); d.className = 'fold';
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
    stageScrollable: stageEl ? stageEl.scrollHeight > stageEl.clientHeight + 2 : null,
    hOv: detail.scrollWidth - detail.clientWidth,
    docOv: document.documentElement.scrollWidth - innerWidth,
  };
};

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), variants: {} };
try {
  const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
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
      rows.push({ id, ...(await page.eval(probe)) });
    }
    const ff = rows.map((r) => r.firstField), ch = rows.map((r) => r.contentH);
    out.variants[name] = {
      firstField: { min: Math.min(...ff), max: Math.max(...ff), avg: Math.round(ff.reduce((a, b) => a + b, 0) / ff.length) },
      contentH: { min: Math.min(...ch), max: Math.max(...ch) },
      over720: rows.filter((r) => r.firstField > 720).map((r) => r.id),
      over675: rows.filter((r) => r.firstField > 675).map((r) => r.id),
      stageScrollable: rows.filter((r) => r.stageScrollable).length,
      hOvMax: Math.max(...rows.map((r) => r.hOv)), docOvMax: Math.max(...rows.map((r) => r.docOv)),
      rows,
    };
    const v2 = out.variants[name];
    console.log(`${name.padEnd(16)} firstField ${v2.firstField.min}–${v2.firstField.max} (avg ${v2.firstField.avg})  contentH ${v2.contentH.min}–${v2.contentH.max}  超720: ${v2.over720.length}  超675: ${v2.over675.length}  stage可滚 ${v2.stageScrollable}/30  hOv ${v2.hOvMax}`);
  }
  await page.close();
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'panel-variants3.json'), JSON.stringify(out, null, 2));
console.log('\nwrote panel-variants3.json');
