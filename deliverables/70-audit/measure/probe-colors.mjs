// 任务 A：30 案实际渲染颜色全量采样（元素级声明 + 像素级实际绘制 双轨）。
//
// 关键的一处顺序设计（被 S24 教出来的，见报告自我纠错）：
//   第一版先在小视口测量、再放大视口截图。结果 S24 的六张照片在测量时
//   opacity:0（滚动揭示动画没触发），没进 rasterRects；而放大视口后
//   IntersectionObserver 触发、照片显现、被截进图里 ——
//   「遮罩」和「截图」来自两个不同的页面状态，照片像素全被算成孤立色。
//   现在的顺序是：先撑到整页高度 → 滚通全页触发揭示 → 等稳定 →
//   在**同一个状态**下先收集（含 rasterRects）再截图。
import { startServer, launch, gotoStable, cases, writeJson, sleep } from './lib.mjs';
import { HELPERS } from './inpage.mjs';
import { COLLECT } from './collect.mjs';
import { decodePNG } from './png.mjs';
import { analyzePixels, rasterMask } from './classify.mjs';

const PORT = 8610;

const server = await startServer(PORT);
const browser = await launch();
const page = await browser.newPage();

const all = cases();
const result = {};
const t0 = Date.now();

// 等距抽样版（step=1 即逐像素）。抽样不改比例，只降计算量。
async function analyzePixelsSampled(img, declared, photoMask, inkMask, step) {
  if (step === 1) return analyzePixels(img, declared, photoMask, inkMask);
  const { width, height } = img;
  const sw = Math.ceil(width / step), sh = Math.ceil(height / step);
  const sub = { width: sw, height: sh, data: new Uint8Array(sw * sh * 4) };
  for (let y = 0, sy = 0; y < height; y += step, sy++) {
    for (let x = 0, sx = 0; x < width; x += step, sx++) {
      const s = (y * width + x) * 4, d = (sy * sw + sx) * 4;
      sub.data[d] = img.data[s]; sub.data[d+1] = img.data[s+1]; sub.data[d+2] = img.data[s+2]; sub.data[d+3] = img.data[s+3];
    }
  }
  const down = (mask) => {
    if (!mask) return null;
    const m = new Uint8Array(sw * sh);
    for (let y = 0, sy = 0; y < height; y += step, sy++)
      for (let x = 0, sx = 0; x < width; x += step, sx++) m[sy * sw + sx] = mask[y * width + x];
    return m;
  };
  const r = analyzePixels(sub, declared, down(photoMask), down(inkMask));
  r.sampled = step; r.totalPixels = width * height;
  return r;
}

// 滚通全页：触发 IntersectionObserver 的揭示动画，让「截图里的样子」= 「测量时的样子」
async function revealAll(page, docH) {
  const stepPx = 700;
  for (let y = 0; y < docH; y += stepPx) {
    await page.eval(`(() => { window.scrollTo(0, ${y}); return window.scrollY; })()`);
    await sleep(45);
  }
  await page.eval(`(() => { window.scrollTo(0, 0); return window.scrollY; })()`);
  await sleep(260);
}

for (const c of all) {
  await page.setViewport({ width: 1440, height: 900, mobile: false });
  await gotoStable(page, `http://127.0.0.1:${PORT}/prototypes/${c.dir}/index.html`, 900);

  // 1) 撑到整页高度（两次，因为撑高后文档可能变长）
  let docH = await page.eval(`document.documentElement.scrollHeight`);
  let maxH = Math.min(docH, 14000);
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: maxH, deviceScaleFactor: 1, mobile: false });
  await sleep(420);
  docH = await page.eval(`document.documentElement.scrollHeight`);
  maxH = Math.min(Math.max(maxH, docH), 14000);
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: maxH, deviceScaleFactor: 1, mobile: false });
  await sleep(260);

  // 2) 滚通触发揭示，回到顶部
  await revealAll(page, maxH);

  // 3) 同一状态下先收集、再截图
  const data = await page.eval(HELPERS + COLLECT);
  if (!data || !data.colors) { console.log(c.id + ': 收集失败'); continue; }
  const shot = await page.screenshot({ format: 'png', clip: { x: 0, y: 0, width: 1440, height: maxH, scale: 1 } });
  const png = decodePNG(Buffer.from(shot, 'base64'));

  const declared = data.colors.map((x) => x.hex);
  const photoMask = rasterMask(png, data.rasterRects || [], 1);
  const inkMask = rasterMask(png, (data.inkRects || []).map((r) => ({ x: r[0], y: r[1], w: r[2] - r[0], h: r[3] - r[1] })), 1);
  const px = await analyzePixelsSampled(png, declared, photoMask, inkMask, png.width * png.height > 4e6 ? 2 : 1);

  const totalPx = px.counted;
  const colors = data.colors.map((x) => {
    const painted = px.perHex.get(x.hex) || 0;
    return {
      hex: x.hex,
      count: x.count,
      area: Math.round(x.area * 100) / 100,
      areaShare: data.docSize.w * data.docSize.h ? +(x.area / (data.docSize.w * data.docSize.h)).toFixed(5) : 0,
      areaInk: Math.round((x.areaInk || 0) * 100) / 100,
      paintedPx: painted,
      paintedShare: totalPx ? +(painted / totalPx).toFixed(5) : 0,
      onBodyText: x.onBodyText,
      props: x.props, tags: x.tags, roles: x.roles, areaBasis: x.areaBasis,
      samples: x.samples,
    };
  });

  result[c.id] = {
    id: c.id, dir: c.dir,
    viewport: data.viewport, docSize: data.docSize, shotSize: { w: png.width, h: png.height },
    htmlBg: data.htmlBg, bodyBg: data.bodyBg,
    elementCount: data.elementCount,
    useInternalUnknown: data.useInternalUnknown,
    photoRects: (data.rasterRects || []).length,
    colors,
    pixel: {
      counted: totalPx,
      sampled: px.sampled || 1,
      uniqueColors: px.uniqueColors,
      kinds: px.kinds,
      isoShare: totalPx ? +(px.kinds.isolated / totalPx).toFixed(5) : null,
      near: (px.near || []).slice(0, 20).map(([hex, n]) => ({ hex, px: n, share: +(n / totalPx).toFixed(6) })),
      isolated: px.isolated.slice(0, 40).map(([hex, n]) => ({ hex, px: n, share: +(n / totalPx).toFixed(6) })),
      blendPairs: px.blendPairs.slice(0, 20).map(([k, n]) => ({ pair: k, px: n })),
    },
  };
  console.log(`${c.id}: ${colors.length}色 元素${data.elementCount} 照片${(data.rasterRects||[]).length} 像素${totalPx} 孤立${(px.kinds.isolated/totalPx*100).toFixed(3)}% 近邻${(px.kinds.near/totalPx*100).toFixed(2)}% 混合${((px.kinds.aa+px.kinds.alpha)/totalPx*100).toFixed(2)}% 色种${px.uniqueColors}`);
}

writeJson('colors-30.json', result);
console.log(`\n完成 ${Object.keys(result).length} 案，用时 ${((Date.now() - t0) / 1000).toFixed(0)}s`);
await browser.close();
server.close();
