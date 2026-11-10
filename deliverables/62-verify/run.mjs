import http from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/deliverables/62-verify/impl';
const OUT = 'D:/Web/style/deliverables/62-verify';
const PORT = 9576;
const MIME = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = join(ROOT, p === '/' ? 'S07.html' : p);
  if (!existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const probeSrc = readFileSync('D:/Web/style/deliverables/62-verify/probe.js', 'utf8');
const b = await Browser.launch({ width: 1440, height: 900 });
const all = {};
for (const name of ['S07', 'S30', 'S23']) {
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`http://127.0.0.1:${PORT}/${name}.html`, { settleMs: 1800 });
  console.log(name, 'nav ok');
  await new Promise((r) => setTimeout(r, 900));
  const data = await p.eval(`(${probeSrc})()`);
  if (!data) throw new Error('probe returned undefined for ' + name);
  console.log(name, 'probe ok, colors=', data.colors.length, 'imgs=', data.imgs.length);
  for (const [w, h, tag] of [[1440, 900, '1440'], [768, 1024, '768'], [390, 844, '390']]) {
    await p.setViewport({ width: w, height: h });
    await new Promise((r) => setTimeout(r, 500));
    await p.screenshot({ path: `${OUT}/shots/${name}-${tag}.png`, format: 'png' });
    console.log(name, 'shot', tag, 'ok');
  }
  await p.setViewport({ width: 1440, height: 900 });
  await new Promise((r) => setTimeout(r, 400));
  await p.screenshot({ path: `${OUT}/shots/${name}-full.png`, format: 'png', fullPage: true });
  all[name] = data;
  await p.close();
}
await b.close(); server.close();
writeFileSync(`${OUT}/raw.json`, JSON.stringify(all, null, 1), 'utf8');
console.log('done');
