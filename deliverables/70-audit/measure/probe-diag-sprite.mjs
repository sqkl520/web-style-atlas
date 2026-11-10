// 诊断：位于 <symbol>/<defs> 内部、或被 display:none 祖先隐藏的元素，
// getBoundingClientRect() 会不会给出非零尺寸？如果会，必须用 checkVisibility() 兜住。
import { startServer, launch, gotoStable } from './lib.mjs';
import { HELPERS } from './inpage.mjs';

const server = await startServer(8660);
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });

for (const id of ['S15', 'S19', 'S24', 'S14']) {
  const dir = (await import('node:fs')).readdirSync('D:/Web/style/prototypes').filter((d) => d.startsWith(id + '-'))[0];
  await gotoStable(page, `http://127.0.0.1:${server.address().port}/prototypes/${dir}/index.html`, 900);
  await page.eval(HELPERS);
  const r = await page.eval(`(() => {
    const M = window.__M;
    const out = { sprite: null, symbolChildren: [], checkVisAvail: typeof Element.prototype.checkVisibility };
    const sprite = document.querySelector('svg.sprite, svg[class*=sprite]');
    if (sprite) {
      const cs = getComputedStyle(sprite);
      const b = sprite.getBoundingClientRect();
      out.sprite = { cls: sprite.getAttribute('class'), display: cs.display, w: b.width, h: b.height,
                     wAttr: sprite.getAttribute('width'), hAttr: sprite.getAttribute('height'),
                     overflow: cs.overflow, position: cs.position, vis: cs.visibility,
                     checkVis: sprite.checkVisibility ? sprite.checkVisibility() : 'n/a' };
    }
    document.querySelectorAll('symbol rect, symbol path, defs rect').forEach((el) => {
      if (out.symbolChildren.length >= 5) return;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      out.symbolChildren.push({
        tag: el.tagName.toLowerCase(), parent: el.parentElement.tagName.toLowerCase(),
        w: +b.width.toFixed(1), h: +b.height.toFixed(1),
        fill: cs.fill, display: cs.display,
        visFn: M.vis(el),
        checkVis: el.checkVisibility ? el.checkVisibility() : 'n/a',
      });
    });
    return out;
  })()`);
  console.log('\n=== ' + id);
  console.log(' sprite: ' + JSON.stringify(r.sprite));
  console.log(' checkVisibility 可用: ' + r.checkVisAvail);
  for (const c of r.symbolChildren) console.log('   symbol child: ' + JSON.stringify(c));
}
await browser.close();
server.close();
