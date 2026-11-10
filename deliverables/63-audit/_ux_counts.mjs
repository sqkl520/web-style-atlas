import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9626;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototypes/_selection/index.html';
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(PORT, r));
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html`, { settleMs: 3000 });

const r = await p.eval(`(()=>{
  const q=s=>document.querySelector(s);const qa=s=>[...document.querySelectorAll(s)];
  const railBlocks=qa('.rail-block');
  const chipGroups=qa('.chips');
  const counts=chipGroups.map(g=>({id:g.id, n:g.querySelectorAll('button').length, label:(g.previousElementSibling||{}).textContent}));
  const totalChips=qa('.chips button').length;
  const moreChips=qa('.scene-more button').length;
  const sumLabel=q('.rail-fold-sum').textContent;
  // heading per field
  const detailHeadings=qa('#d-body h1,#d-body h2,#d-body h3,#d-body h4,#d-body [role=heading]').length;
  const dts=qa('#d-body dt').length;
  // how many tab stops from top to first row
  const foc=qa('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
  let firstRowIdx=foc.findIndex(e=>e.classList&&e.classList.contains('row'));
  // mast composition
  const R=e=>{const x=e.getBoundingClientRect();return{h:+x.height.toFixed(1),t:+x.top.toFixed(1)}};
  const mast=qa('.mast > *').map(e=>({tag:e.className||e.tagName,h:+e.getBoundingClientRect().height.toFixed(1)}));
  const mastFold=R(q('#mast-fold'));
  return {
    railBlocks: railBlocks.length, chipGroups: chipGroups.length, counts, totalChips, moreChips,
    sumLabel: sumLabel.trim(), actualChipTotal: totalChips+moreChips,
    detailHeadings, dts, firstRowTabIndex: firstRowIdx, focusableCount: foc.length,
    mastComposition: mast, mastFoldH: mastFold.h,
    mastH: R(q('.mast')).h, mastFoldOpen: q('#mast-fold').open,
    selfGateH: R(q('#self-gate')).h, exitH: R(q('#tpl-exit')).h, claimH: R(q('.mast-claim')).h,
  };
})()`);

// count tab presses from page top to first row
const p2 = await b.newPage({ width: 1440, height: 900 });
await p2.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html`, { settleMs: 2600 });
let tabs = 0, reached = null;
await p2.eval(`document.body.setAttribute('tabindex','-1');document.body.focus();`);
for (let i = 0; i < 60; i++) {
  await p2.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await p2.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await sleep(15);
  tabs++;
  const st = await p2.eval(`(()=>{const a=document.activeElement;return {cls:String(a.className).split(' ')[0], isRow:a.classList&&a.classList.contains('row')};})()`);
  if (st.isRow) { reached = tabs; break; }
}
await p2.close();

// detail: count tab stops from panel head to copy button and to first field content
const p3 = await b.newPage({ width: 1440, height: 900 });
await p3.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html`, { settleMs: 2600 });
await p3.eval(`document.querySelector('.row').click()`);
await sleep(400);
const detailTabs = [];
for (let i = 0; i < 6; i++) {
  await p3.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await p3.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await sleep(30);
  detailTabs.push(await p3.eval(`(()=>{const a=document.activeElement;return String(a.className).split(' ')[0]||a.tagName;})()`));
}
// after copy keyboard: where is focus
await p3.eval(`document.querySelector('.prompt-copy').focus()`);
await p3.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await p3.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await sleep(700);
const afterCopyFocus = await p3.eval(`(()=>{const a=document.activeElement;return {t:a.tagName,cls:String(a.className).split(' ')[0],inDetail:document.getElementById('detail').contains(a)};})()`);
await p3.close();

console.log(JSON.stringify({ railAudit: r, tabsToFirstRow: reached, detailTabs, afterCopyFocus }, null, 2));
await b.close(); server.close();
