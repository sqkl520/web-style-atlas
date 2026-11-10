// Gap check: does ANY probe verify field-count == 12 across all 30 cases?
// This measures all 30 with one browser.
import { Browser, sleep } from '../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const MIME = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const srv = createServer(async (req, res) => { try { const p = join(ROOT, decodeURIComponent(req.url.split('?')[0])); const b = await readFile(p); res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); } });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
const b = await Browser.launch({ width: 1440, height: 900 });
const pg = await b.newPage(); await pg.setViewport({ width: 1440, height: 900 });
await pg.goto(`http://127.0.0.1:${port}/prototypes/_selection/index.html`, { settleMs: 1200 });

const ids = await pg.eval(`[...document.querySelectorAll('.row[data-id]')].map(r=>r.getAttribute('data-id'))`);
const dist = {};
const rows = [];
for (const id of ids) {
  await pg.eval(`(() => { const r=document.querySelector('.row[data-id="${id}"]'); r && r.click(); })()`);
  await sleep(220);
  const m = await pg.eval(`(() => {
    const d = document.getElementById('d-body');
    return {
      fields: d ? d.querySelectorAll('.fields > div').length : -1,
      heads: d ? [...d.querySelectorAll('.fields > div')].map(f => (f.querySelector('dt')||f.querySelector('summary .fl-lab')||f.querySelector('summary')||{}).textContent || '').map(t=>t.trim().slice(0,10)) : [],
      scenesNo: d ? d.textContent.includes('不适合') : null,
    };
  })()`);
  dist[m.fields] = (dist[m.fields] || 0) + 1;
  rows.push({ id, ...m });
  await pg.eval(`(() => { const c=document.getElementById('d-close'); c && c.click(); })()`);
  await sleep(80);
}
console.log('field-count distribution over ' + ids.length + ' cases:', JSON.stringify(dist));
console.log('cases with 不适合 text:', rows.filter(r => r.scenesNo).length + '/' + ids.length);
console.log('distinct field heading sets:', new Set(rows.map(r => r.heads.join('|'))).size);
console.log('sample headings (S01):', JSON.stringify(rows[0].heads));
const odd = rows.filter(r => r.fields !== 12);
if (odd.length) console.log('NOT 12:', JSON.stringify(odd.map(r => [r.id, r.fields])));
await b.close(); srv.close();
