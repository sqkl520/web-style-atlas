// 受控实验 4：与 exp3 完全相同，但改成截 PNG（无损）。
// 若 PNG 也抖 ⇒ 拼图栅格化本身不确定；若 PNG 全等而 JPEG 抖 ⇒ 仅编码器在该内容上不确定。
import { Browser } from 'file:///D:/Web/style/prototypes/_build/vendor/cdp.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const OUT = 'deliverables/75-q2/_det/determinism/exp4';
mkdirSync(OUT, { recursive: true });
const sha = (b) => createHash('sha256').update(b).digest('hex');

const foldBuf = readFileSync('deliverables/75-q2/_det/determinism/run1/tablet-fold.jpg');
const b64 = foldBuf.toString('base64');
const frames = Array(6).fill(b64);
const cols = 3, cellW = 512, cellH = 683;

const pngs = [], jpgs = [];
for (let launch = 0; launch < 6; launch++) {
  const browser = await Browser.launch({ width: 1600, height: 1000 });
  const helper = await browser.newPage({ width: 1600, height: 1000 });
  await helper.setViewport({ width: cols * cellW, height: Math.ceil(frames.length / cols) * cellH, dsf: 1 });
  await helper.eval((a) => {
    document.body.style.cssText = `margin:0;background:#888;display:grid;grid-template-columns:repeat(${a.cols},${a.cellW}px)`;
    document.body.innerHTML = a.frames.map((s) => `<img src="data:image/jpeg;base64,${s}" style="width:${a.cellW}px;height:${a.cellH}px;display:block;outline:1px solid #888">`).join('');
    return Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  }, { frames, cols, cellW, cellH });
  // 先 PNG 再 JPEG，同一页面同一帧
  const png = Buffer.from(await helper.screenshot({ format: 'png' }), 'base64');
  const jpg = Buffer.from(await helper.screenshot({ format: 'jpeg', quality: 76 }), 'base64');
  pngs.push(png); jpgs.push(jpg);
  writeFileSync(join(OUT, `s${launch}.png`), png);
  writeFileSync(join(OUT, `s${launch}.jpg`), jpg);
  console.log(`launch ${launch}: PNG ${sha(png).slice(0, 20)} (${png.length}B)  JPEG ${sha(jpg).slice(0, 20)} (${jpg.length}B)`);
  await helper.close();
  await browser.close();
}
const bd = (x, y) => { if (x.length !== y.length) return `LEN ${x.length}/${y.length}`; let n = 0, f = -1; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) { n++; if (f < 0) f = i; } return `不同=${n} 首差=${f}`; };
console.log('\nPNG unique=', new Set(pngs.map(sha)).size, ' JPEG unique=', new Set(jpgs.map(sha)).size);
for (let i = 1; i < 6; i++) console.log(`s0 vs s${i}: PNG ${bd(pngs[0], pngs[i])} | JPEG ${bd(jpgs[0], jpgs[i])}`);
console.log('DONE');
process.exit(0);
