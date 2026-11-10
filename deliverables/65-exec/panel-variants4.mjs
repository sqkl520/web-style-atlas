/* 65-exec 变体实验 4（在**并发改动之后**的现状上做）。
   基线事实（_diag-now.mjs，05:10）：另一个 Agent 把 .prompt-cta 从 93px 撑到 299–349px
   （新增 .prompt-cta-row + .prompt-fill 两个输入框 + .prompt-fill-note）。
   于是首字段从 1,140 变成 **1,362–1,464**，scrollHeight 从 3,769 变成 4,024。
   规划 Agent 的 784–1,196px 估算与「①+② ≤720」的结论在这个现状下**已经不成立**。

   本脚本在现状上量三组候选：
     A  stage 限高 + 折 parts + 折 gate（规划给的方案）
     B  A + 折整个大图（tabs/缩略图仍可见，只把 439px 的 stage 收起来）
     C  B + 头部与间距收紧
   目标是找出**在不动 prompt-copy.js 的前提下**能不能真的到 720。 */
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const TIGHT = '.viewer{margin-bottom:14px}.open-proto{margin-bottom:14px}.gate-box{margin-bottom:0}' +
  '.parts{margin-bottom:0}.fields{margin-top:0}';

const VARIANTS = {
  // A：规划方案的现状版
  'A_s200_parts_gate': { stage: 200, foldParts: true, foldGate: true },
  // B：再把大图收进 details
  'B_s200_parts_gate_stagefold': { stage: 200, foldParts: true, foldGate: true, foldStage: true },
  // C：B + 间距/头部收紧
  'C_s200_parts_gate_stagefold_tight': { stage: 200, foldParts: true, foldGate: true, foldStage: true, tight: true },
  // C2：头部只收 padding（保留标题字号，避免闸门说首屏没有主导元素）
  'C2_stagefold_tight_headpad': { stage: 200, foldParts: true, foldGate: true, foldStage: true, tight: true, headPad: true },
  // D：只折大图，不折 parts/gate（对照组：看单靠折大图够不够）
  'D_only_stagefold': { stage: 200, foldStage: true, tight: true },
};

function apply(arg) {
  const { stage, foldParts, foldGate, foldStage, tight, headPad } = arg;
  const T = '.viewer{margin-bottom:14px}.open-proto{margin-bottom:14px}.gate-box{margin-bottom:0}' +
    '.parts{margin-bottom:0}.fields{margin-top:0}';
  const H = '.detail-head{padding:8px 16px}.detail-title h2{font-size:20px}';
  const old = document.getElementById('__exp'); if (old) old.remove();
  const st = document.createElement('style'); st.id = '__exp';
  st.textContent = '.viewer-stage{max-height:' + stage + 'px}' + (tight ? T : '') + (headPad ? H : '');
  document.head.appendChild(st);

  const mk = (cls) => {
    const d = document.createElement('details');
    d.className = 'fold ' + cls;
    return d;
  };
  // 大图折叠：把 .viewer-stage 单独包进 details，tabs 与缩略图留在外面
  if (foldStage) {
    const stageEl = document.querySelector('#d-body .viewer-stage');
    if (stageEl && !stageEl.closest('details')) {
      const d = mk('fold-stage');
      const note = document.querySelector('#d-body .viewer-note');
      d.innerHTML = '<summary>展开 ' + (document.querySelector('#vnote') ? '' : '') + '</summary>';
      stageEl.parentNode.insertBefore(d, stageEl);
      d.appendChild(stageEl);
      d.querySelector('summary').textContent = '展开大图（' + stage + 'px 高，可滚动看全）';
      if (note) d.appendChild(note);
    }
  }
  const parts = document.querySelector('#d-body .parts');
  if (foldParts && parts && !parts.closest('details')) {
    const n = parts.querySelectorAll('li').length;
    const d = mk('fold-parts');
    d.innerHTML = '<summary>上站文案 ' + n + ' 段：主张句 / 按钮 / 空状态 / 错误状态</summary>';
    parts.parentNode.insertBefore(d, parts); d.appendChild(parts);
  }
  const gate = document.querySelector('#d-body .gate-box');
  if (foldGate && gate && !gate.closest('details')) {
    const tags = [...gate.querySelectorAll('.tag')].map((t) => t.textContent).join(' · ');
    const nums = (gate.querySelector('.gate-line span') || {}).textContent || '';
    const d = mk('fold-gate');
    d.innerHTML = '<summary>闸门与报告：' + tags + '　' + nums + '</summary>';
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
    headH: rel(document.querySelector('.detail-head')).h,
    cta: rel(document.querySelector('#d-body .prompt-cta')),
    viewer: rel(document.querySelector('#d-body .viewer')),
    hOv: detail.scrollWidth - detail.clientWidth,
    docOv: document.documentElement.scrollWidth - innerWidth,
    folds: [...document.querySelectorAll('#d-body details')].map((d) => ({ sum: (d.querySelector('summary') || {}).textContent.trim().slice(0, 30), h: +d.getBoundingClientRect().height.toFixed(1) })),
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
        over3800: rows.filter((r) => r.contentH > 3800).map((r) => r.id),
        stageScrollable: rows.filter((r) => r.stageScrollable).length,
        hOvMax: Math.max(...rows.map((r) => r.hOv)), docOvMax: Math.max(...rows.map((r) => r.docOv)),
        rows,
      };
      const v2 = out.variants[key];
      console.log(`${key.padEnd(44)} ff ${v2.firstField.min}–${v2.firstField.max} (avg ${v2.firstField.avg})  ch ${v2.contentH.min}–${v2.contentH.max}  超720:${v2.over720.length}  超3800:${v2.over3800.length}  stage可滚 ${v2.stageScrollable}/30  hOv ${v2.hOvMax}`);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'panel-variants4.json'), JSON.stringify(out, null, 2));
console.log('\nwrote panel-variants4.json');
