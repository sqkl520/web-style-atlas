// _deeplink.mjs — wizard.js:192 的 ./#tpl-exit 深链：现在目标在关闭的 <details> 里，
// 冷加载（真导航）与页内改 hash 两种情况都要自动展开 + 落到可视位置。
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '390', w: 390, h: 844, d: 2, m: true }, { k: '1440', w: 1440, h: 900, d: 1, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: vp.d, mobile: vp.m, reducedMotion: true });
  // 冷加载 + 片段
  await p.goto(SRC + '#tpl-exit', { settleMs: 1800 });
  out[vp.k] = await p.eval(() => {
    const d = document.getElementById('mast-fold');
    const e = document.getElementById('tpl-exit');
    const b = e.getBoundingClientRect();
    return { open: d.open, exitTop: +b.top.toFixed(1), exitBottom: +b.bottom.toFixed(1),
      visible: e.checkVisibility({ checkVisibilityCSS: true }), scrollY: Math.round(scrollY),
      links: [...document.querySelectorAll('.mast-exit a')].map((a) => ({ t: a.textContent.trim(), h: +a.getBoundingClientRect().height.toFixed(1) })) };
  });
  // 页内改 hash（模拟 wizard.js 的 location.href = './#tpl-exit'）
  await p.goto(SRC, { settleMs: 1500 });
  await p.eval(() => { location.hash = '#tpl-exit'; });
  await sleep(700);
  out[vp.k].sameDoc = await p.eval(() => {
    const d = document.getElementById('mast-fold');
    const e = document.getElementById('tpl-exit');
    return { open: d.open, exitTop: +e.getBoundingClientRect().top.toFixed(1), scrollY: Math.round(scrollY) };
  });
  console.log(`[${vp.k}]`, JSON.stringify(out[vp.k], null, 1));
  await p.close();
}
await browser.close();
