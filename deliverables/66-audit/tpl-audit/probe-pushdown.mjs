// 设计工作室：有直连方案 S08，但模板带把三行方案全部推到首屏之下。取证截图。
import http from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const OUT = 'D:/Web/style/deliverables/66-audit';
const PORT = 9599;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  let f = join(ROOT, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html`, { settleMs: 2000 });

for (const [term, tag] of [['设计工作室', 'studio'], ['烘焙', 'bake'], ['作品集', 'portfolio']]) {
  await p.eval(`(() => { document.getElementById('reset').click(); const q=document.getElementById('q'); q.value=${JSON.stringify(term)}; q.dispatchEvent(new Event('input',{bubbles:true})); scrollTo(0,0); })()`);
  await sleep(450);
  const m = await p.eval(`(() => {
    const r = (sel) => { const el=document.querySelector(sel); if(!el) return null; const b=el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), visible: b.top < innerHeight }; };
    return { vh: innerHeight, strip: r('#tpl-strip'), firstRow: r('#ledger .row'), rows: document.querySelectorAll('#ledger .row').length, count: document.getElementById('count').textContent };
  })()`);
  console.log(term, JSON.stringify(m));
  // 首屏截图（不滚动）
  await p.screenshot({ path: `${OUT}/shots/26-firstscreen-${tag}.png`, format: 'png' });
  // 在首屏里模板卡占了几成高度
  const ratio = await p.eval(`(() => {
    const s = document.getElementById('tpl-strip'); if (!s || s.hidden) return null;
    const b = s.getBoundingClientRect();
    const visible = Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0));
    return { stripVisiblePx: Math.round(visible), pctOfViewport: Math.round(visible / innerHeight * 100) };
  })()`);
  console.log('   模板带占首屏:', JSON.stringify(ratio));
}

await b.close(); server.close();
