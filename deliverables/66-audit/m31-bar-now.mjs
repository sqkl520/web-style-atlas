// m31-bar-now.mjs — 当前工作树的列表页逐段构成（含他人新加的 #q-parked）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '414', w: 414, h: 896, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 2, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  out[vp.k] = await p.eval(() => {
    const bar = document.querySelector('.bar');
    const rb = bar.getBoundingClientRect();
    const kids = Array.from(bar.children).map((el) => {
      const b = el.getBoundingClientRect();
      return {
        tag: el.tagName, cls: (el.className || '').toString().slice(0, 24), id: el.id,
        top: +(b.top - rb.top).toFixed(1), h: +b.height.toFixed(1), w: +b.width.toFixed(1),
        display: getComputedStyle(el).display,
        hidden: 'hidden' in el ? el.hidden : null,
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      };
    });
    const qp = document.getElementById('q-parked');
    return {
      barH: +rb.height.toFixed(1), kids,
      qparked: qp ? {
        hidden: qp.hidden, hasAttr: qp.hasAttribute('hidden'), display: getComputedStyle(qp).display,
        h: +qp.getBoundingClientRect().height.toFixed(1),
        effective: qp.getBoundingClientRect().height > 0 && getComputedStyle(qp).display !== 'none',
        text: (qp.textContent || '').replace(/\s+/g, ' ').trim(),
        buttons: Array.from(qp.querySelectorAll('button')).map((b) => ({ t: b.textContent, h: +b.getBoundingClientRect().height.toFixed(1) })),
      } : null,
      firstRowTop: +document.querySelector('.row').getBoundingClientRect().top.toFixed(1),
    };
  });
  console.log(`\n[${vp.k}] bar=${out[vp.k].barH} 首卡top=${out[vp.k].firstRowTop}`);
  out[vp.k].kids.forEach((k) => console.log(`   ${k.cls.padEnd(14)} h=${String(k.h).padStart(5)} w=${String(k.w).padStart(6)} disp=${k.display.padEnd(11)} hidden=${k.hidden} "${k.text.slice(0, 30)}"`));
  console.log(`   #q-parked: ${JSON.stringify(out[vp.k].qparked)}`);
  await p.close();
}
writeFileSync(join(HERE, 'data-m31-bar-now.json'), JSON.stringify(out, null, 1));
await browser.close();
