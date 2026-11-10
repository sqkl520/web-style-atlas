// 关键场景的"用户实际看到什么"：位置测量 + 截图。
import http from 'node:http';
import { readFileSync, existsSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const OUT = 'D:/Web/style/deliverables/66-audit';
const SHOTS = `${OUT}/shots`;
mkdirSync(SHOTS, { recursive: true });
const PORT = 9592;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  let f = join(ROOT, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const browser = await Browser.launch({ width: 1440, height: 900 });
const page = await browser.newPage({ width: 1440, height: 900 });
await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html`, { settleMs: 2200 });

const MEASURE = `(() => {
  const r = (id) => { const el = document.getElementById(id); if (!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { hidden: el.hidden, display: cs.display, top: Math.round(b.top + scrollY), h: Math.round(b.height), inFirstScreen: b.top < innerHeight && b.bottom > 0 }; };
  const q = (s) => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), h: Math.round(b.height), inFirstScreen: b.top < innerHeight && b.bottom > 0 }; };
  return {
    scrollY: Math.round(scrollY), vh: innerHeight,
    count: (document.getElementById('count')||{}).textContent,
    empty: r('empty'), emptyTpl: r('empty-tpl'), strip: r('tpl-strip'),
    firstTplCard: q('#empty-tpl .tpl-card') || q('#tpl-cards .tpl-card'),
    ledger: q('#ledger'),
    tplExit: q('#tpl-exit'),
    emptyHead: (document.querySelector('.tpl-empty-head')||{}).textContent || '',
    emptyAll: (document.querySelector('.tpl-empty-all')||{}).textContent || '',
  };
})()`;

async function reset() {
  await page.eval(`(() => { document.getElementById('reset').click(); })()`);
  await sleep(200);
}

const results = {};

async function shot(name, { search, chip, expandMore, scrollToTpl } = {}) {
  await reset();
  if (expandMore) {
    await page.eval(`(() => { const t = document.querySelector('.scene-toggle'); if (t) t.click(); })()`);
    await sleep(250);
  }
  if (search) {
    await page.eval(`(() => { const q = document.getElementById('q'); q.value = ${JSON.stringify(search)}; q.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await sleep(300);
  }
  if (chip) {
    await page.eval(`(() => { const b = document.querySelector('[data-scene="' + ${JSON.stringify(chip)} + '"]'); if (b) b.click(); })()`);
    await sleep(300);
  }
  const m = await page.eval(MEASURE);
  await page.screenshot({ path: `${SHOTS}/${name}.png`, format: 'png' });
  await page.eval(`(() => { document.getElementById('reset').click(); scrollTo(0,0); })()`);
  await sleep(200);
  results[name] = m;
  return m;
}

console.log('--- 搜「餐厅」首屏 ---');
console.log(JSON.stringify(await shot('01-search-restaurant-initial', { search: '餐厅' }), null, 1));

// 滚到模板块，看用户要滚多少才看到 M02
await reset();
await page.eval(`(() => { const q = document.getElementById('q'); q.value = '餐厅'; q.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await sleep(300);
const scrollInfo = await page.eval(`(() => {
  const card = document.querySelector('#empty-tpl .tpl-card');
  if (!card) return null;
  const b = card.getBoundingClientRect();
  const abs = Math.round(b.top + scrollY);
  card.scrollIntoView({ block: 'start' });
  return { cardAbsTop: abs, scrollNeededPx: abs, screens: +(abs / innerHeight).toFixed(2) };
})()`);
await sleep(300);
await page.screenshot({ path: `${SHOTS}/02-search-restaurant-tpl-card-scrolled.png`, format: 'png' });
console.log('餐厅 M02 卡片位置:', JSON.stringify(scrollInfo));

const rest = [
  ['03-search-bar-no-template', { search: '酒吧' }],
  ['04-search-dessert-adjacent', { search: '甜品' }],
  ['05-search-ecommerce-none', { search: '电商' }],
  ['06-search-portfolio-adjacent', { search: '作品集' }],
  ['07-chip-restaurant-strip', { chip: '餐厅' }],
  ['08-chip-coffeeshop-strip', { chip: '咖啡店' }],
  ['09-search-dessert-tpl-scrolled', { search: '甜品' }],
];
for (const [name, cfg] of rest) {
  const m = await shot(name, cfg);
  console.log(name, '|', m.count, '| emptyTpl', m.emptyTpl && m.emptyTpl.display, 'top', m.emptyTpl && m.emptyTpl.top, '| strip', m.strip && m.strip.display, 'top', m.strip && m.strip.top, '| inFirstScreen:', m.emptyTpl && m.emptyTpl.inFirstScreen, m.strip && m.strip.inFirstScreen);
}

// 白酒吧 也滚到卡片/空状态末尾，确认真实文案
await reset();
await page.eval(`(() => { const q = document.getElementById('q'); q.value = '酒吧'; q.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await sleep(300);
await page.eval(`(() => { const el = document.querySelector('.tpl-empty-head'); if (el) el.scrollIntoView({ block: 'center' }); })()`);
await sleep(250);
await page.screenshot({ path: `${SHOTS}/10-search-bar-empty-tpl-detail.png`, format: 'png' });

// 展开 unsupported 后仍不可见 —— 断言
await reset();
await page.eval(`(() => { const t = document.querySelector('.scene-toggle'); if (t) t.click(); })()`);
await sleep(300);
const uns = await page.eval(`(() => {
  const n = document.querySelector('.scene-unsupported');
  if (!n) return null;
  n.scrollIntoView({ block: 'center' });
  const b = n.getBoundingClientRect();
  return { display: getComputedStyle(n).display, inline: n.getAttribute('style'), rects: n.getClientRects().length, top: Math.round(b.top), text: n.textContent.slice(0,40) };
})()`);
await sleep(250);
await page.screenshot({ path: `${SHOTS}/11-rail-expanded-unsupported-invisible.png`, format: 'png' });
console.log('unsupported note:', JSON.stringify(uns));

// 芯片角标放大图：餐厅芯片（在 more 里）
await reset();
await page.eval(`(() => { const t = document.querySelector('.scene-toggle'); if (t) t.click(); })()`);
await sleep(250);
const badge = await page.eval(`(() => {
  const out = [];
  document.querySelectorAll('[data-scene]').forEach((b) => {
    const s = b.querySelector('.scene-tpl');
    if (s) out.push({ term: b.getAttribute('data-scene'), badge: s.textContent, title: b.title });
  });
  return out;
})()`);
console.log('带模板角标的芯片:', JSON.stringify(badge, null, 1));
await page.eval(`(() => { const b = document.querySelector('[data-scene="餐厅"]'); if (b) b.scrollIntoView({block:'center'}); })()`);
await sleep(200);
await page.screenshot({ path: `${SHOTS}/12-rail-chip-badges.png`, format: 'png', clip: { x: 0, y: 240, width: 340, height: 500 } });

// 向导：五问全答，看推荐里是否出现模板
const wz = await browser.newPage({ width: 1440, height: 900 });
await wz.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/wizard.html`, { settleMs: 1500 });
// 选「一屏说清 / 基本不用图 / 很安静 / 三秒知道点哪 / 怕做错」= 小生意站
for (const [q, v] of [['load', 0], ['img', 0], ['loud', 0], ['guide', 0], ['fear', 0]]) {
  await wz.eval(`(() => { const b = document.querySelector('.wz-q[data-q="${q}"] .wz-opts button[data-v="${v}"]'); if (b) b.click(); })()`);
  await sleep(200);
}
await sleep(500);
const wzOut = await wz.eval(`(() => {
  const pick = [...document.querySelectorAll('#wz-pick .wz-card .no')].map((e) => e.textContent);
  const avoid = [...document.querySelectorAll('#wz-avoid .wz-card .no')].map((e) => e.textContent);
  const html = document.getElementById('wz-out').innerHTML;
  return {
    pick, avoid,
    method: document.getElementById('wz-method').textContent.replace(/\\s+/g,' ').trim(),
    mentionsTpl: /M0[123]|模板/.test(html),
    mentionsScene: /场景|行业|餐厅|律所|咖啡/.test(html),
    sceneIds: pick.filter((x) => /^M/.test(x)).length,
  };
})()`);
console.log('向导五问结果:', JSON.stringify(wzOut, null, 1));
await wz.eval(`(() => { document.getElementById('wz-out').scrollIntoView({block:'start'}); })()`);
await sleep(300);
await wz.screenshot({ path: `${SHOTS}/13-wizard-result.png`, format: 'png' });

// 向导对"5 页小生意站"：把小生意答案再跑一次不同组合（要扎眼/三五屏）确认永远只有 S
for (const combo of [[1, 1, 1, 0, 0], [0, 0, 2, 0, 2], [2, 2, 2, 1, 2]]) {
  await wz.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/wizard.html?load=${combo[0]}&img=${combo[1]}&loud=${combo[2]}&guide=${combo[3]}&fear=${combo[4]}`, { settleMs: 900 });
  await sleep(400);
  const r = await wz.eval(`(() => [...document.querySelectorAll('#wz-pick .wz-card .no')].map((e)=>e.textContent))()`);
  console.log('combo', combo.join(''), '->', r.join(','));
}

writeFileSync(`${OUT}/tpl-audit/live-measure.json`, JSON.stringify(results, null, 1), 'utf8');
await browser.close();
server.close();
console.log('done');
