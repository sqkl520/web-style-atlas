import http from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/deliverables/62-verify/impl';
const PORT = 9581;
const MIME = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = join(ROOT, p === '/' ? 'S07.html' : p);
  if (!existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

for (const name of ['S07', 'S30', 'S23']) {
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`http://127.0.0.1:${PORT}/${name}.html`, { settleMs: 2000 });

  const fontReport = await p.eval(async () => {
    const t0 = Date.now();
    try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 20000))]); } catch (e) {}
    return {
      waitedMs: Date.now() - t0,
      status: document.fonts.status,
      faces: document.fonts.size,
      loaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family}|${f.weight}|${f.style}`),
      errored: [...document.fonts].filter((f) => f.status === 'error').map((f) => f.family),
      unloaded: [...document.fonts].filter((f) => f.status === 'unloaded').length,
    };
  });

  await p.send('DOM.enable');
  await p.send('CSS.enable');
  const { root } = await p.send('DOM.getDocument', { depth: -1 });

  const targets = {
    h1: 'h1',
    body: 'body',
    number: '.entry .no, .item .n, .cut .hd .no',
    bodyParagraph: '.entry p, .item .body p, .cut .layer .txt',
    latinH1: 'h1',
  };
  const res = { fontReport };
  for (const [k, sel] of Object.entries(targets)) {
    const { nodeId } = await p.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
    if (!nodeId) { res[k] = { sel, error: 'no node' }; continue; }
    const { fonts } = await p.send('CSS.getPlatformFontsForNode', { nodeId });
    const cs = await p.eval(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); const c = getComputedStyle(el); return { family: c.fontFamily, size: c.fontSize, weight: c.fontWeight, tnum: c.fontVariantNumeric, align: c.textAlign, text: el.textContent.trim().slice(0, 16), letterSpacing: c.letterSpacing }; })()`);
    res[k] = { sel, renderedBy: fonts.filter((f) => f.glyphCount > 0).map((f) => ({ family: f.familyName, glyphs: f.glyphCount, custom: f.isCustomFont })), css: cs };
  }
  out[name] = res;
  console.log('==', name, '| fonts.status=', fontReport.status, 'faces=', fontReport.faces, 'unloaded=', fontReport.unloaded, 'errored=', fontReport.errored.length, 'waitMs=', fontReport.waitedMs);
  console.log('   loaded:', fontReport.loaded.slice(0, 8).join(' ; ') || '(none)');
  for (const k of ['h1', 'number', 'bodyParagraph']) {
    const r = res[k];
    console.log('   ', k, '=>', r.error ? r.error : (r.renderedBy.map((f) => `${f.family}(${f.glyphs}${f.custom ? ',web' : ''})`).join(' + ') || 'NO GLYPHS'), '| css:', r.css && r.css.family);
  }
  await p.close();
}
await b.close(); server.close();
writeFileSync('D:/Web/style/deliverables/62-verify/fonts.json', JSON.stringify(out, null, 1), 'utf8');
console.log('written');
