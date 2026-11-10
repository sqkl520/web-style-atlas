// 诊断：孤立像素是不是「文字抗锯齿/次像素渲染」造成的？
// 判据：孤立像素若紧贴文字墨迹矩形（±3px），就是边缘过渡，不是新色。
// 这个实验决定「isolated」这个指标能不能当作「原型用了集合外色」的证据。
import { startServer, launch, gotoStable, cases, writeJson, sleep } from './lib.mjs';
import { HELPERS } from './inpage.mjs';
import { COLLECT } from './collect.mjs';
import { decodePNG } from './png.mjs';
import { makeClassifier } from './classify.mjs';

const ids = process.argv.slice(2).filter((a) => /^S\d\d$/.test(a));
const server = await startServer(8655);
const browser = await launch();
const page = await browser.newPage();
const out = {};

for (const id of ids) {
  const dir = cases().find((c) => c.id === id).dir;
  await page.setViewport({ width: 1440, height: 900, mobile: false });
  await gotoStable(page, `http://127.0.0.1:${server.address().port}/prototypes/${dir}/index.html`, 900);
  let maxH = Math.min(await page.eval(`document.documentElement.scrollHeight`), 14000);
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: maxH, deviceScaleFactor: 1, mobile: false });
  await sleep(400);
  for (let y = 0; y < maxH; y += 700) { await page.eval(`window.scrollTo(0,${y})`); await sleep(35); }
  await page.eval(`window.scrollTo(0,0)`); await sleep(250);

  const data = await page.eval(HELPERS + COLLECT);
  // 收集所有文本节点的墨迹矩形（膨胀 3px）
  const inkRects = await page.eval(`(() => {
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (!n.nodeValue.trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) if (r.width > 0 && r.height > 0)
        out.push([r.x - 3, r.y - 3, r.x + r.width + 3, r.y + r.height + 3]);
    }
    return out;
  })()`);

  const shot = await page.screenshot({ format: 'png', clip: { x: 0, y: 0, width: 1440, height: maxH, scale: 1 } });
  const png = decodePNG(Buffer.from(shot, 'base64'));
  const declared = data.colors.map((x) => x.hex);

  // 照片遮罩
  const mask = new Uint8Array(png.width * png.height);
  for (const r of data.rasterRects || []) {
    const x0 = Math.max(0, Math.floor(r.x)), x1 = Math.min(png.width, Math.ceil(r.x + r.w));
    const y0 = Math.max(0, Math.floor(r.y)), y1 = Math.min(png.height, Math.ceil(r.y + r.h));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) mask[y * png.width + x] = 1;
  }
  // 墨迹遮罩（粗网格加速）
  const GRID = 32;
  const gw = Math.ceil(png.width / GRID), gh = Math.ceil(png.height / GRID);
  const grid = new Uint8Array(gw * gh);
  for (const [x0, y0, x1, y1] of inkRects) {
    const gx0 = Math.max(0, Math.floor(x0 / GRID)), gx1 = Math.min(gw - 1, Math.floor(x1 / GRID));
    const gy0 = Math.max(0, Math.floor(y0 / GRID)), gy1 = Math.min(gh - 1, Math.floor(y1 / GRID));
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) grid[gy * gw + gx] = 1;
  }

  const cls = makeClassifier(declared);
  let iso = 0, isoNearText = 0, isoFar = 0, isoInPhoto = 0;
  const farColors = new Map();
  for (let i = 0; i < png.width * png.height; i++) {
    const d = i * 4;
    const c = cls([png.data[d], png.data[d + 1], png.data[d + 2]]);
    if (c.kind !== 'isolated') continue;
    iso++;
    if (mask[i]) { isoInPhoto++; continue; }
    const x = i % png.width, y = Math.floor(i / png.width);
    if (grid[Math.floor(y / GRID) * gw + Math.floor(x / GRID)]) isoNearText++;
    else {
      isoFar++;
      const hex = '#' + [png.data[d], png.data[d + 1], png.data[d + 2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
      farColors.set(hex, (farColors.get(hex) || 0) + 1);
    }
  }
  const total = png.width * png.height;
  out[id] = { total, iso, isoInPhoto, isoNearText, isoFar,
    isoFarPct: +(isoFar / total * 100).toFixed(4),
    isoNearTextPct: +(isoNearText / total * 100).toFixed(4),
    farTop: [...farColors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8) };
  console.log(`${id}: 孤立 ${iso} = 照片内 ${isoInPhoto} + 文字边缘 ${isoNearText} + 真远离 ${isoFar} (${out[id].isoFarPct}%)`);
  console.log('   远离文字的孤立色 top: ' + JSON.stringify(out[id].farTop));
}
writeJson('diag-iso-text.json', out);
await browser.close();
server.close();
