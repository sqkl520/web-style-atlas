// Does assertion #3 (field-count) distinguish "fillDerived ran" from "fillDerived never ran"?
import { Browser } from '../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const MIME = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = createServer(async (req, res) => { try { const p = join(ROOT, decodeURIComponent(req.url.split('?')[0])); const b = await readFile(p); res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); } });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
const b = await Browser.launch({ width: 1440, height: 900 });
const pg = await b.newPage();
await pg.setViewport({ width: 1440, height: 900 });

const probe3 = `(() => {
  const n = document.querySelector('[data-derived="field-count"]');
  const claims = n ? +n.textContent : null;
  const rendered = document.querySelectorAll('#d-body .fields .field:not(.field-out)').length;
  return { claims, rendered, PASS: !!claims && claims === rendered };
})()`;

// 1) happy path
await pg.goto(`http://127.0.0.1:${port}/prototypes/_selection/index.html#S07`, { settleMs: 1200 });
console.log('1 happy:', JSON.stringify(await pg.eval(probe3)));

// 2) simulate "fillDerived never ran": restore the HTML static fallback text for every derived node
const fb = JSON.parse(await readFile(join(ROOT, 'deliverables/74-w5/_fb.json'), 'utf8').catch(() => 'null')) || { 'chip-groups': '11', 'chip-count': '45', 'field-count': '12' };
console.log('2 fillDerived dead (fallback text):', JSON.stringify(await pg.eval(`(() => {
  const fb = ${JSON.stringify(fb)};
  document.querySelectorAll('[data-derived]').forEach(n => { n.textContent = fb[n.getAttribute('data-derived')] || n.textContent; });
  const n = document.querySelector('[data-derived="field-count"]');
  const claims = n ? +n.textContent : null;
  const rendered = document.querySelectorAll('#d-body .fields .field:not(.field-out)').length;
  return { claims, rendered, PASS: !!claims && claims === rendered, chipFallback: document.querySelector('[data-derived="chip-count"]').textContent };
})()`)));

// 3) chip-count under the same condition
const probe2 = `(() => {
  const sum = document.querySelector('#rail-fold .rail-fold-sum');
  const txt = sum ? sum.textContent : '';
  const groups = document.querySelectorAll('.rail-block .chips').length;
  const chips = document.querySelectorAll('#flt-scene button, .scene-more button, .rail-block .chips button').length;
  const m = txt.match(/(\\d+)\\s*组[^\\d]*(\\d+)\\s*颗/);
  return { claimedGroups: m ? +m[1] : null, claimedChips: m ? +m[2] : null, groups, chips, PASS: m && +m[1] === groups && +m[2] === chips };
})()`;
console.log('3 chip-count w/ fallback:', JSON.stringify(await pg.eval(probe2)));

await b.close(); srv.close();
