// r3-shots.mjs — 三档首屏截图（视口截图，不是整页），用于改前/改后对比
//   node r3-shots.mjs <outDir> <tag>
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const outDir = process.argv[2] || join(HERE, 'shots');
const tag = process.argv[3] || 'x';
mkdirSync(outDir, { recursive: true });

const W = [{ w: 1440, h: 900 }, { w: 768, h: 1024 }, { w: 390, h: 844 }];
const browser = await Browser.launch();
try {
  for (const { w, h } of W) {
    const page = await browser.newPage({ width: w, height: h, mobile: w <= 620 });
    await page.setViewport({ width: w, height: h, mobile: w <= 620 });
    await page.goto(PAGE, { settleMs: 1400 });
    await page.eval(`(async () => { if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} } window.scrollTo(0,0); return 1; })()`);
    const p = join(outDir, `${tag}-${w}.png`);
    await page.screenshot({ path: p, format: 'png' });
    // 只截首卡区域，便于逐像素看缩略图与图注
    const clip = await page.eval(`JSON.stringify((function(){var r=document.querySelector('#ledger .row'); if(!r) return null; var b=r.getBoundingClientRect(); return {x:0,y:Math.max(0,b.top),width:window.innerWidth,height:Math.min(b.height, window.innerHeight-Math.max(0,b.top))};})())`);
    const c = JSON.parse(clip);
    if (c && c.height > 10) {
      await page.screenshot({ path: join(outDir, `${tag}-${w}-firstcard.png`), format: 'png', clip: c });
    }
    console.log(`${tag}-${w}.png`);
    await page.close();
  }
} finally { await browser.close(); }
