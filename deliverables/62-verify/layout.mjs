import http from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/deliverables/62-verify/impl';
const PORT = 9579;
const MIME = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = join(ROOT, p === '/' ? 'S07.html' : p);
  if (!existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const layouts = () => {
  const q = (s) => document.querySelector(s);
  const cols = (s) => { const el = q(s); return el ? getComputedStyle(el).columnCount : null; };
  const gtc = (s) => { const el = q(s); return el ? getComputedStyle(el).gridTemplateColumns : null; };
  const order = Array.from(document.querySelectorAll('h1,h2,h3')).slice(0, 6).map((e) => e.textContent.trim().slice(0, 12));
  return {
    vw: window.innerWidth,
    docW: document.documentElement.scrollWidth,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    docH: document.documentElement.scrollHeight,
    catalogCols: cols('.right'),
    versoCols: cols('.verso'),
    spreadCols: gtc('.spread'),
    rowCols: gtc('.row'),
    wallCols: gtc('.wall'),
    itemCols: gtc('.item'),
    stripCols: gtc('.strip'),
    indexPos: (() => { const el = q('.index'); return el ? getComputedStyle(el).position + '/' + getComputedStyle(el).width : null; })(),
    imgWidths: Array.from(document.querySelectorAll('img')).map((i) => Math.round(i.getBoundingClientRect().width)),
    headingsOrder: order,
  };
};

const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const name of ['S07', 'S30', 'S23']) {
  out[name] = {};
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`http://127.0.0.1:${PORT}/${name}.html`, { settleMs: 1800 });
  for (const [w, h, tag] of [[1440, 900, '1440'], [768, 1024, '768'], [390, 844, '390']]) {
    await p.setViewport({ width: w, height: h });
    await new Promise((r) => setTimeout(r, 400));
    out[name][tag] = await p.eval(layouts);
    await p.screenshot({ path: `D:/Web/style/deliverables/62-verify/shots/${name}-${tag}.png`, format: 'png' });
  }
  await p.setViewport({ width: 1440, height: 900 });
  await new Promise((r) => setTimeout(r, 400));
  await p.screenshot({ path: `D:/Web/style/deliverables/62-verify/shots/${name}-full.png`, format: 'png', fullPage: true });
  // opacity / translucency audit (for the "no translucent layers" rule)
  out[name].opacity = await p.eval(() => Array.from(document.querySelectorAll('*')).map((el) => {
    const c = getComputedStyle(el);
    const o = parseFloat(c.opacity);
    return (o > 0 && o < 1) ? { tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 24), o } : null;
  }).filter(Boolean));
  // sampled pixels of the page background to detect composited colours
  await p.close();
}
await b.close(); server.close();
writeFileSync('D:/Web/style/deliverables/62-verify/layouts.json', JSON.stringify(out, null, 1), 'utf8');
for (const k of Object.keys(out)) {
  console.log('==', k);
  for (const v of ['1440', '768', '390']) {
    const d = out[k][v];
    console.log(' ', v, 'overflowX=' + d.overflowX, 'docH=' + d.docH, 'catalogCols=' + d.catalogCols, 'verso=' + d.versoCols, 'spread=' + d.spreadCols, 'rows=' + d.rowCols, 'itemCols=' + d.itemCols, 'imgs=' + d.imgWidths.join('/'));
  }
  console.log('  opacity<1:', JSON.stringify(out[k].opacity));
}
