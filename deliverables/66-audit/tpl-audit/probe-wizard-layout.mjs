// 向导结果页里「模板在这里」那句话的位置 + 结果卡数量/滚动距离。
import http from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const OUT = 'D:/Web/style/deliverables/66-audit';
const PORT = 9595;
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
await p.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/wizard.html?load=0&img=0&loud=0&guide=0&fear=0`, { settleMs: 1500 });
await sleep(500);
const out = await p.eval(`(() => {
  const abs = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return Math.round(r.top + scrollY); };
  const link = document.querySelector('#wz-method a');
  const picks = [...document.querySelectorAll('#wz-pick .wz-card')];
  const avoids = [...document.querySelectorAll('#wz-avoid .wz-card')];
  const m = document.getElementById('wz-method');
  return {
    vh: innerHeight,
    pickCards: picks.length, avoidCards: avoids.length,
    pickFirstTop: abs(picks[0]), pickLastBottom: Math.round(picks[picks.length-1].getBoundingClientRect().bottom + scrollY),
    avoidLastBottom: Math.round(avoids[avoids.length-1].getBoundingClientRect().bottom + scrollY),
    methodTop: abs(m),
    linkTop: abs(link),
    linkScreens: +(abs(link) / innerHeight).toFixed(2),
    methodFontSize: getComputedStyle(m).fontSize,
    linkFontSize: getComputedStyle(link).fontSize,
    linkText: link.textContent,
  };
})()`);
console.log(JSON.stringify(out, null, 1));
// 滚到那句话，截图看它的视觉分量
await p.eval(`(() => { document.querySelector('#wz-method a').scrollIntoView({block:'center'}); })()`);
await sleep(400);
await p.screenshot({ path: `${OUT}/shots/20-wizard-template-mention-visible.png`, format: 'png' });

// 390 档
await p.setViewport({ width: 390, height: 844 });
await sleep(400);
await p.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/wizard.html?load=0&img=0&loud=0&guide=0&fear=0`, { settleMs: 1200 });
await sleep(400);
const m390 = await p.eval(`(() => {
  const a = document.querySelector('#wz-method a');
  const r = a.getBoundingClientRect();
  return { linkAbsTop: Math.round(r.top + scrollY), screens: +((r.top + scrollY)/innerHeight).toFixed(2), vh: innerHeight };
})()`);
console.log('390:', JSON.stringify(m390));
writeFileSync(`${OUT}/tpl-audit/live-wizard-layout.json`, JSON.stringify({ ...out, m390 }, null, 1), 'utf8');
await b.close(); server.close();
