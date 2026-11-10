/* 变体实验 5：只解移动端那 65px 的缺口。
   现状（变体 4）：
     桌面 C2 = 642.9–693（30/30 ≤720）✓
     移动 C2 = 721.6–784.8（30/30 >720）✗，差 65px
   移动端多出来的高度在哪：390 档 .viewer-strip 缩略图一行约 46px、stage 217px。
   候选：
     M1 折缩略图（tabs 与 stage 仍可见，图仍能看）
     M2 缩略图不折，stage 216→160
     M3 M1 + stage 160（双管）
     M4 M3 + 头部再收
   判定标准：firstField ≤720 且 390 档横向溢出 = 0，且 stage 可滚（能看全图）。 */
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const VARIANTS = {
  'M0_C2': { stage: 200, strip: false, headPad: true },
  'M1_strip': { stage: 200, strip: true, headPad: true },
  'M2_s160': { stage: 160, strip: false, headPad: true },
  'M3_strip_s160': { stage: 160, strip: true, headPad: true },
  'M4_strip_s160_head': { stage: 160, strip: true, headPad: true, headMore: true },
};

function apply(arg) {
  const { stage, strip, headPad, headMore } = arg;
  const T = '.viewer{margin-bottom:14px}.open-proto{margin-bottom:14px}.gate-box{margin-bottom:0}' +
    '.parts{margin-bottom:0}.fields{margin-top:0}';
  const H = '.detail-head{padding:8px 16px}.detail-title h2{font-size:20px}';
  const H2 = '.detail-head{padding:6px 14px}.detail-title h2{font-size:18px}.detail-no{font-size:20px}';
  const old = document.getElementById('__exp'); if (old) old.remove();
  const st = document.createElement('style'); st.id = '__exp';
  st.textContent = '.viewer-stage{max-height:' + stage + 'px}' + T + (headMore ? H2 : headPad ? H : '');
  document.head.appendChild(st);

  const mk = (cls, sum) => {
    const d = document.createElement('details');
    d.className = 'fold ' + cls;
    d.innerHTML = '<summary>' + sum + '</summary>';
    return d;
  };
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
    const d = mk('fold-gate', '闸门与报告时间：' + tags + '　' + nums);
    gate.parentNode.insertBefore(d, gate); d.appendChild(gate);
  }
  const stripEl = document.querySelector('#d-body .viewer-strip');
  if (strip && stripEl && !stripEl.closest('details')) {
    const n = stripEl.querySelectorAll('button').length;
    const d = mk('fold-strip', '更多截图 ' + n + ' 张（逐张切换）');
    stripEl.parentNode.insertBefore(d, stripEl); d.appendChild(stripEl);
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
    tabsVisible: !!document.querySelector('#d-body .viewer-tabs'),
    stripVisibleH: (() => { const s = document.querySelector('#d-body .viewer-strip'); return s ? +s.getBoundingClientRect().height.toFixed(1) : null; })(),
    hOv: detail.scrollWidth - detail.clientWidth,
    docOv: document.documentElement.scrollWidth - innerWidth,
  };
};

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), variants: {} };
try {
  const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
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
    out.variants[name] = {
      firstField: { min: Math.min(...ff), max: Math.max(...ff), avg: Math.round(ff.reduce((a, b) => a + b, 0) / ff.length) },
      contentH: { min: Math.min(...ch), max: Math.max(...ch) },
      over720: rows.filter((r) => r.firstField > 720).map((r) => r.id),
      stageScrollable: rows.filter((r) => r.stageScrollable).length,
      hOvMax: Math.max(...rows.map((r) => r.hOv)), docOvMax: Math.max(...rows.map((r) => r.docOv)),
      stageH: rows[0].stageH,
      rows,
    };
    const v2 = out.variants[name];
    console.log(`${name.padEnd(20)} ff ${v2.firstField.min}–${v2.firstField.max} (avg ${v2.firstField.avg})  ch ${v2.contentH.min}–${v2.contentH.max}  超720:${v2.over720.length} [${v2.over720.slice(0, 5).join(',')}]  stageH ${v2.stageH} 可滚 ${v2.stageScrollable}/30  hOv ${v2.hOvMax}`);
  }
  await page.close();
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'panel-variants5.json'), JSON.stringify(out, null, 2));
console.log('\nwrote panel-variants5.json');
