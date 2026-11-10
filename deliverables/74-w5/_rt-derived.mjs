// Decisive test: does anything re-run fillDerived after the detail panel renders?
import { Browser, sleep } from '../../prototypes/_build/vendor/cdp.mjs';
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
await pg.goto(`http://127.0.0.1:${port}/prototypes/_selection/index.html`, { settleMs: 1200 });

// 1) What is the static fallback in the HTML (node textContent before JS runs)?
const html = await readFile(join(ROOT, 'prototypes/_selection/index.html'), 'utf8');
const fallbacks = [...html.matchAll(/data-derived="([^"]+)"[^>]*>([^<]*)</g)].map(m => ({ k: m[1], fallback: m[2] }));
console.log('static fallbacks:', JSON.stringify(fallbacks));

// 2) Poison the derived node, open the detail, see whether it is ever re-filled.
console.log('poison:', await pg.eval(`(() => {
  const n = document.querySelector('[data-derived="field-count"]');
  n.textContent = 'POISON';
  return n.textContent;
})()`));
await pg.eval(`document.querySelector('.row[data-id="S01"]').click()`);
await sleep(900);
console.log('after opening S01 (no manual fill):', await pg.eval(`({
  fieldCountText: document.querySelector('[data-derived="field-count"]').textContent,
  domFields: document.querySelectorAll('#d-body .fields > div').length,
  domFieldsNotOut: document.querySelectorAll('#d-body .fields .field:not(.field-out)').length,
  domFieldsOut: document.querySelectorAll('#d-body .fields .field-out').length
})`));

// 3) Close and reopen — still poisoned?
await pg.eval(`document.getElementById('d-close').click()`);
await sleep(400);
await pg.eval(`document.querySelector('.row[data-id="S07"]').click()`);
await sleep(700);
console.log('after reopen S07:', await pg.eval(`document.querySelector('[data-derived="field-count"]').textContent`));

// 4) Poison chip-count too, then click a chip (which triggers render()) — does it heal?
await pg.eval(`document.querySelector('[data-derived="chip-count"]').textContent = 'POISON2'`);
await pg.eval(`(() => { const c = document.querySelector('#flt-scene button'); if (c) c.click(); })()`);
await sleep(600);
console.log('after chip click (render()):', await pg.eval(`({chip: document.querySelector('[data-derived="chip-count"]').textContent, groups: document.querySelector('[data-derived="chip-groups"]').textContent})`));

// 5) Does the collapsed summary claim 73 while only 16 chips are visible?
console.log('visibility now:', await pg.eval(`(() => {
  const sum = document.querySelector('.rail-fold-sum').textContent;
  const visible = [...document.querySelectorAll('#flt-scene button, .scene-more button')].filter(b => b.getBoundingClientRect().width > 0).length;
  return { sum, visibleChips: visible, moreDisplay: getComputedStyle(document.querySelector('.scene-more')).display };
})()`));

// 6) What does the page do if prompt-copy.js fails to load? Simulate by removing mountSceneChips' effect:
// (just report the exposure: chip-count fallback + 0 chips)
console.log('exposure if mountSceneChips never runs: fallback chip-count =', fallbacks.find(f => f.k === 'chip-count'));

await b.close(); srv.close();
