// 单案测量器：跑三个视口，落 raw json + 三档 fold 截图。
// 用法: node capture.mjs S20 "h1|.canvas|table"（第三参数: 额外几何选择器，| 分隔）
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { IN_PAGE, GEO } from './measure-lib.mjs';

const CASE_ID = process.argv[2];
const EXTRA = (process.argv[3] || '').split('|').filter(Boolean);
const ROOT = 'D:/Web/style/deliverables/69-test';
const dir = join(ROOT, CASE_ID);
mkdirSync(join(dir, 'shots'), { recursive: true });

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900, mobile: false },
  { name: '768', width: 768, height: 1024, mobile: false },
  { name: '390', width: 390, height: 844, mobile: true },
];

const b = await Browser.launch({ width: 1440, height: 900 });
const report = { case: CASE_ID, url: `http://127.0.0.1:9101/${CASE_ID}/index.html`, viewports: {} };

for (const vp of VIEWPORTS) {
  const p = await b.newPage({ width: vp.width, height: vp.height, mobile: vp.mobile });
  await p.goto(report.url, { settleMs: 500 });
  // 坑 3：document.fonts.ready 之后再等 1.5s
  await p.eval('document.fonts && document.fonts.ready ? document.fonts.ready.then(()=>true) : true');
  await sleep(1500);

  const raw = await p.eval(IN_PAGE);
  let geo = null;
  if (EXTRA.length) {
    geo = await p.eval(`(${GEO})(${JSON.stringify(EXTRA)})`);
  }

  // 字体实际渲染族
  await p.send('DOM.enable');
  await p.send('CSS.enable');
  const { root } = await p.send('DOM.getDocument', { depth: -1 });
  const fontWho = {};
  for (const sel of ['h1', 'h2', 'body', 'table', '.num', ...EXTRA]) {
    try {
      const { nodeId } = await p.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
      if (!nodeId) { fontWho[sel] = null; continue; }
      const r = await p.send('CSS.getPlatformFontsForNode', { nodeId });
      fontWho[sel] = r.fonts.map((f) => `${f.familyName}(${f.glyphCount})`);
    } catch (e) { fontWho[sel] = 'err: ' + e.message; }
  }

  // 三档 fold 截图（1440 / 768 / 390 各自首屏）
  const shot = join(dir, 'shots', `fold-${vp.name}.jpg`);
  await p.screenshot({ path: shot, format: 'jpeg', quality: 80 });
  // 全页截图（1440 只拍一次，便于人判）
  if (vp.name === '1440') {
    await p.screenshot({ path: join(dir, 'shots', 'full-1440.jpg'), format: 'jpeg', quality: 78, fullPage: true });
  }
  if (vp.name === '390') {
    await p.screenshot({ path: join(dir, 'shots', 'full-390.jpg'), format: 'jpeg', quality: 78, fullPage: true });
  }

  report.viewports[vp.name] = { vp, raw, geo, fontWho, consoleErrors: p.consoleErrors };
  console.log(`[${CASE_ID}] ${vp.name} ok  bodyBg=${raw.bodyBg}  imgs=${raw.imgs.length}  bw=${JSON.stringify(raw.bwSet)}`);
  await p.close();
}

writeFileSync(join(dir, 'raw-measure.json'), JSON.stringify(report, null, 2), 'utf8');
console.log('wrote', join(dir, 'raw-measure.json'));
await b.close();
await sleep(200);
