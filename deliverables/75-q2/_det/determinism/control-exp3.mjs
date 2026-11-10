// 受控实验 3：直接复刻 inspect.mjs 的 sheet() 合成步骤。
// 输入固定为同一份字节（run1 的 6 帧：fold + 5 个滚动帧的替身），只测「缩放+拼图+截图」是否可复现。
// 若这里抖，则抖动在合成层，与页面渲染无关。
import { Browser, sleep } from 'file:///D:/Web/style/prototypes/_build/vendor/cdp.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const OUT = 'deliverables/75-q2/_det/determinism/exp3';
mkdirSync(OUT, { recursive: true });
const sha = (b) => createHash('sha256').update(b).digest('hex');

// 用同一张 fold 当 6 帧（内容不重要，要的是「同一输入字节」）
const foldBuf = readFileSync('deliverables/75-q2/_det/determinism/run1/tablet-fold.jpg');
const b64 = foldBuf.toString('base64');
const frames = Array(6).fill(b64);
const cols = 3, cellW = 512, cellH = 683; // tablet 的真实参数

const results = [];
for (let launch = 0; launch < 5; launch++) {
  const browser = await Browser.launch({ width: 1600, height: 1000 });
  const helper = await browser.newPage({ width: 1600, height: 1000 });
  await helper.setViewport({ width: cols * cellW, height: Math.ceil(frames.length / cols) * cellH, dsf: 1 });
  await helper.eval((a) => {
    document.body.style.cssText = `margin:0;background:#888;display:grid;grid-template-columns:repeat(${a.cols},${a.cellW}px)`;
    document.body.innerHTML = a.frames.map((s) => `<img src="data:image/jpeg;base64,${s}" style="width:${a.cellW}px;height:${a.cellH}px;display:block;outline:1px solid #888">`).join('');
    return Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  }, { frames, cols, cellW, cellH });
  await helper.screenshot({ path: join(OUT, `sheet${launch}.jpg`), quality: 76 });
  const buf = readFileSync(join(OUT, `sheet${launch}.jpg`));
  results.push(buf);
  console.log(`launch ${launch}: ${sha(buf).slice(0, 20)} (${buf.length}B)`);
  await helper.close();
  await browser.close();
}
const bd = (x, y) => { if (x.length !== y.length) return `LEN ${x.length}/${y.length}`; let n = 0, f = -1, offs = []; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) { n++; if (f < 0) f = i; if (offs.length < 16) offs.push(i); } return `不同=${n}/${x.length} 首差=${f}${n ? ' offs=' + offs.join(',') : ''}`; };
console.log('\nunique=', new Set(results.map(sha)).size);
for (let i = 1; i < results.length; i++) console.log(`s0 vs s${i}: ${bd(results[0], results[i])}`);
console.log('DONE');
process.exit(0);
