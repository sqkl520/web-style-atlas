// 诊断：孤立色到底来自「哪个元素、哪个矩形」。不靠猜，直接反查。
// 对指定案，取整页截图，找出面积最大的孤立色，输出它们的包围盒与区域内命中的元素。
import { startServer, launch, gotoStable, writeJson, sleep } from './lib.mjs';
import { HELPERS } from './inpage.mjs';
import { COLLECT } from './collect.mjs';
import { decodePNG } from './png.mjs';
import { hexToRgb } from './png.mjs';

const ids = process.argv.slice(2).filter((a) => /^S\d\d$/.test(a));
const PORT = 8631;
const server = await startServer(PORT);
const browser = await launch();
const page = await browser.newPage();
const report = {};

for (const id of ids) {
  const dir = (await import('node:fs')).readdirSync('D:/Web/style/prototypes').filter((d) => d.startsWith(id + '-'))[0];
  await page.setViewport({ width: 1440, height: 900, mobile: false });
  await gotoStable(page, `http://127.0.0.1:${PORT}/prototypes/${dir}/index.html`, 1100);
  const data = await page.eval(HELPERS + COLLECT);
  const maxH = Math.min(data.docSize.h, 12000);
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: maxH, deviceScaleFactor: 1, mobile: false });
  await sleep(320);
  const shot = await page.screenshot({ format: 'png', clip: { x: 0, y: 0, width: 1440, height: maxH, scale: 1 } });
  const png = decodePNG(Buffer.from(shot, 'base64'));

  // 直接按完全相等的像素找（不用分类器，避免分类器本身出错）
  const declared = new Set(data.colors.map((c) => c.hex));
  const target = process.argv.includes('--all') ? null : null;
  const cnt = new Map();
  const bbox = new Map();
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const d = (y * png.width + x) * 4;
      const hex = '#' + [png.data[d], png.data[d + 1], png.data[d + 2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
      if (declared.has(hex)) continue;
      cnt.set(hex, (cnt.get(hex) || 0) + 1);
      const b = bbox.get(hex);
      if (!b) bbox.set(hex, { x0: x, x1: x, y0: y, y1: y });
      else { if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; }
    }
  }
  const top = [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const totalPx = png.width * png.height;
  const info = [];
  for (const [hex, n] of top) {
    const b = bbox.get(hex);
    // 这个色到底是不是某个声明色的「近似」？
    const near = data.colors.map((c) => {
      const A = hexToRgb(c.hex), B = hexToRgb(hex);
      return { hex: c.hex, d: Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]), props: c.props };
    }).sort((a, b2) => a.d - b2.d)[0];
    // 反查该 bbox 中心点上的元素
    const probe = await page.eval(`(() => {
      const cx = ${Math.round((b.x0 + b.x1) / 2)}, cy = ${Math.round((b.y0 + b.y1) / 2)};
      const el = document.elementFromPoint(cx % 1440, cy % innerHeight);
      const stack = [];
      let p = el;
      while (p && stack.length < 4) { stack.push(p.tagName.toLowerCase() + (p.getAttribute('class') ? '.' + p.getAttribute('class').split(/\\s+/)[0] : '')); p = p.parentElement; }
      const cs = el ? getComputedStyle(el) : null;
      return { stack: stack, bg: cs ? cs.backgroundColor : null, opacity: cs ? cs.opacity : null,
               filter: cs ? cs.filter : null, mixBlend: cs ? cs.mixBlendMode : null,
               bgImage: cs ? (cs.backgroundImage || '').slice(0, 90) : null };
    })()`).catch(() => null);
    info.push({
      hex, px: n, share: +(n / totalPx).toFixed(5),
      bbox: { x: b.x0, y: b.y0, w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1 },
      nearestDeclared: near, probeAtCenter: probe,
    });
  }
  report[id] = { docSize: data.docSize, declared: [...declared], top: info };
  console.log('\n=== ' + id + ' (' + totalPx + 'px, 声明 ' + declared.size + ' 色) ===');
  for (const i of info) console.log('  ' + i.hex + '  ' + i.px + 'px (' + (i.share * 100).toFixed(2) + '%)  box ' + i.bbox.w + 'x' + i.bbox.h + '@' + i.bbox.x + ',' + i.bbox.y + '  最近声明色 ' + i.nearestDeclared.hex + ' Δ' + i.nearestDeclared.d.toFixed(1) + '  elem ' + JSON.stringify(i.probeAtCenter && i.probeAtCenter.stack));
}

writeJson('diag-isolated.json', report);
await browser.close();
server.close();
