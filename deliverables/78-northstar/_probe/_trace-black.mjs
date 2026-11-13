/* 查 #000000 到底来自哪个元素、哪个属性。
 * 它是一个真·黑色（不是 transparent），所以在计算样式里被当成设计色收集了。
 * 但它更可能是浏览器默认值 —— 需要确认是哪一类元素，才能定判据。 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const pg = await b.newPage();
await pg.setViewport({ width: 1440, height: 900 });
await pg.goto(`http://127.0.0.1:${port}/deliverables/78-northstar/_probe/_staged/S32-sandbox.html`, { settleMs: 1500 });

const r = await pg.eval(`(() => {
  const found = [];
  document.querySelectorAll('body, body *').forEach((el) => {
    const cs = getComputedStyle(el);
    for (const prop of ['color','backgroundColor','borderTopColor','borderBottomColor','outlineColor','fill','stroke']) {
      const raw = cs[prop];
      if (raw === 'rgb(0, 0, 0)' || raw === 'rgba(0, 0, 0, 1)') {
        found.push({
          tag: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/)[0] : ''),
          prop,
          raw,
          inline: el.style && el.style[prop] ? el.style[prop] : '(no inline)',
          hasRule: (() => {
            // 有没有任何 CSS 规则显式声明过这个属性
            for (const sheet of Array.from(document.styleSheets)) {
              let rules; try { rules = sheet.cssRules; } catch { continue; }
              for (const rule of Array.from(rules)) {
                if (rule.selectorText && rule.style && rule.style[prop]) {
                  try { if (el.matches(rule.selectorText)) return rule.selectorText.slice(0, 40); } catch {}
                }
              }
            }
            return null;
          })(),
        });
      }
    }
  });
  return { count: found.length, sample: found.filter(f=>f.prop!=="fill").slice(0, 8), byProp: found.reduce((a, x) => { a[x.prop] = (a[x.prop]||0)+1; return a; }, {}) };
})()`);

console.log('真·黑色出现次数:', r.count);
console.log('按属性分布:', JSON.stringify(r.byProp));
console.log('\n样本:');
for (const s of r.sample) console.log(' ', JSON.stringify(s));

await b.close(); srv.close(); process.exit(0);
