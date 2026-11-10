// 受控实验 5：拼图输入从 JPEG 换成 PNG（同一源图转出，字节固定），其余完全相同。
// JPEG 输入抖、PNG 输入不抖 ⇒ 根因是 JPEG 解码；两者都抖 ⇒ 根因在缩放/栅格化。
import { Browser } from 'file:///D:/Web/style/prototypes/_build/vendor/cdp.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const OUT = 'deliverables/75-q2/_det/determinism/exp5';
mkdirSync(OUT, { recursive: true });
const sha = (b) => createHash('sha256').update(b).digest('hex');
const cols = 3, cellW = 512, cellH = 683;

async function trial(label, b64src, mime) {
  const pngs = [];
  for (let launch = 0; launch < 5; launch++) {
    const browser = await Browser.launch({ width: 1600, height: 1000 });
    const helper = await browser.newPage({ width: 1600, height: 1000 });
    await helper.setViewport({ width: cols * cellW, height: 2 * cellH, dsf: 1 });
    await helper.eval((a) => {
      document.body.style.cssText = `margin:0;background:#888;display:grid;grid-template-columns:repeat(${a.cols},${a.cellW}px)`;
      document.body.innerHTML = Array.from({ length: 6 }, () => `<img src="data:${a.mime};base64,${a.s}" style="width:${a.cellW}px;height:${a.cellH}px;display:block;outline:1px solid #888">`).join('');
      return Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    }, { s: b64src, cols, cellW, cellH, mime });
    const png = Buffer.from(await helper.screenshot({ format: 'png' }), 'base64');
    pngs.push(png);
    writeFileSync(join(OUT, `${label}-${launch}.png`), png);
    await helper.close();
    await browser.close();
  }
  const u = new Set(pngs.map(sha)).size;
  console.log(`${label}: PNG unique=${u}  sizes=${pngs.map((p) => p.length).join(',')}`);
  return { u, pngs };
}

const jpgB64 = readFileSync('deliverables/75-q2/_det/determinism/run1/tablet-fold.jpg').toString('base64');
const pngB64 = readFileSync('deliverables/75-q2/_det/determinism/fold-src.png').toString('base64');

console.log('--- JPEG 输入 ---');
const j = await trial('jpeg', jpgB64, 'image/jpeg');
console.log('--- PNG 输入（同一 fold 由 ffmpeg 转出）---');
const p = await trial('png', pngB64, 'image/png');
console.log(`\nJPEG 输入 unique=${j.u}   PNG 输入 unique=${p.u}`);
console.log('DONE');
process.exit(0);
