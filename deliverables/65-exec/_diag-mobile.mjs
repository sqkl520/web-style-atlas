/* 诊断：同样的配置（stage 200 + 折 parts/gate + 收紧间距）在 390×844 下为什么
   两次实验差 91–130px。怀疑是 v3 的探针把 `.prompt-cta` 算漏了，或者折叠没有落上。
   这个脚本把 #d-body 的直接子元素、每个 details 的高度、prompt-cta 是否存在全部打出来。 */
import { resolve } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const M = '.viewer{margin-bottom:14px}.open-proto{margin-bottom:14px}.gate-box{margin-bottom:0}.parts{margin-bottom:14px}';
const cfg = { stage: 200, css: '.viewer-stage{max-height:200px}' + M };

function apply(arg) {
  const { stage, css } = arg;
  const old = document.getElementById('__exp'); if (old) old.remove();
  const st = document.createElement('style'); st.id = '__exp'; st.textContent = css;
  document.head.appendChild(st);
  const parts = document.querySelector('#d-body .parts');
  if (parts && !parts.closest('details')) {
    const n = parts.querySelectorAll('li').length;
    const d = document.createElement('details'); d.className = 'fold';
    d.innerHTML = '<summary>上站文案 ' + n + ' 段</summary>';
    parts.parentNode.insertBefore(d, parts); d.appendChild(parts);
  }
  const gate = document.querySelector('#d-body .gate-box');
  if (gate && !gate.closest('details')) {
    const d = document.createElement('details'); d.className = 'fold';
    d.innerHTML = '<summary>闸门</summary>';
    gate.parentNode.insertBefore(d, gate); d.appendChild(gate);
  }
  return true;
}

const dump = () => {
  const detail = document.getElementById('detail');
  const dRect = detail.getBoundingClientRect();
  const st = detail.scrollTop;
  const rel = (el) => {
    const r = el.getBoundingClientRect();
    return { top: +(r.top - dRect.top + st).toFixed(1), h: +r.height.toFixed(1) };
  };
  return {
    contentH: detail.scrollHeight,
    cta: document.querySelector('#d-body .prompt-cta') ? rel(document.querySelector('#d-body .prompt-cta')) : null,
    children: [...document.querySelectorAll('#d-body > *')].map((el) => ({ cls: String(el.className).split(' ')[0] || el.tagName, ...rel(el) })),
    details: [...document.querySelectorAll('#d-body details')].map((d) => ({ sum: (d.querySelector('summary') || {}).textContent, open: d.open, ...rel(d) })),
    firstField: rel(document.querySelector('#d-body .field')).top,
    partsLiCount: document.querySelectorAll('#d-body .parts li').length,
  };
};

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1400 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  for (const id of ['S01', 'S15']) {
    await page.eval((sid) => { location.hash = '#' + sid; }, id);
    await sleep(500);
    console.log('\n=== ' + id + ' BEFORE apply ===');
    console.log(JSON.stringify(await page.eval(dump), null, 1));
    await page.eval(apply, cfg);
    await sleep(150);
    await page.eval(() => { document.getElementById('detail').scrollTop = 0; });
    console.log('=== ' + id + ' AFTER apply ===');
    console.log(JSON.stringify(await page.eval(dump), null, 1));
  }
  await page.close();
} finally { await browser.close(); await srv.close(); }
