// 空状态明写「点左侧「咖啡店」芯片能筛出来」——按字面照做，实测结果。
import http from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const OUT = 'D:/Web/style/deliverables/66-audit';
const PORT = 9600;
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

const out = {};
async function run(term, chipSelector) {
  await p.eval(`(() => { document.getElementById('reset').click(); const q=document.getElementById('q'); q.value=${JSON.stringify(term)}; q.dispatchEvent(new Event('input',{bubbles:true})); scrollTo(0,0); })()`);
  await sleep(400);
  const before = await p.eval(`(() => ({
    count: document.getElementById('count').textContent,
    rows: document.querySelectorAll('#ledger .row').length,
    emptyHead: (document.querySelector('.tpl-empty-head')||{}).textContent || '',
    appEmpty: (document.getElementById('empty').hidden ? '' : document.getElementById('empty').textContent).replace(/\\s+/g,' ').trim(),
  }))()`);
  await p.eval(`(() => { const c=document.querySelector('[data-scene="' + ${JSON.stringify(term)} + '"]'); if (c) c.click(); })()`);
  await sleep(450);
  const after = await p.eval(`(() => ({
    count: document.getElementById('count').textContent,
    rows: document.querySelectorAll('#ledger .row').length,
    q: document.getElementById('q').value,
    pressed: document.querySelectorAll('.scene-chip[aria-pressed="true"]').length,
    emptyVisible: !document.getElementById('empty').hidden,
  }))()`);
  out[term] = { before, after };
  console.log('==', term);
  console.log('  点芯片前:', JSON.stringify(before));
  console.log('  点芯片后:', JSON.stringify(after));
  await p.screenshot({ path: `${OUT}/shots/27-instruction-${term}-after-chip.png`, format: 'png' });
  return after;
}

// 空状态原话：「点左侧「咖啡店」芯片能筛出来」
await run('咖啡店');
// 空状态原话：「点左侧「潮牌」芯片能筛出来」
await run('潮牌');
// near-only：空状态建议"点左侧行业芯片"
await run('书店');

writeFileSync(`${OUT}/tpl-audit/instruction-follow.json`, JSON.stringify(out, null, 1), 'utf8');
await b.close(); server.close();
