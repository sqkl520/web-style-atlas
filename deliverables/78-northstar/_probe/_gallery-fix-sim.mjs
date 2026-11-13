/* 用修好的 gallery 判据，离线预测 13 案的选择会变成什么。
 * 不改 probe.mjs，先看影响面 —— 直接改 vendored 采集器要重渲染全库，代价大。
 *
 * 新判据（两条，都在浏览器里算）：
 *   1. 不把 svg 算作图片（很多案用 SVG 画装饰线，S17/S20/S33 都是）
 *   2. 加文字量下限：容器内文字 < 200 字的不可能是「正文版心」，
 *      即使它含图也应该被排除
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css;charset=utf-8',
  '.js': 'text/javascript;charset=utf-8', '.woff2': 'font/woff2', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml' };

const srv = createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  if (/\/favicon\.ico$/.test(rel)) { res.writeHead(204); res.end(); return; }
  const p = resolve(ROOT, '.' + rel);
  if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  try {
    const b = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;

const b = await Browser.launch({ width: 1440, height: 900 });

const TARGETS = process.argv.slice(2).filter((a) => /^S\d{2}$/.test(a));
const all = readdirSync(join(ROOT, 'prototypes')).filter((d) => /^S\d\d-/.test(d)).sort();
const dirs = TARGETS.length
  ? all.filter((d) => TARGETS.includes(d.slice(0, 3)))
  : all;

console.log('案   旧判据选中                 新判据选中                 变化');
console.log('─'.repeat(90));

for (const d of dirs) {
  const pg = await b.newPage();
  await pg.setViewport({ width: 1440, height: 900 });
  try {
    await pg.goto(`http://127.0.0.1:${port}/prototypes/${d}/index.html`, { settleMs: 1200 });
  } catch { console.log(`${d.slice(0, 3)}  导航失败`); continue; }

  const r = await pg.eval(`(() => {
    const splitTracks = (v) => {
      const out = []; let cur = ''; let depth = 0;
      for (let i = 0; i < v.length; i++) {
        const c = v.charAt(i);
        if (c === '(') depth++;
        else if (c === ')') { depth--; if (depth < 0) depth = 0; }
        if (depth === 0 && c.charCodeAt(0) <= 32) { if (cur) { out.push(cur); cur = ''; } continue; }
        cur += c;
      }
      if (cur) out.push(cur);
      return out;
    };
    const textLen = (el) => (el.innerText || '').replace(/\\s/g, '').length;

    const cands = [];
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.display !== 'grid' && cs.display !== 'inline-grid') continue;
      const gtc = cs.gridTemplateColumns || '';
      if (!gtc || gtc === 'none') continue;
      const tl = splitTracks(gtc);
      const nums = tl.map((t) => parseFloat(t)).filter((n) => Number.isFinite(n));
      let tracks = tl.length;
      if (nums.length === tl.length && tl.length > 1) {
        const wide = nums.filter((n) => n >= 32);
        if (wide.length) tracks = wide.length;
      }
      if (tracks <= 1) continue;
      const kids = [...el.children];
      const chars = textLen(el);
      let oldGallery = false, newGallery = false;
      if (kids.length >= 3) {
        const withImgAll = kids.filter((k) => k.querySelector('img, picture, svg, canvas')).length;
        const withImgNoSvg = kids.filter((k) => k.querySelector('img, picture, canvas')).length;
        oldGallery = withImgAll >= kids.length / 2;
        newGallery = withImgNoSvg >= kids.length / 2 && chars < 200;
      }
      const tag = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
        (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/)[0] : '');
      cands.push({ sel: tag.slice(0, 26), tracks, chars, oldGallery, newGallery });
    }
    const pickOld = cands.filter((c) => !c.oldGallery).sort((a, b) => b.chars - a.chars)[0] || null;
    const pickNew = cands.filter((c) => !c.newGallery).sort((a, b) => b.chars - a.chars)[0] || null;
    return { old: pickOld, new: pickNew };
  })()`);

  const o = r.old ? `${r.old.sel}(${r.old.tracks}轨/${r.old.chars}字)` : '(无)';
  const n = r.new ? `${r.new.sel}(${r.new.tracks}轨/${r.new.chars}字)` : '(无)';
  const changed = (r.old?.sel || '') !== (r.new?.sel || '') ? ' ← 变了' : '';
  console.log(`${d.slice(0, 3)}  ${o.padEnd(34)} ${n.padEnd(34)}${changed}`);

  await pg.close?.();
}
await b.close();
srv.close();
process.exit(0);
