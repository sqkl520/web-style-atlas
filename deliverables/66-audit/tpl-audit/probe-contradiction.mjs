// 反例取证：9 个「近近似」词的空状态说「给不了你」，但点同名芯片能筛出 1–3 行。
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const OUT = 'D:/Web/style/deliverables/66-audit';
const PORT = 9596;
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

// 1) 搜「书店」：两句相邻的文案
await p.eval(`(() => { const q=document.getElementById('q'); q.value='书店'; q.dispatchEvent(new Event('input',{bubbles:true})); scrollTo(0,0); })()`);
await sleep(400);
const t1 = await p.eval(`(() => ({
  emptyApp: document.getElementById('empty').textContent.replace(/\\s+/g,' ').trim(),
  emptyTplHead: (document.querySelector('.tpl-empty-head')||{}).textContent || '',
  emptyTop: Math.round(document.getElementById('empty').getBoundingClientRect().top),
  tplTop: Math.round(document.getElementById('empty-tpl').getBoundingClientRect().top),
}))()`);
console.log('搜「书店」两句文案:');
console.log('  #empty     :', t1.emptyApp.slice(0, 150));
console.log('  #empty-tpl :', t1.emptyTplHead);
await p.screenshot({ path: `${OUT}/shots/21-shudian-contradiction.png`, format: 'png' });

// 2) 同一页下方点「书店」芯片
await p.eval(`(() => { const t=document.querySelector('.scene-toggle'); if(t) t.click(); })()`);
await sleep(250);
await p.eval(`(() => { const c=document.querySelector('[data-scene="书店"]'); if(c) c.click(); })()`);
await sleep(400);
const t2 = await p.eval(`(() => ({
  count: document.getElementById('count').textContent,
  rows: document.querySelectorAll('#ledger .row').length,
  ids: [...document.querySelectorAll('#ledger .row')].map(e=>e.getAttribute('data-id')),
  emptyVisible: !document.getElementById('empty').hidden,
  tplVisible: !document.getElementById('empty-tpl').hidden,
}))()`);
console.log('点「书店」芯片后:', JSON.stringify(t2));
await p.eval(`(() => { scrollTo(0,0); })()`);
await sleep(300);
await p.screenshot({ path: `${OUT}/shots/22-shudian-chip-3rows.png`, format: 'png' });

// 3) 同样取证「会计」（1 行）
await p.eval(`(() => { document.getElementById('reset').click(); })()`);
await sleep(200);
await p.eval(`(() => { const q=document.getElementById('q'); q.value='会计'; q.dispatchEvent(new Event('input',{bubbles:true})); })()`);
await sleep(300);
const t3 = await p.eval(`(() => ({ head: (document.querySelector('.tpl-empty-head')||{}).textContent || '', count: document.getElementById('count').textContent }))()`);
await p.eval(`(() => { document.getElementById('reset').click(); const t=document.querySelector('.scene-toggle'); if(t) t.click(); })()`);
await sleep(350);
await p.eval(`(() => { const c=document.querySelector('[data-scene="会计"]'); if(c) c.click(); })()`);
await sleep(350);
const t4 = await p.eval(`(() => ({ count: document.getElementById('count').textContent, ids: [...document.querySelectorAll('#ledger .row')].map(e=>e.getAttribute('data-id')) }))()`);
console.log('搜「会计」:', JSON.stringify(t3));
console.log('点「会计」芯片:', JSON.stringify(t4));

await b.close(); server.close();
