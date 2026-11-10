/* 副作用核查（第二版）：--s-15 也被 wizard.css:68 的 .wz-card p 使用。
 *
 * 第一版想点完五道题走到结果页，但向导是**浏览器里按顺序点**才出结果的，
 * 脚本的点击节奏对不上（reachedResults=false）。与其去猜它的状态机，
 * 不如直接测那条 CSS 规则本身：拿真 wizard.html 作宿主，插一个 .wz-card > p，
 * 读它的 computed font-size。这条规则的效果与"结果页里第几张卡"无关。
 */
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(HERE, 'shots-a11y');
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

for (const [tag, dir] of [['改前', join(HERE, '_before-clone')], ['改后', join(HERE, '..', '..', 'prototypes', '_selection')]]) {
  const url = 'file:///' + join(dir, 'wizard.html').replace(/\\/g, '/');
  const p = await b.newPage({ width: 1440, height: 900, dsf: 2, mobile: false });
  await p.goto(url, { settleMs: 1400 });
  const m = await p.eval(() => {
    /* 用真页面的样式表作宿主，插一个和结果卡里同样的结构 */
    const host = document.querySelector('.wz-main') || document.body;
    const card = document.createElement('div');
    card.className = 'wz-card';
    card.innerHTML = '<div class="no">S01</div><div><h3>红黑斜排报</h3>' +
      '<p>中文正文一段，用来量 .wz-card p 的字号。这一句故意写长一点，好让行数变化也看得出来：如果字号从 16 掉到 15，同一段文字的换行位置会变，行高与总高都会跟着变。</p></div>';
    host.appendChild(card);
    const pEl = card.querySelector('p');
    const cs = getComputedStyle(pEl);
    const r = pEl.getBoundingClientRect();
    const res = {
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
      pHeight: +r.height.toFixed(1),
      lines: Math.round(r.height / parseFloat(cs.lineHeight)),
      s15: JSON.stringify(getComputedStyle(document.documentElement).getPropertyValue('--s-15')),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
    card.remove();
    return res;
  });
  /* 也把真页面截一张，证明"补 --s-15 没有动向导的版面结构" */
  await p.goto(url, { settleMs: 1200 });
  await p.screenshot({ path: join(SHOTS, 'wizard-' + (tag === '改前' ? 'before' : 'after') + '-1440.jpg') });
  out[tag] = m;
  await p.close();
}
await b.close();
console.log(JSON.stringify(out, null, 1));
