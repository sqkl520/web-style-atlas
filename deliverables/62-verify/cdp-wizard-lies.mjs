import http from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9593;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototypes/_selection/index.html';
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(PORT, r));
const WURL = `http://127.0.0.1:${PORT}/prototypes/_selection/wizard.html`;
const b = await Browser.launch({ width: 1440, height: 1000 });

// The 5 combos my reimplementation says produce a false "五项都落在你要的档位里"
const lies = [
  { combo: [0, 0, 0, 0, 1], id: 'S05' },
  { combo: [0, 0, 0, 1, 0], id: 'S07' },
  { combo: [0, 0, 1, 0, 0], id: 'S05' },
  { combo: [0, 1, 1, 0, 0], id: 'S17' },
  { combo: [1, 0, 0, 0, 1], id: 'S24' },
];
const results = [];
for (const { combo, id } of lies) {
  const p = await b.newPage({ width: 1440, height: 1000 });
  await p.goto(WURL, { settleMs: 1600 });
  for (let i = 0; i < 5; i++) {
    await p.eval(`(() => { const qs=[...document.querySelectorAll('.wz-q')]; const q=qs[${i}]; const bs=[...q.querySelectorAll('.wz-opts button')]; if(bs[${combo[i]}]) bs[${combo[i]}].click(); })()`);
    await new Promise(r => setTimeout(r, 300));
  }
  await new Promise(r => setTimeout(r, 700));
  const got = await p.eval(`(() => {
    const cards=[...document.querySelectorAll('.wz-card')];
    return cards.map(c=>({ id:((c.querySelector('.no')||{}).textContent||'').trim(),
      why:((c.querySelector('.wz-why')||{}).textContent||'').trim(),
      gate:((c.querySelector('.wz-gate')||{}).textContent||'').trim()||null }));
  })()`);
  const target = got.find(c => c.id === id);
  results.push({ combo, expectId: id, found: !!target, why: target ? target.why : null, top3: got.slice(0,3).map(c=>c.id) });
  console.log('combo', combo.join(''), 'expect', id, '| top3', got.slice(0,3).map(c=>c.id).join(','), '| why:', target ? target.why : 'NOT IN CARDS');
  await p.close();
}
writeFileSync(ROOT + '/deliverables/62-verify/wizard-lies.json', JSON.stringify(results, null, 2), 'utf8');

// Also: does ANY displayed "对上你要的" appear with a case that matches zero axes?
// Scan all rendered cards for the all-match sentence.
const p2 = await b.newPage({ width: 1440, height: 1000 });
const allFive = [];
for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) for (let d = 0; d < 3; d++) for (let e = 0; e < 2; e++) for (let f = 0; f < 3; f++) {
  const combo = [a, c, d, e, f];
  await p2.goto(WURL, { settleMs: 700 });
  for (let i = 0; i < 5; i++) {
    await p2.eval(`(() => { const qs=[...document.querySelectorAll('.wz-q')]; const q=qs[${i}]; const bs=[...q.querySelectorAll('.wz-opts button')]; if(bs[${combo[i]}]) bs[${combo[i]}].click(); })()`);
  }
  await new Promise(r => setTimeout(r, 240));
  const txt = await p2.eval(`(() => [...document.querySelectorAll('.wz-card')].slice(0,3).map(c=>({id:((c.querySelector('.no')||{}).textContent||'').trim(), why:((c.querySelector('.wz-why')||{}).textContent||'').trim()})) )()`);
  txt.forEach(t => { if (t.why.includes('五项都落在你要的档位里')) allFive.push({ combo: combo.join(''), id: t.id }); });
}
console.log('total top3 cards printing "五项都落在你要的档位里":', allFive.length);
console.log(JSON.stringify(allFive));
writeFileSync(ROOT + '/deliverables/62-verify/wizard-five.json', JSON.stringify(allFive, null, 2), 'utf8');
await b.close(); server.close();
