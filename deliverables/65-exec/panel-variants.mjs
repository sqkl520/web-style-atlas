/* 65-exec 变体实验：在页面里注入候选改法（不改仓库文件），量 30 案的首字段位置与 scrollHeight。
   目的：规划 Agent 的估算是「一行 CSS 降 200–350px」，但实测 .viewer-stage 的 62vh 上限
   在 1440×900 下多数案**根本没生效**（图片自身高度只有 323px）——所以先测再改。
   用法：node deliverables/65-exec/panel-variants.mjs */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
mkdirSync(OUT, { recursive: true });
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

/* 每个变体 = 一段 CSS + 一个「要不要把 parts/gate 包进 details」的开关。
   details 用真实元素包（不是假装），因为它自身的 summary 行高会占位置，必须计入。 */
const VARIANTS = {
  base: { css: '' },
  s200: { css: '.viewer-stage{max-height:200px}' },
  s180: { css: '.viewer-stage{max-height:180px}' },
  s200_parts: { css: '.viewer-stage{max-height:200px}', foldParts: true },
  s180_parts: { css: '.viewer-stage{max-height:180px}', foldParts: true },
  s200_parts_gate: { css: '.viewer-stage{max-height:200px}', foldParts: true, foldGate: true },
  s180_parts_gate_m: {
    css: '.viewer-stage{max-height:180px}.viewer{margin-bottom:14px}.open-proto{margin-bottom:14px}.gate-box{margin-bottom:14px}.parts{margin-bottom:12px}.viewer-strip button{width:48px}',
    foldParts: true, foldGate: true,
  },
  s160_parts_gate_m: {
    css: '.viewer-stage{max-height:160px}.viewer{margin-bottom:14px}.open-proto{margin-bottom:14px}.gate-box{margin-bottom:14px}.parts{margin-bottom:12px}.viewer-strip button{width:48px}',
    foldParts: true, foldGate: true,
  },
};

function apply(arg) {
  const { css, foldParts, foldGate } = arg;
  const old = document.getElementById('__exp'); if (old) old.remove();
  if (css) {
    const st = document.createElement('style');
    st.id = '__exp'; st.textContent = css;
    document.head.appendChild(st);
  }
  // 折叠上站文案：summary 里写清楚里面是什么 + 条数，用户不展开也知道有什么
  const parts = document.querySelector('#d-body .parts');
  if (foldParts && parts && !parts.closest('details')) {
    const li = parts.querySelectorAll('li').length;
    const d = document.createElement('details');
    d.className = 'fold';
    d.innerHTML = '<summary>上站文案 ' + li + ' 段（主张句 / 按钮 / 空状态 / 错误状态）</summary>';
    parts.parentNode.insertBefore(d, parts);
    d.appendChild(parts);
  }
  // 折叠闸门明细：summary 里保留结论（FAIL/WARN 数 + 屏数）
  const gate = document.querySelector('#d-body .gate-box');
  if (foldGate && gate && !gate.closest('details')) {
    const tags = [...gate.querySelectorAll('.tag')].map((t) => t.textContent).join(' ');
    const nums = (gate.querySelector('.gate-line span') || {}).textContent || '';
    const d = document.createElement('details');
    d.className = 'fold';
    d.innerHTML = '<summary>闸门明细：' + tags + '　' + nums + '</summary>';
    gate.parentNode.insertBefore(d, gate);
    d.appendChild(gate);
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
  const stage = document.querySelector('.viewer-stage');
  return {
    contentH: detail.scrollHeight,
    firstField: f ? rel(f).top : null,
    stageH: stage ? +stage.getBoundingClientRect().height.toFixed(1) : null,
    stageSh: stage ? stage.scrollHeight : null,
    stageScrollable: stage ? stage.scrollHeight > stage.clientHeight + 2 : null,
  };
};

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), variants: {} };
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1400 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  for (const [name, v] of Object.entries(VARIANTS)) {
    const rows = [];
    for (const id of IDS) {
      await page.eval((sid) => { location.hash = '#' + sid; }, id);
      await sleep(360);
      await page.eval(apply, v);
      await sleep(90);
      await page.eval(() => { document.getElementById('detail').scrollTop = 0; });
      const m = await page.eval(probe);
      rows.push({ id, ...m });
    }
    const ff = rows.map((r) => r.firstField);
    const ch = rows.map((r) => r.contentH);
    out.variants[name] = {
      firstField: { min: Math.min(...ff), max: Math.max(...ff), avg: Math.round(ff.reduce((a, b) => a + b, 0) / ff.length) },
      contentH: { min: Math.min(...ch), max: Math.max(...ch), avg: Math.round(ch.reduce((a, b) => a + b, 0) / ch.length) },
      stageScrollable: rows.filter((r) => r.stageScrollable).length,
      rows,
    };
    console.log(`${name.padEnd(20)} firstField ${Math.min(...ff)}–${Math.max(...ff)} (avg ${out.variants[name].firstField.avg})  contentH ${Math.min(...ch)}–${Math.max(...ch)}  stage可滚 ${out.variants[name].stageScrollable}/30`);
  }
  await page.close();
} finally {
  await browser.close();
  await srv.close();
}
writeFileSync(join(OUT, 'panel-variants.json'), JSON.stringify(out, null, 2));
console.log('\nwrote panel-variants.json');
