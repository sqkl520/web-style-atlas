import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9637;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(PORT, r));
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S24-cyanotype-rainforest-path/index.html`, { settleMs: 1400 });
  out.S24gap = await page.eval(() => {
    const art = document.querySelector('.lv > .br');
    const veinSvg = art.querySelector('.vein');
    const vm = art.querySelector('.vein .vm');
    const node = art.querySelector('.node');
    const vR = veinSvg.getBoundingClientRect();
    // path end in user units -> screen
    const p = vm.getPointAtLength(vm.getTotalLength());
    const pt = vm.ownerSVGElement.createSVGPoint();
    pt.x = p.x; pt.y = p.y;
    const scr = pt.matrixTransform(vm.getScreenCTM());
    const nR = node.getBoundingClientRect();
    const vRendEnd = { x: Math.round(scr.x), y: Math.round(scr.y) };
    // stroke-dash geometry: does any dash gap exist within the path?
    const cs = getComputedStyle(vm);
    return {
      veinSvgRect: { l: Math.round(vR.left), t: Math.round(vR.top), w: Math.round(vR.width), h: Math.round(vR.height) },
      pathEndUser: { x: Math.round(p.x), y: Math.round(p.y) },
      pathEndScreen: vRendEnd,
      nodeRect: { l: Math.round(nR.left), t: Math.round(nR.top), w: Math.round(nR.width), h: Math.round(nR.height) },
      distEndToNodeBox: (() => {
        const dx = Math.max(nR.left - scr.x, scr.x - nR.right, 0);
        const dy = Math.max(nR.top - scr.y, scr.y - nR.bottom, 0);
        return Math.round(Math.hypot(dx, dy) * 10) / 10;
      })(),
      dasharray: cs.strokeDasharray, dashoffset: cs.strokeDashoffset,
      pathLengthAttr: vm.getAttribute('pathLength'),
      // Is the whole path one dash (=> no internal gap)?
      totalLen: Math.round(vm.getTotalLength()),
      note: 'pathLength=100 with dasharray 100 100 means the entire path is a single dash; no 2px gap is encoded in CSS.',
    };
  });
  await page.close();
}

// S03: does the cursor have any ratio? enumerate every transform/multiplier in the inline script
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S03-long-exposure-observatory/index.html`, { settleMs: 1200 });
  out.S03cursor2 = await page.eval(() => {
    const cur = document.querySelector('.cursor');
    const band = document.querySelector('.band');
    band.scrollIntoView({ block: 'center' });
    const r = band.getBoundingClientRect();
    const probes = [];
    for (const [dx, dy] of [[5, 5], [50, 12], [250, 20]]) {
      const x = Math.round(r.left + dx), y = Math.round(r.top + dy);
      band.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
      const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(cur.style.transform);
      probes.push({ clientX: x, clientY: y, appliedX: m ? +m[1] : null, appliedY: m ? +m[2] : null, deltaX: m ? +m[1] - x : null, deltaY: m ? +m[2] - y : null });
    }
    return { probes, cursorW: getComputedStyle(cur).width, cursorMargin: getComputedStyle(cur).margin, scale: getComputedStyle(cur).transform };
  });
  await page.close();
}

await b.close(); server.close();
console.log(JSON.stringify(out, null, 1));
