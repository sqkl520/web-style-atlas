// 验证「模板塞进 sceneIds 会撞白名单」这一说法 + 模板带/空状态在不同视口的位置。
import http from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const OUT = 'D:/Web/style/deliverables/66-audit';
const PORT = 9593;
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
async function rowsAfter(ids) {
  return p.eval(`(() => {
    window.benchSetSceneIds(${JSON.stringify(ids)});
    return { count: document.getElementById('count').textContent, rows: document.querySelectorAll('#ledger .row').length,
             tplCards: document.querySelectorAll('#tpl-cards .tpl-card, #empty-tpl .tpl-card').length,
             stripVisible: !document.getElementById('tpl-strip').hidden };
  })()`);
}
out.sceneIdsM02 = await rowsAfter(['M02']);
out.sceneIdsM02S06S19 = await rowsAfter(['M02', 'S06', 'S19']);
out.sceneIdsS06S19 = await rowsAfter(['S06', 'S19']);
await p.eval(`(() => window.benchClearSceneIds())()`);

// 「烘焙」：方案行 + 模板带同屏 —— 模板带在首屏吗
for (const [w, h, tag] of [[1440, 900, '1440'], [768, 1024, '768'], [390, 844, '390']]) {
  await p.setViewport({ width: w, height: h });
  await sleep(400);
  await p.eval(`(() => { document.getElementById('reset').click(); const q=document.getElementById('q'); q.value='烘焙'; q.dispatchEvent(new Event('input',{bubbles:true})); scrollTo(0,0); })()`);
  await sleep(400);
  const m = await p.eval(`(() => {
    const r = (id) => { const el = document.getElementById(id); if (!el || el.hidden) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), visible: b.top < innerHeight }; };
    return { vp: innerWidth + 'x' + innerHeight, strip: r('tpl-strip'), ledger: r('ledger'), count: document.getElementById('count').textContent };
  })()`);
  out['bake_' + tag] = m;
  console.log('烘焙 @' + tag, JSON.stringify(m));
  await p.screenshot({ path: `${OUT}/shots/14-bake-strip-${tag}.png`, format: 'png' });
}

// 390 档：搜「餐厅」空状态 + 模板卡
await p.setViewport({ width: 390, height: 844 });
await sleep(400);
await p.eval(`(() => { document.getElementById('reset').click(); const q=document.getElementById('q'); q.value='餐厅'; q.dispatchEvent(new Event('input',{bubbles:true})); scrollTo(0,0); })()`);
await sleep(400);
out.restaurant390 = await p.eval(`(() => { const e=document.getElementById('empty-tpl'); const b=e.getBoundingClientRect(); return { hidden:e.hidden, top:Math.round(b.top), bottom:Math.round(b.bottom), vh:innerHeight, text:(document.querySelector('.tpl-empty-head')||{}).textContent }; })()`);
console.log('餐厅 @390', JSON.stringify(out.restaurant390));
await p.screenshot({ path: `${OUT}/shots/15-restaurant-390.png`, format: 'png' });
await p.eval(`(() => { const c=document.querySelector('#empty-tpl .tpl-card'); if(c) c.scrollIntoView({block:'center'}); })()`);
await sleep(300);
await p.screenshot({ path: `${OUT}/shots/16-restaurant-390-tpl-card.png`, format: 'png' });

// 标题里那个「44 个行业词里只有 16 个」的数字是否真来自现算
out.emptyFacts = await p.eval(`(() => ({
  terms: document.getElementById('e-terms').textContent,
  direct: document.getElementById('e-direct').textContent,
  total: document.getElementById('e-total').textContent,
  why: document.getElementById('e-why').textContent,
}))()`);
console.log('空状态数字', JSON.stringify(out.emptyFacts));

writeFileSync(`${OUT}/tpl-audit/live-assertions.json`, JSON.stringify(out, null, 1), 'utf8');
await b.close(); server.close();
