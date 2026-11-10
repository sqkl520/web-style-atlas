// p17-rail-exact.mjs — rail 内滚的精确值（不动 max-height，只读 scrollHeight），三档各一次。
import { join } from 'node:path';
import { HERE, INPAGE } from './lib-measure.mjs';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const HEAD = 'file:///' + join(HERE, 'frozen', 'index.html').replace(/\\/g, '/');
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const br = await Browser.launch({ width: w, height: h });
  const p = await br.newPage({ width: w, height: h, mobile: w <= 620 });
  await p.setViewport({ width: w, height: h, mobile: w <= 620 });
  await p.goto(HEAD, { settleMs: 1400 });
  const r = await p.eval(`(async () => {
    ${INPAGE}
    await (async function(){ if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } })();
    var rail = document.querySelector('.rail');
    var c = __M.cs(rail);
    var kids = Array.prototype.filter.call(rail.children, function (k) { return __M.cs(k).display !== 'none'; });
    var sum = kids.reduce(function (a, k) { return a + __M.rect(k).height + (parseFloat(__M.cs(k).marginBottom)||0); }, 0);
    return {
      vw: innerWidth,
      clientH: rail.clientHeight, scrollH: rail.scrollHeight,
      inner: rail.scrollHeight - rail.clientHeight,
      h: __M.px(__M.rect(rail).height),
      maxH: c.maxHeight, overflowY: c.overflowY, pos: c.position,
      padT: c.paddingTop, padB: c.paddingBottom,
      kidsSum: __M.px(sum),
      hidden: Array.prototype.map.call(rail.children, function (k) { return __M.cs(k).display === 'none' ? __M.label(k) : null; }).filter(Boolean)
    };
  })()`);
  console.log(w + ': ' + JSON.stringify(r));
  await br.close();
}
