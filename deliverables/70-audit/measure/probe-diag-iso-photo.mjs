// 诊断：剩余孤立像素在不在照片矩形内？如果在内，说明遮罩没覆盖全（坐标/状态不一致）。
// 这是判断「我的孤立色数字还能不能信」的最后一个关口。
import { startServer, launch, gotoStable, cases, writeJson, sleep } from './lib.mjs';
import { HELPERS } from './inpage.mjs';
import { COLLECT } from './collect.mjs';
import { decodePNG } from './png.mjs';
import { analyzePixels, rasterMask } from './classify.mjs';

const ids = process.argv.slice(2).filter((a) => /^S\d\d$/.test(a));
const server = await startServer(8650);
const browser = await launch();
const page = await browser.newPage();
const out = {};

for (const id of ids) {
  const dir = cases().find((c) => c.id === id).dir;
  await page.setViewport({ width: 1440, height: 900, mobile: false });
  await gotoStable(page, `http://127.0.0.1:${server.address().port}/prototypes/${dir}/index.html`, 900);
  let docH = await page.eval(`document.documentElement.scrollHeight`);
  let maxH = Math.min(docH, 14000);
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: maxH, deviceScaleFactor: 1, mobile: false });
  await sleep(400);
  for (let y = 0; y < maxH; y += 700) { await page.eval(`window.scrollTo(0,${y})`); await sleep(40); }
  await page.eval(`window.scrollTo(0,0)`); await sleep(250);

  const data = await page.eval(HELPERS + COLLECT);
  const shot = await page.screenshot({ format: 'png', clip: { x: 0, y: 0, width: 1440, height: maxH, scale: 1 } });
  const png = decodePNG(Buffer.from(shot, 'base64'));
  const declared = data.colors.map((x) => x.hex);

  // 不用 mask，逐像素判定，然后看孤立像素的坐标分布
  const px = analyzePixels(png, declared, null);
  const mask = rasterMask(png, data.rasterRects || [], 1);
  // 统计孤立像素：在全图 vs 照片矩形内 vs 照片矩形外
  let isoTotal = 0, isoInPhoto = 0, isoOutPhoto = 0;
  const isoByBand = new Map();
  const cls = (await import('./classify.mjs')).makeClassifier(declared);
  for (let i = 0; i < png.width * png.height; i++) {
    const d = i * 4;
    const c = cls([png.data[d], png.data[d + 1], png.data[d + 2]]);
    if (c.kind !== 'isolated') continue;
    isoTotal++;
    if (mask[i]) isoInPhoto++; else {
      isoOutPhoto++;
      const y = Math.floor(i / png.width);
      const band = Math.floor(y / 500) * 500;
      isoByBand.set(band, (isoByBand.get(band) || 0) + 1);
    }
  }
  const topBands = [...isoByBand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  out[id] = {
    docH: maxH, photoCount: (data.rasterRects || []).length,
    photoRects: (data.rasterRects || []).slice(0, 8),
    isoTotal, isoInPhoto, isoOutPhoto,
    isoOutPct: +(isoOutPhoto / (png.width * png.height) * 100).toFixed(3),
    topBands,
  };
  console.log(`${id}: 孤立 ${isoTotal}, 照片内 ${isoInPhoto}, 照片外 ${isoOutPhoto} (${out[id].isoOutPct}% 全图)`);
  console.log('   照片矩形: ' + JSON.stringify((data.rasterRects || []).map((r) => [Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h)]).slice(0, 8)));
  console.log('   照片外的孤立像素按 y 段: ' + JSON.stringify(topBands));
}
writeJson('diag-iso-photo.json', out);
await browser.close();
server.close();
