// 受控实验 6：同一次启动内，拼图完成后立刻截一张、等 1.5s 再截一张。
// 若「首张」抖而「次张」稳定 ⇒ 是栅格化/解码未完成就截图的竞态（可用等待修掉）。
import { Browser, sleep } from 'file:///D:/Web/style/prototypes/_build/vendor/cdp.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const OUT = 'deliverables/75-q2/_det/determinism/exp6';
mkdirSync(OUT, { recursive: true });
const sha = (b) => createHash('sha256').update(b).digest('hex');
const cols = 3, cellW = 512, cellH = 683;
const b64 = readFileSync('deliverables/75-q2/_det/determinism/run1/tablet-fold.jpg').toString('base64');

const early = [], late = [];
for (let launch = 0; launch < 8; launch++) {
  const browser = await Browser.launch({ width: 1600, height: 1000 });
  const helper = await browser.newPage({ width: 1600, height: 1000 });
  await helper.setViewport({ width: cols * cellW, height: 2 * cellH, dsf: 1 });
  await helper.eval((a) => {
    document.body.style.cssText = `margin:0;background:#888;display:grid;grid-template-columns:repeat(${a.cols},${a.cellW}px)`;
    document.body.innerHTML = Array.from({ length: 6 }, () => `<img src="data:image/jpeg;base64,${a.s}" style="width:${a.cellW}px;height:${a.cellH}px;display:block;outline:1px solid #888">`).join('');
    return Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
  }, { s: b64, cols, cellW, cellH });
  const e = Buffer.from(await helper.screenshot({ format: 'png' }), 'base64');
  await sleep(1500);
  const l = Buffer.from(await helper.screenshot({ format: 'png' }), 'base64');
  early.push(e); late.push(l);
  writeFileSync(join(OUT, `e${launch}.png`), e);
  writeFileSync(join(OUT, `l${launch}.png`), l);
  console.log(`launch ${launch}: early ${sha(e).slice(0,16)} (${e.length})  late ${sha(l).slice(0,16)} (${l.length})  ${sha(e)===sha(l)?'同':'**不同**'}`);
  await helper.close();
  await browser.close();
}
console.log(`\nearly unique=${new Set(early.map(sha)).size}   late unique=${new Set(late.map(sha)).size}`);
console.log('DONE');
process.exit(0);
