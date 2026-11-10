// 收尾断言：芯片分层、移动端可达性、向导深链。
import http from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const OUT = 'D:/Web/style/deliverables/66-audit';
const PORT = 9594;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  let f = join(ROOT, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html`, { settleMs: 2000 });
const out = {};

out.chipLayout = await p.eval(`(() => {
  const vis = [], more = [];
  document.querySelectorAll('[data-scene]').forEach((b) => {
    const row = { term: b.getAttribute('data-scene'), badge: (b.querySelector('.scene-tpl')||{}).textContent || '' };
    (b.closest('.scene-more') ? more : vis).push(row);
  });
  return { visible: vis, collapsed: more, visibleWithBadge: vis.filter(x=>x.badge).map(x=>x.term), collapsedWithBadge: more.filter(x=>x.badge).map(x=>x.term) };
})()`);
console.log('首屏可见芯片', out.chipLayout.visible.length, '带角标', out.chipLayout.visibleWithBadge);
console.log('收起芯片', out.chipLayout.collapsed.length, '带角标', out.chipLayout.collapsedWithBadge);

out.badgeStyle = await p.eval(`(() => {
  const el = document.querySelector('.scene-tpl');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { fontSize: cs.fontSize, opacity: cs.opacity, text: el.textContent };
})()`);

// 移动端：header 里的模板出口是否在首屏
await p.setViewport({ width: 390, height: 844 });
await sleep(500);
out.mobileHeader = await p.eval(`(() => {
  const el = document.getElementById('tpl-exit');
  const b = el.getBoundingClientRect();
  return { top: Math.round(b.top), bottom: Math.round(b.bottom), vh: innerHeight, inFirstScreen: b.top < innerHeight, text: el.textContent.replace(/\\s+/g,' ').trim() };
})()`);
console.log('390 页头模板出口:', JSON.stringify(out.mobileHeader));

// 390 下搜餐厅，整页截图（用户真实首屏）
await p.eval(`(() => { const q=document.getElementById('q'); q.value='餐厅'; q.dispatchEvent(new Event('input',{bubbles:true})); scrollTo(0,0); })()`);
await sleep(400);
await p.screenshot({ path: `${OUT}/shots/17-restaurant-390-firstscreen.png`, format: 'png' });
out.mobileRestaurantFirst = await p.eval(`(() => {
  const e = document.querySelector('.tpl-empty-head');
  return { emptyHeadInView: !!e && e.getBoundingClientRect().top < innerHeight, emptyHeadTop: e ? Math.round(e.getBoundingClientRect().top) : null, vh: innerHeight };
})()`);

// 向导 → 深链 #tpl-exit
await p.setViewport({ width: 1440, height: 900 });
const w = await b.newPage({ width: 1440, height: 900 });
await w.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/wizard.html?load=0&img=0&loud=0&guide=0&fear=0`, { settleMs: 1200 });
await sleep(400);
await w.eval(`(() => { document.getElementById('wz-out').scrollIntoView({block:'start'}); })()`);
await sleep(300);
await w.screenshot({ path: `${OUT}/shots/18-wizard-method-line.png`, format: 'png' });
const href = await w.eval(`(() => { const a=[...document.querySelectorAll('#wz-method a')].map(x=>x.getAttribute('href')); return a; })()`);
out.wizardLinks = href;
console.log('向导 method 里的链接:', href);
await w.eval(`(() => { const a=document.querySelector('#wz-method a'); if(a) a.click(); })()`);
await sleep(1600);
out.afterDeepLink = await w.eval(`(() => {
  const el = document.getElementById('tpl-exit');
  if (!el) return { url: location.href, found: false };
  const b = el.getBoundingClientRect();
  return { url: location.href.replace(location.origin,''), found: true, top: Math.round(b.top), inView: b.top >= -1 && b.top < innerHeight };
})()`);
console.log('深链落地:', JSON.stringify(out.afterDeepLink));
await w.screenshot({ path: `${OUT}/shots/19-wizard-deeplink-tpl-exit.png`, format: 'png' });

writeFileSync(`${OUT}/tpl-audit/live-final.json`, JSON.stringify(out, null, 1), 'utf8');
await b.close(); server.close();
console.log('done');
