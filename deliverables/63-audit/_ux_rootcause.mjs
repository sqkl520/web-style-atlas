import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9629;
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

// A) focus-loss root cause: blur happens because execCopySync's temp textarea is removed
const foc = await p.eval(`(()=>{
  document.querySelector('.row').click();
  const btn=document.querySelector('.prompt-copy');
  btn.focus();
  const before=document.activeElement.className;
  // instrument: watch focus moves
  const log=[];
  document.addEventListener('focusin',e=>log.push('in:'+(e.target.tagName+'.'+String(e.target.className).split(' ')[0])),true);
  document.addEventListener('focusout',e=>log.push('out:'+(e.target.tagName+'.'+String(e.target.className).split(' ')[0])),true);
  btn.click();
  const after=document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0];
  return {before, after, log, tempTa: !!document.querySelector('textarea[style*="opacity:0"]')};
})()`);

// B) near chips unstyled?
const near = await p.eval(`(()=>{
  const more=document.querySelector('.scene-more');
  const inChips = more.closest('.chips') !== null;
  const parent = more.parentElement.className;
  more.style.display='';
  const b = more.querySelector('button');
  const cs=getComputedStyle(b);
  const direct=document.querySelector('.scene-chip.is-direct');
  const dcs=getComputedStyle(direct);
  const R=e=>{const r=e.getBoundingClientRect();return{w:+r.width.toFixed(1),h:+r.height.toFixed(1)}};
  return {moreInsideChips:inChips, moreParent:parent,
    nearCS:{font:b.style.font||cs.fontSize, border:cs.borderStyle+' '+cs.borderWidth, bg:cs.backgroundColor, radius:cs.borderRadius, color:cs.color, pad:cs.padding, h:R(b).h},
    directCS:{font:dcs.fontSize, border:dcs.borderStyle+' '+dcs.borderWidth, bg:dcs.backgroundColor, color:dcs.color, pad:dcs.padding, h:R(direct).h},
    identicalFont: cs.fontSize===dcs.fontSize, identicalBorder: cs.borderStyle===dcs.borderStyle,
    nearCount: more.querySelectorAll('button').length};
})()`);

// C) ArrowDown on a focused ROW (li) -> does it change scheme?
await p.eval(`(()=>{document.getElementById('d-close').click(); document.querySelector('.row').focus(); return true})()`);
const rowBefore = await p.eval(`({hidden:document.getElementById('detail').hidden, active:document.activeElement.tagName})`);
await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 });
await sleep(400);
const rowAfterArrow = await p.eval(`({hidden:document.getElementById('detail').hidden, no:document.getElementById('d-no').textContent, scrollY:window.scrollY, active:document.activeElement.className})`);

// D) Type letters in search: does 'j' insert or jump? and does it keep focus?
await p.eval(`(()=>{document.getElementById('d-close').click();document.getElementById('detail').hidden=true;const q=document.getElementById('q');q.focus();q.value='';return true})()`);
await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'j', code: 'KeyJ', windowsVirtualKeyCode: 74, text: 'j' });
await p.send('Input.dispatchKeyEvent', { type: 'char', key: 'j', text: 'j' });
await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'j', code: 'KeyJ', windowsVirtualKeyCode: 74 });
await sleep(250);
const typeJ = await p.eval(`({val:document.getElementById('q').value, hidden:document.getElementById('detail').hidden, count:document.getElementById('count').textContent})`);

// E) tabindex on rows: focus visible outline?
await p.eval(`(()=>{const q=document.getElementById('q');q.value='';q.dispatchEvent(new Event('input',{bubbles:true}));return true})()`); await sleep(400);
const rowFocus = await p.eval(`(()=>{const r=document.querySelector('.row');if(!r)return null;r.focus();const cs=getComputedStyle(r);return {outline:cs.outlineStyle+' '+cs.outlineWidth+' '+cs.outlineColor, fv:r.matches(':focus-visible'), boxShadow:cs.boxShadow};})()`);

// F) rail-fold label accuracy
const label = await p.eval(`(()=>{
  const all=[...document.querySelectorAll('.chips button')].length;
  const more=document.querySelectorAll('.scene-more button').length;
  const sum=document.querySelector('.rail-fold-sum').textContent.trim();
  return {renderedChips:all, moreChips:more, total:all+more, sumLabel:sum};
})()`);

console.log(JSON.stringify({ foc, near, rowBefore, rowAfterArrow, typeJ, rowFocus, label }, null, 2));
await b.close(); server.close();
