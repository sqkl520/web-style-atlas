// P0 取证：空状态说"点左侧「咖啡店」芯片能筛出来"，照做后仍 0 行。
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const OUT = 'D:/Web/style/deliverables/66-audit';
const PORT = 9602;
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

// 1) 搜「咖啡店」，空状态 + 芯片（芯片是实心，带 M02 角标）
await p.eval(`(() => { const q=document.getElementById('q'); q.value='咖啡店'; q.dispatchEvent(new Event('input',{bubbles:true})); scrollTo(0,0); })()`);
await sleep(400);
await p.screenshot({ path: `${OUT}/shots/28-coffeeshop-before-chip.png`, format: 'png' });

// 2) 照指示点芯片
await p.eval(`(() => { const c=document.querySelector('[data-scene="咖啡店"]'); if (c) c.click(); scrollTo(0,0); })()`);
await sleep(500);
const after = await p.eval(`(() => ({
  count: document.getElementById('count').textContent,
  rows: document.querySelectorAll('#ledger .row').length,
  q: document.getElementById('q').value,
  chipPressed: document.querySelector('[data-scene="咖啡店"]').getAttribute('aria-pressed'),
  headText: (document.querySelector('.tpl-empty-head')||{}).textContent || '',
  emptyVisible: !document.getElementById('empty').hidden,
}))()`);
console.log('点芯片后:', JSON.stringify(after, null, 1));
await p.screenshot({ path: `${OUT}/shots/29-coffeeshop-after-chip-still-zero.png`, format: 'png' });

// 3) 只把搜索框清空（芯片保持按下）→ 才出现 4 行
await p.eval(`(() => { const q=document.getElementById('q'); q.value=''; q.dispatchEvent(new Event('input',{bubbles:true})); scrollTo(0,0); })()`);
await sleep(500);
const fixed = await p.eval(`(() => ({ count: document.getElementById('count').textContent, ids: [...document.querySelectorAll('#ledger .row')].map(e=>e.getAttribute('data-id')) }))()`);
console.log('清空搜索框后:', JSON.stringify(fixed));
await p.screenshot({ path: `${OUT}/shots/30-coffeeshop-after-clearing-q.png`, format: 'png' });

await b.close(); server.close();
