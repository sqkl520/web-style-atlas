// 探针 20：模板层（#tpl-strip / #empty-tpl）在列表页到底可不可见、在第几屏。
// 用户说「三个模板就在旁边，却没有衔接」——要先用 rect 验"旁边"是不是真的在旁边。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const PROBE = () => {
  const vh = window.innerHeight;
  const info = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return { sel, exists: false };
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      sel, exists: true, display: cs.display, visibility: cs.visibility,
      w: Math.round(r.width), h: Math.round(r.height),
      top: Math.round(r.top + window.scrollY), screen: +((r.top + window.scrollY) / vh).toFixed(2),
      inViewportNow: r.top < vh && r.bottom > 0,
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
    };
  };
  return {
    vh, docH: document.documentElement.scrollHeight,
    tplStrip: info('#tpl-strip'), emptyTpl: info('#empty-tpl'),
    fltScene: info('#flt-scene'), rail: info('.rail'),
    rows: document.querySelectorAll('.row').length,
    tplCards: [...document.querySelectorAll('.tpl-card')].map((el) => {
      const r = el.getBoundingClientRect();
      return { tpl: el.getAttribute('data-tpl'), top: Math.round(r.top + window.scrollY), screen: +((r.top + window.scrollY) / vh).toFixed(2), h: Math.round(r.height) };
    }),
  };
};

const br = await Browser.launch({ width: 1440, height: 900 });
for (const [tier, w, h, mob] of [['1440', 1440, 900, false], ['390', 390, 844, true]]) {
  const p = await br.newPage({ width: w, height: h, dsf: 1, mobile: mob });
  await p.goto(PAGE, { settleMs: 2400 });
  await p.eval('document.fonts.ready.then(()=>1)');
  const m = await p.eval(PROBE);
  console.log(`=== ${tier}  vh=${m.vh} docH=${m.docH} (${(m.docH / m.vh).toFixed(1)} 屏)  rows=${m.rows} ===`);
  for (const k of ['tplStrip', 'emptyTpl', 'fltScene', 'rail']) {
    const x = m[k];
    console.log(`  ${k.padEnd(10)} ${x.exists ? `display=${x.display} ${x.w}x${x.h} top=${x.top}px (第 ${x.screen} 屏) 可见=${x.inViewportNow} 「${x.text.slice(0, 50)}」` : '不存在'}`);
  }
  console.log(`  模板卡：${m.tplCards.map((c) => `${c.tpl}@${c.screen}屏(${c.h}px)`).join('  ')}`);
  await p.close();
}
await br.close();
