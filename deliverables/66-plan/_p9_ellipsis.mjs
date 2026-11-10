// P9：clamp 到底有没有画省略号 —— 直接截像素看（1440 档，3 倍缩放，只截 .row-family）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join } from 'node:path';
import { HERE, ROOT } from './_lib.mjs';

const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 3 });  // 3x 放大看字形
await p.goto(PAGE, { settleMs: 1800 });

for (const id of ['S10', 'S12', 'S18']) {
  const box = await p.eval((sid) => {
    const row = [...document.querySelectorAll('#ledger [data-id]')].find((r) => r.getAttribute('data-id') === sid);
    if (!row) return null;
    row.scrollIntoView({ block: 'center' });
    const fam = row.querySelector('.row-family');
    const r = fam.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), text: fam.textContent.slice(-30) };
  }, id);
  if (!box) { console.log(id + ' 未找到'); continue; }
  await new Promise((r) => setTimeout(r, 250));
  await p.screenshot({ path: join(HERE, `clamp3x-${id}.png`), format: 'png', clip: { x: box.x - 2, y: box.y - 2, width: box.w + 4, height: box.h + 4 } });
  console.log(`%s 截了 %dx%d  末尾文字=「%s」`, id, box.w, box.h, box.text);
}

// 直接问浏览器：line-clamp 有效时是否绘制 ellipsis。
// 做法：把一个已知长文本塞进同样样式的探针元素，量 clientHeight/scrollHeight 与是否有 text-overflow 计算值为 ellipsis
const diag = await p.eval(() => {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:200px;font-size:16px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden';
  probe.textContent = '一二三四五六七八九十'.repeat(12);
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const out = { lineClamp: cs.webkitLineClamp, textOverflow: cs.textOverflow, h: probe.clientHeight, sh: probe.scrollHeight, ff: navigator.userAgent };
  probe.remove();
  return out;
});
console.log('\n探针（同样式、确定溢出）：' + JSON.stringify(diag));
await b.close();
