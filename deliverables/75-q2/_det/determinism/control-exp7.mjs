// 受控实验 7：把拼图输入换成纯色 PNG。
// 若稳定 ⇒ 合成管线本身确定，抖动来自「图像内容（齿孔 SVG 点线）的亚像素栅格化」；
// 若仍抖 ⇒ 连纯色合成都不确定，问题更底层。
import { Browser } from 'file:///D:/Web/style/prototypes/_build/vendor/cdp.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const OUT = 'deliverables/75-q2/_det/determinism/exp7';
mkdirSync(OUT, { recursive: true });
const sha = (b) => createHash('sha256').update(b).digest('hex');
const cols = 3, cellW = 512, cellH = 683;

async function trial(label, b64, mime) {
  const out = [];
  for (let l = 0; l < 5; l++) {
    const browser = await Browser.launch({ width: 1600, height: 1000 });
    const helper = await browser.newPage({ width: 1600, height: 1000 });
    await helper.setViewport({ width: cols * cellW, height: 2 * cellH, dsf: 1 });
    await helper.eval((a) => {
      document.body.style.cssText = `margin:0;background:#888;display:grid;grid-template-columns:repeat(${a.cols},${a.cellW}px)`;
      document.body.innerHTML = Array.from({ length: 6 }, () => `<img src="data:${a.mime};base64,${a.s}" style="width:${a.cellW}px;height:${a.cellH}px;display:block;outline:1px solid #888">`).join('');
      return Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    }, { s: b64, cols, cellW, cellH, mime });
    const b = Buffer.from(await helper.screenshot({ format: 'png' }), 'base64');
    out.push(b);
    writeFileSync(join(OUT, `${label}-${l}.png`), b);
    await helper.close(); await browser.close();
  }
  console.log(`${label}: unique=${new Set(out.map(sha)).size} sizes=${out.map((x) => x.length).join(',')}`);
  return new Set(out.map(sha)).size;
}

// 纯色 PNG：用 fold 图替换成一张 1x1 PNG 拉伸（内容为纯色）
const solid = readFileSync('D:/Web/style/deliverables/75-q2/_det/determinism/solid.png').toString('base64');
const u = await trial('solid', solid, 'image/png');
console.log(`\n纯色输入 unique=${u}`);
console.log('DONE');
process.exit(0);
