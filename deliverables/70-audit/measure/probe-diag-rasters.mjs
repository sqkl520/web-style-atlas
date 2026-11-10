// 诊断：为什么某些案的孤立像素比例偏高？逐个 <img> 与纹理层核对 rect / repeat / blend。
import { startServer, launch, gotoStable, writeJson } from './lib.mjs';
import { HELPERS } from './inpage.mjs';

const ids = process.argv.slice(2).filter((a) => /^S\d\d$/.test(a));
const server = await startServer(8643);
const browser = await launch();
const page = await browser.newPage();
const out = {};

for (const id of ids) {
  const dir = (await import('node:fs')).readdirSync('D:/Web/style/prototypes').filter((d) => d.startsWith(id + '-'))[0];
  await page.setViewport({ width: 1440, height: 900, mobile: false });
  await gotoStable(page, `http://127.0.0.1:${server.address().port}/prototypes/${dir}/index.html`, 1200);
  await page.eval(HELPERS);
  out[id] = await page.eval(`(() => {
    const M = window.__M;
    const imgs = [], texels = [];
    document.querySelectorAll('*').forEach((el) => {
      const t = el.tagName.toLowerCase();
      if (t === 'img') {
        const r = el.getBoundingClientRect();
        imgs.push({ src: (el.getAttribute('src')||'').slice(0, 44), x: Math.round(r.x), y: Math.round(r.y),
                    w: Math.round(r.width), h: Math.round(r.height), vis: M.vis(el), kind: M.rasterKind(el) });
      }
      const cs = getComputedStyle(el);
      const bi = cs.backgroundImage || '';
      if (bi.indexOf('url(') >= 0 && /\\.(png|jpe?g|webp)/i.test(bi)) {
        const r = el.getBoundingClientRect();
        if (r.width > 2 && r.height > 2) texels.push({ tag: t + (el.getAttribute('class') ? '.' + el.getAttribute('class').split(/\\s+/)[0] : ''),
          x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
          repeat: cs.backgroundRepeat, size: cs.backgroundSize, blend: cs.mixBlendMode, op: cs.opacity,
          url: (bi.match(/url\\(["']?([^"')]+)/) || [])[1] ? (bi.match(/url\\(["']?([^"')]+)/)||[])[1].slice(-30) : '', kind: M.rasterKind(el) });
      }
    });
    return { docH: document.documentElement.scrollHeight, imgs, texels: texels.slice(0, 12) };
  })()`);
  console.log('\n=== ' + id + ' docH=' + out[id].docH);
  console.log(' imgs:'); for (const i of out[id].imgs) console.log('   ' + JSON.stringify(i));
  console.log(' texels:'); for (const t of out[id].texels) console.log('   ' + JSON.stringify(t));
}
writeJson('diag-rasters.json', out);
await browser.close();
server.close();
