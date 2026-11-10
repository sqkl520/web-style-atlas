import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/deliverables/62-verify/impl';
const PORT = 9583;
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

// subpixel line-width capability probe (independent of the three pages)
const p0 = await b.newPage({ width: 800, height: 600 });
await p0.goto(`http://127.0.0.1:${PORT}/S07.html`, { settleMs: 400 });
const subpixel = await p0.eval(() => {
  const mk = (css) => { const d = document.createElement('div'); d.style.cssText = css; document.body.appendChild(d); const c = getComputedStyle(d); const r = d.getBoundingClientRect(); const out = { css, borderTop: c.borderTopWidth, hrHeight: c.height, rectH: r.height }; d.remove(); return out; };
  return {
    borderHalf: mk('border-top:0.5px solid #000;height:10px;width:100px'),
    borderOneAndHalf: mk('border-top:1.5px solid #000;height:10px;width:100px'),
    height15: mk('height:1.5px;background:#000;width:100px'),
    height05: mk('height:0.5px;background:#000;width:100px'),
    columnRule05: (() => { const d = document.createElement('div'); d.style.cssText = 'column-count:3;column-rule:0.5px solid #000;column-gap:10px;width:300px'; d.innerHTML = '<p style="margin:0">a</p><p style="margin:0">b</p>'; document.body.appendChild(d); const v = getComputedStyle(d).columnRuleWidth; d.remove(); return v; })(),
    columnRule15: (() => { const d = document.createElement('div'); d.style.cssText = 'column-count:3;column-rule:1.5px solid #000;column-gap:10px;width:300px'; d.innerHTML = '<p style="margin:0">a</p>'; document.body.appendChild(d); const v = getComputedStyle(d).columnRuleWidth; d.remove(); return v; })(),
  };
});
await p0.close();
console.log('SUBPIXEL', JSON.stringify(subpixel));

const numSel = { S07: '.entry .no', S30: '.item .n', S23: '.cut .hd .no' };
for (const name of ['S07', 'S30', 'S23']) {
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`http://127.0.0.1:${PORT}/${name}.html`, { settleMs: 1500 });
  const r = await p.eval((sel) => {
    const els = Array.from(document.querySelectorAll(sel)).slice(0, 3);
    return els.map((el) => {
      const c = getComputedStyle(el);
      const rr = el.getBoundingClientRect();
      return { text: el.textContent.trim(), align: c.textAlign, family: c.fontFamily.split(',')[0], tnum: c.fontVariantNumeric, right: Math.round(rr.right), boxRight: Math.round(rr.right) };
    });
  }, numSel[name]);
  // also: does a 0.5px column-rule appear anywhere in this page?
  const rules = await p.eval(() => Array.from(document.querySelectorAll('*')).map((el) => { const c = getComputedStyle(el); return c.columnRuleStyle !== 'none' ? c.columnRuleWidth + ' on ' + el.className : null; }).filter(Boolean));
  console.log(name, 'NUM', JSON.stringify(r), 'COLRULE', JSON.stringify(rules));
  await p.close();
}
await b.close(); server.close();
