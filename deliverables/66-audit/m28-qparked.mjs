// m28-qparked.mjs — 复现 #q-parked 的 [hidden] 失效：空状态下仍渲染 62px 的假控件
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  // 触发一次 chip 点击（parkQuery 只有在有词时执行，但 syncParked 会建节点）
  out[vp.k] = await p.eval(() => {
    const el = document.getElementById('q-parked');
    if (!el) return { exists: false };
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      exists: true,
      hiddenAttr: el.hasAttribute('hidden'),
      hiddenProp: el.hidden,
      display: cs.display,
      rect: { top: +b.top.toFixed(1), h: +b.height.toFixed(1), w: +b.width.toFixed(1), bottom: +b.bottom.toFixed(1) },
      labelText: (el.querySelector('.q-parked-lab') || {}).textContent,
      ariaLive: el.getAttribute('aria-live'),
      buttons: Array.from(el.querySelectorAll('button')).map((x) => x.textContent),
      // 它在 DOM 里占的高度是否计入布局
      occupiesLayout: b.height > 0,
    };
  });
  console.log(`[${vp.k}] ${JSON.stringify(out[vp.k])}`);
  await p.close();
}
writeFileSync(join(HERE, 'data-m28-qparked.json'), JSON.stringify(out, null, 1));
await browser.close();
