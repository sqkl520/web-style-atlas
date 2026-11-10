import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9634;
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
const b = await Browser.launch({ width: 390, height: 844 });
const p = await b.newPage({ width: 390, height: 844 });
await p.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html#S07`, { settleMs: 3000 });

const land = await p.eval(`(()=>{
  const d=document.getElementById('detail');
  const r=d.getBoundingClientRect();
  return {hidden:d.hidden, no:document.getElementById('d-no').textContent, hash:location.hash,
    rect:{l:+r.left.toFixed(0),t:+r.top.toFixed(0),w:+r.width.toFixed(0),h:+r.height.toFixed(0)},
    active:document.activeElement.tagName+'.'+String(document.activeElement.className).split(' ')[0],
    scrollY:window.scrollY, detailScrollTop:d.scrollTop,
    currentRow:(()=>{const c=document.querySelector('.row[aria-current="true"]');if(!c)return null;const cr=c.getBoundingClientRect();return {id:c.dataset.id,t:+cr.top.toFixed(0),visible:cr.top<innerHeight&&cr.bottom>0};})()};
})()`);
// tab from body and see if focus lands behind the overlay
const seq = [];
for (let i = 0; i < 6; i++) {
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await sleep(60);
  seq.push(await p.eval(`(()=>{
    const a=document.activeElement;const d=document.getElementById('detail');
    const inD=d.contains(a);const r=a.getBoundingClientRect();
    const cx=Math.min(Math.max(r.left+r.width/2,1),innerWidth-1), cy=Math.min(Math.max(r.top+r.height/2,1),innerHeight-1);
    const top=document.elementFromPoint(cx,cy);
    return {t:a.tagName,cls:String(a.className).split(' ')[0],txt:(a.textContent||'').trim().slice(0,12),inD, behindOverlay: !inD && top ? d.contains(top) : false};
  })()`));
}
// can the user close it? find visible close button
const closeVis = await p.eval(`(()=>{const c=document.getElementById('d-close');const r=c.getBoundingClientRect();return {t:+r.top.toFixed(0),l:+r.left.toFixed(0),w:+r.width.toFixed(0),h:+r.height.toFixed(0),inViewport:r.top<innerHeight&&r.bottom>0};})()`);
// Escape from body closes?
await p.eval(`document.body.focus();`);
await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await sleep(300);
const escFromBody = await p.eval(`({hidden:document.getElementById('detail').hidden, active:document.activeElement.tagName})`);

console.log(JSON.stringify({ land, tabSeq: seq, closeVis, escFromBody }, null, 2));
await b.close(); server.close();
