// 探针 8：调试 authorHex / declW 为什么为空。
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style/prototypes';
const PORT = 8516;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(`http://127.0.0.1:${PORT}/S19-copperplate-herbarium-cabinet/index.html`, { settleMs: 1500 });
const r = await p.eval(() => {
  const o = { sheets: [], props: {}, err: null };
  for (const sh of document.styleSheets) {
    o.sheets.push({ href: sh.href, rules: (() => { try { return sh.cssRules.length; } catch (e) { return 'ERR ' + e.message; } })() });
  }
  // 逐规则看第一条 style rule
  let first = null;
  const walk = (rules, depth) => {
    for (const rule of rules || []) {
      if (rule.cssRules) { walk(rule.cssRules, depth + 1); continue; }
      if (!rule.style) continue;
      if (!first) {
        const props = [];
        for (let i = 0; i < rule.style.length; i++) props.push(rule.style[i]);
        first = { sel: rule.selectorText, len: rule.style.length, props: props.slice(0, 12), typeofLen: typeof rule.style.length };
      }
    }
  };
  for (const sh of document.styleSheets) {
    if (/_fonts\/css/.test(sh.href || '')) continue;
    try { walk(sh.cssRules, 0); } catch (e) { o.err = String(e.message); }
  }
  o.first = first;
  // 直接测 :root 规则
  for (const sh of document.styleSheets) {
    let rs; try { rs = sh.cssRules; } catch { continue; }
    for (const rule of rs || []) {
      if (rule.selectorText && /^:root$/.test(rule.selectorText.trim())) {
        o.rootProps = [];
        for (let i = 0; i < rule.style.length; i++) o.rootProps.push(rule.style[i] + '=' + rule.style.getPropertyValue(rule.style[i]));
        break;
      }
    }
    if (o.rootProps) break;
  }
  return o;
});
console.log(JSON.stringify(r, null, 1).slice(0, 4000));
await b.close(); server.close();
