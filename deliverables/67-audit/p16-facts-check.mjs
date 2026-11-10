// p16-facts-check.mjs — 核实 1440 档 .mast-facts 是否与左栏并排、以及 mast 的构成；顺带核实 rail 限高注释里的 1563px。
import { join } from 'node:path';
import { HERE, INPAGE } from './lib-measure.mjs';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const HEAD = 'file:///' + join(HERE, 'frozen', 'index.html').replace(/\\/g, '/');

for (const [w, h, label] of [[1440, 900, '1440'], [390, 844, '390']]) {
  const br = await Browser.launch({ width: w, height: h });
  const p = await br.newPage({ width: w, height: h, mobile: w <= 620 });
  await p.setViewport({ width: w, height: h, mobile: w <= 620 });
  await p.goto(HEAD, { settleMs: 1300 });
  const r = await p.eval(`(async () => {
    ${INPAGE}
    await (async function(){ if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch(e){} } })();
    var mast = document.querySelector('.mast'), mid = document.querySelector('.mast-id'), facts = document.querySelector('.mast-facts');
    var rail = document.querySelector('.rail');
    var rr = __M.rect(rail);
    // 若取消 limit：临时去掉 max-height 量内容高
    var savedMax = rail.style.maxHeight, savedOv = rail.style.overflowY;
    rail.style.maxHeight = 'none'; rail.style.overflowY = 'visible';
    var railNatural = __M.rect(rail).height;
    rail.style.maxHeight = savedMax; rail.style.overflowY = savedOv;
    return {
      vw: innerWidth,
      mastH: __M.px(__M.rect(mast).height),
      mastCols: __M.cs(mast).gridTemplateColumns,
      mid: { top: __M.px(__M.rect(mid).top), h: __M.px(__M.rect(mid).height), w: __M.px(__M.rect(mid).width) },
      facts: { top: __M.px(__M.rect(facts).top), h: __M.px(__M.rect(facts).height), w: __M.px(__M.rect(facts).width) },
      sideBySide: Math.abs(__M.rect(mid).top - __M.rect(facts).top) < 30,
      factsCols: __M.cs(facts).gridTemplateColumns,
      rail: { h: __M.px(rr.height), natural: __M.px(railNatural), scrollH: rail.scrollHeight, clientH: rail.clientHeight, maxH: __M.cs(rail).maxHeight },
      // facts 内部
      factsKids: Array.prototype.map.call(facts.children, function (k) { var x = __M.rect(k); return { h: __M.px(x.height), top: __M.px(x.top), w: __M.px(x.width) }; })
    };
  })()`);
  console.log(`\n===== ${label}`);
  console.log(JSON.stringify(r, null, 1));
  await br.close();
}
