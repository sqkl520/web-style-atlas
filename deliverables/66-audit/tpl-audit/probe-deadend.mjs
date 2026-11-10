// 空状态给的恢复建议（"点左侧行业芯片"）在搜索框仍有词时是否有效。
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const OUT = 'D:/Web/style/deliverables/66-audit';
const PORT = 9597;
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

async function state() {
  return p.eval(`(() => ({
    count: document.getElementById('count').textContent,
    q: document.getElementById('q').value,
    pressed: [...document.querySelectorAll('.scene-chip[aria-pressed="true"]')].map(e=>e.getAttribute('data-scene')),
    rows: [...document.querySelectorAll('#ledger .row')].map(e=>e.getAttribute('data-id')),
  }))()`);
}

// 路径 A：搜「餐厅」→ 点「餐厅」芯片（不先清空搜索框）
await p.eval(`(() => { document.getElementById('reset').click(); const q=document.getElementById('q'); q.value='餐厅'; q.dispatchEvent(new Event('input',{bubbles:true})); })()`);
await sleep(350);
console.log('A1 搜「餐厅」:', JSON.stringify(await state()));
await p.eval(`(() => { const t=document.querySelector('.scene-toggle'); if(t) t.click(); })()`);
await sleep(250);
await p.eval(`(() => { const c=document.querySelector('[data-scene="餐厅"]'); if(c) c.click(); })()`);
await sleep(400);
console.log('A2 再点「餐厅」芯片（搜索框仍为餐厅）:', JSON.stringify(await state()));
await p.eval(`(() => { scrollTo(0,0); })()`);
await sleep(250);
await p.screenshot({ path: `${OUT}/shots/23-restaurant-chip-with-q-deadend.png`, format: 'png' });

// 路径 B：同样条件下先清空搜索框再点芯片
await p.eval(`(() => { const q=document.getElementById('q'); q.value=''; q.dispatchEvent(new Event('input',{bubbles:true})); })()`);
await sleep(400);
console.log('B1 清空搜索框后（芯片已按下）:', JSON.stringify(await state()));
await p.screenshot({ path: `${OUT}/shots/24-restaurant-chip-clear-q-works.png`, format: 'png' });

// 路径 C：书店
await p.eval(`(() => { document.getElementById('reset').click(); const q=document.getElementById('q'); q.value='书店'; q.dispatchEvent(new Event('input',{bubbles:true})); })()`);
await sleep(350);
await p.eval(`(() => { const t=document.querySelector('.scene-toggle'); if(t) t.click(); })()`);
await sleep(250);
await p.eval(`(() => { const c=document.querySelector('[data-scene="书店"]'); if(c) c.click(); })()`);
await sleep(400);
console.log('C 搜「书店」后点「书店」芯片:', JSON.stringify(await state()));
await p.eval(`(() => { const q=document.getElementById('q'); q.value=''; q.dispatchEvent(new Event('input',{bubbles:true})); scrollTo(0,0); })()`);
await sleep(400);
console.log('C2 再清空搜索框:', JSON.stringify(await state()));
await p.screenshot({ path: `${OUT}/shots/25-shudian-chip-after-clear.png`, format: 'png' });

await b.close(); server.close();
