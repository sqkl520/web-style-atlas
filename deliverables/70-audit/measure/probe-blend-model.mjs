// 实验：Chrome 的抗锯齿/半透明合成到底在哪个色彩空间做？
// 这决定了「集合外色」判定里，哪些像素该被认作两色的过渡（可忽略），哪些是真第三种色。
// 方法：造一个已知的 红字-#C1121F 压 纸底-#EFE7D7 的样本，把 AA 斜坡上的像素全取出来，
//       分别用 sRGB 直线插值、线性光(linear-light)插值去拟合，看哪个残差小。
import { startServer, launch, gotoStable, writeJson } from './lib.mjs';
import { decodePNG, srgbToLab, hexToRgb, dE76 } from './png.mjs';

const F = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#EFE7D7}
  /* 造一条 45° 斜边，天然产生一条长 AA 斜坡：红块压纸底 */
  #wedge{position:absolute;left:0;top:0;width:600px;height:600px;background:#C1121F;
         clip-path:polygon(0 0, 100% 0, 0 100%)}
  #box{position:absolute;left:700px;top:0;width:300px;height:300px;background:#1A1614}
  /* 半透明叠加：50% 红压在纸底上 */
  #alpha{position:absolute;left:700px;top:400px;width:300px;height:300px;background:rgba(193,18,31,.5)}
  /* 文字 AA */
  #txt{position:absolute;left:20px;top:640px;font:700 120px/1 sans-serif;color:#C1121F;background:transparent}
</style></head><body>
<div id="wedge"></div><div id="box"></div><div id="alpha"></div>
<div id="txt">AAA</div>
</body></html>`;

const server = await startServer(8604, new Map([['/__f/blend.html', F]]));
const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });
await gotoStable(page, 'http://127.0.0.1:8604/__f/blend.html', 400);
const shot = await page.screenshot({ format: 'png' });
const png = decodePNG(Buffer.from(shot, 'base64'));

const RED = [193, 18, 31], PAPER = [239, 231, 215];
const s2l = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const l2s = (c) => { c = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return c * 255; };

// 收集「红-纸」之间的过渡像素（手动限定在楔形斜边附近与文字 AA 区）
const samples = [];
const { width, data } = png;
const inRange = (v, a, b) => v >= Math.min(a, b) - 6 && v <= Math.max(a, b) + 6;
for (let y = 0; y < 900; y++) {
  for (let x = 0; x < 1440; x++) {
    const d = (y * width + x) * 4;
    const p = [data[d], data[d + 1], data[d + 2]];
    if (!inRange(p[0], RED[0], PAPER[0]) || !inRange(p[1], RED[1], PAPER[1]) || !inRange(p[2], RED[2], PAPER[2])) continue;
    const isExact = (p[0] === RED[0] && p[1] === RED[1] && p[2] === RED[2]) || (p[0] === PAPER[0] && p[1] === PAPER[1] && p[2] === PAPER[2]);
    if (isExact) continue;
    samples.push(p);
  }
}

// 模型 A：sRGB 直线插值
// 模型 B：线性光插值
let errA = 0, errB = 0;
const projErr = (p, model) => {
  let best = Infinity;
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    let q;
    if (model === 'srgb') q = [0, 1, 2].map((k) => RED[k] + (PAPER[k] - RED[k]) * t);
    else q = [0, 1, 2].map((k) => l2s(s2l(RED[k]) + (s2l(PAPER[k]) - s2l(RED[k])) * t));
    const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    if (d < best) best = d;
  }
  return best;
};
for (const p of samples) { errA += projErr(p, 'srgb'); errB += projErr(p, 'linear'); }
const n = samples.length || 1;

// 半透明叠加实测：rgba(193,18,31,.5) 压纸底
const alphaPixel = (() => {
  const d = (500 * width + 850) * 4;
  return [data[d], data[d + 1], data[d + 2]];
})();
const srgbMix = [0, 1, 2].map((k) => Math.round(RED[k] * 0.5 + PAPER[k] * 0.5));
const linMix = [0, 1, 2].map((k) => Math.round(l2s(s2l(RED[k]) * 0.5 + s2l(PAPER[k]) * 0.5)));

const result = {
  sampleCount: n,
  meanErrSrgb: errA / n,
  meanErrLinear: errB / n,
  verdict: errB < errA ? 'linear-light 更贴合' : 'sRGB 直线更贴合',
  alphaActual: alphaPixel, alphaPredSrgb: srgbMix, alphaPredLinear: linMix,
  alphaErrSrgb: Math.hypot(...[0, 1, 2].map((k) => alphaPixel[k] - srgbMix[k])),
  alphaErrLinear: Math.hypot(...[0, 1, 2].map((k) => alphaPixel[k] - linMix[k])),
  sampleSpread: samples.slice(0, 12),
};
console.log(JSON.stringify(result, null, 1));
writeJson('blend-model.json', result);
await browser.close();
server.close();
