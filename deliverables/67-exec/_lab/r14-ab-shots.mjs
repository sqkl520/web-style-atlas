// r14-ab-shots.mjs — 精确 A/B：同一份当前页面，只把本轮改的 4 条声明用 CSS 覆盖回改前值。
// 这样"改前/改后"是同一棵树、同一套并发改动，差异只来自本轮的 4 条声明。
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const outDir = process.argv[2];

const REVERT = `
.mast h1 { font-size: clamp(30px, 4vw, 56px); }
.scene-tpl { font-size: 11px; }
.cap { font-size: 12px; }
@media (max-width: 620px) { .shot figcaption { font-size: 11px; } }
`;
const REVERT_WITH_EMOJI = REVERT + `/* ⚠ 只是视觉还原，DOM 里的文字由下面的 JS 补回 */`;

const browser = await Browser.launch();
try {
  for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
    for (const mode of ['before', 'after']) {
      const page = await browser.newPage({ width: w, height: h, mobile: w <= 620 });
      await page.setViewport({ width: w, height: h, mobile: w <= 620 });
      await page.goto(PAGE, { settleMs: 1200 });
      await page.eval(`(async () => { if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} } return 1; })()`);
      if (mode === 'before') {
        await page.eval(`(function(){
          var s=document.createElement('style'); s.id='__ab';
          s.textContent=${JSON.stringify(REVERT)};
          document.head.appendChild(s);
          // 把 ⚠ 前缀补回去，让"改前"连 emoji 一起还原
          Array.prototype.forEach.call(document.querySelectorAll('.cap-warn'), function (c) {
            if (c.textContent.indexOf('⚠') === -1) c.textContent = '⚠ ' + c.textContent.trim();
          });
          return 1;})()`);
        await new Promise((r) => setTimeout(r, 250));
      }
      await page.screenshot({ path: join(outDir, `ab-${mode}-${w}.png`), format: 'png' });
      const c = JSON.parse(await page.eval(`JSON.stringify((function(){var r=document.querySelector('#ledger .row'); if(!r) return null; var b=r.getBoundingClientRect(); return {x:0,y:Math.max(0,b.top),width:window.innerWidth,height:Math.min(b.height, window.innerHeight-Math.max(0,b.top))};})())`));
      if (c && c.height > 10) await page.screenshot({ path: join(outDir, `ab-${mode}-${w}-firstcard.png`), format: 'png', clip: c });
      console.log(`${mode}-${w}`);
      await page.close();
    }
  }
} finally { await browser.close(); }
