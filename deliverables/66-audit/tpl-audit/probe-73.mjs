// 73 个行业词 × 两条入口（搜索框 / 场景芯片）的实测探针。
// 只读：起一个静态服务器读仓库，不写 prototypes/ 或 templates/。
import http from 'node:http';
import { readFileSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const OUT = 'D:/Web/style/deliverables/66-audit';
const PORT = 9591;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.md': 'text/markdown; charset=utf-8',
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

const terms = JSON.parse(readFileSync(`${OUT}/tpl-audit/static-map.json`, 'utf8')).rows
  .map((r) => ({ term: r.term, inIndex: r.inIndex }));

const browser = await Browser.launch({ width: 1440, height: 900 });
const page = await browser.newPage({ width: 1440, height: 900 });
await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/index.html`, { settleMs: 2000 });

const READ = `(() => {
  const t = (id) => { const el = document.getElementById(id); return el ? el.textContent.replace(/\\s+/g, ' ').trim() : null; };
  const vis = (id) => { const el = document.getElementById(id); if (!el || el.hidden) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length > 0; };
  const cards = [...document.querySelectorAll('#tpl-cards .tpl-card, #empty-tpl .tpl-card')].map(c => ({
    id: c.getAttribute('data-tpl'),
    scenes: (c.querySelector('.tpl-scenes') || {}).textContent || '',
    why: (c.querySelector('.tpl-why') || {}).textContent || '',
    desc: (c.querySelector('.tpl-desc') || {}).textContent || '',
  }));
  const strip = document.getElementById('tpl-strip');
  const sRect = strip && !strip.hidden ? strip.getBoundingClientRect() : null;
  const empty = document.getElementById('empty');
  return {
    count: t('count'),
    rows: document.querySelectorAll('#ledger .row').length,
    emptyVisible: !!(empty && !empty.hidden),
    emptyText: empty && !empty.hidden ? empty.textContent.replace(/\\s+/g, ' ').trim() : '',
    stripVisible: vis('tpl-strip'),
    stripLead: t('tpl-strip-lead'),
    stripTop: sRect ? Math.round(sRect.top) : null,
    stripBottom: sRect ? Math.round(sRect.bottom) : null,
    emptyTplVisible: vis('empty-tpl'),
    emptyTpl: vis('empty-tpl') ? document.getElementById('empty-tpl').textContent.replace(/\\s+/g, ' ').trim() : '',
    cards,
    unsupportedNoteVisible: (() => { const n = document.querySelector('.scene-unsupported'); if (!n) return null; const cs = getComputedStyle(n); return cs.display !== 'none' && n.getClientRects().length > 0; })(),
    sceneMoreShown: (() => { const m = document.querySelector('.scene-more'); return m ? getComputedStyle(m).display !== 'none' : null; })(),
    tplExitText: t('tpl-exit'),
  };
})()`;

async function reset() {
  await page.eval(`(() => { document.getElementById('reset').click(); })()`);
  await sleep(180);
}

async function doSearch(term) {
  await reset();
  await page.eval(`(() => {
    const q = document.getElementById('q');
    q.value = ${JSON.stringify(term)};
    q.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(180);
  return page.eval(READ);
}

async function doChip(term) {
  await reset();
  const meta = await page.eval(`(() => {
    const b = document.querySelector('[data-scene="' + ${JSON.stringify(term)} + '"]');
    if (!b) return null;
    const more = b.closest('.scene-more');
    return { inMore: !!more, badge: (b.querySelector('.scene-tpl') || {}).textContent || '', title: b.title, pressed: b.getAttribute('aria-pressed') };
  })()`);
  if (!meta) return { chipMissing: true };
  // 用户要先点开「还有 28 个只有近似的 →」才看得到这些芯片；探针只点存在的元素，不替用户展开。
  await page.eval(`(() => { document.querySelector('[data-scene="' + ${JSON.stringify(term)} + '"]').click(); })()`);
  await sleep(200);
  const r = await page.eval(READ);
  return { ...meta, ...r };
}

const out = { searched: {}, chipped: {}, order: [] };
for (const { term, inIndex } of terms) {
  out.order.push(term);
  out.searched[term] = await doSearch(term);
  if (inIndex) out.chipped[term] = await doChip(term);
  process.stdout.write('.');
}
process.stdout.write('\n');

// 额外：把 unsupported 名单展开后，看那 29 个词到底可不可见
await reset();
await page.eval(`(() => { const t = document.querySelector('.scene-toggle'); if (t) t.click(); })()`);
await sleep(250);
out.unsupportedAfterExpand = await page.eval(`(() => {
  const n = document.querySelector('.scene-unsupported');
  return n ? {
    inlineStyle: n.getAttribute('style'),
    display: getComputedStyle(n).display,
    rects: n.getClientRects().length,
    text: n.textContent.replace(/\\s+/g, ' ').trim().slice(0, 80),
    parentDisplay: getComputedStyle(n.parentElement).display,
  } : null;
})()`);

writeFileSync(`${OUT}/tpl-audit/live-73.json`, JSON.stringify(out, null, 1), 'utf8');

// 控制台摘要
const s = out.searched;
const zero = Object.keys(s).filter((t) => s[t].rows === 0);
console.log('terms:', terms.length, '| search 0 rows:', zero.length);
console.log('search 0 rows AND no template mentioned:', zero.filter((t) => !s[t].stripVisible && !s[t].emptyTplVisible).length);
console.log('search 0 rows BUT template block shown:', zero.filter((t) => s[t].emptyTplVisible).length);
console.log('unsupportedNoteVisible anywhere:', Object.keys(s).filter((t) => s[t].unsupportedNoteVisible));
console.log('afterExpand:', JSON.stringify(out.unsupportedAfterExpand));
for (const t of ['餐厅', '咖啡店', '烘焙', '甜品', '酒吧', '电商', '个人主页', '简历', '金融', '设计工作室', '作品集']) {
  const r = s[t];
  console.log('---', t, '| rows', r.rows, '|', r.count, '| strip', r.stripVisible, '| emptyTpl', r.emptyTplVisible);
  if (r.stripLead) console.log('  lead:', r.stripLead);
  if (r.emptyTpl) console.log('  emptyTpl:', r.emptyTpl.slice(0, 260));
  if (out.chipped[t]) console.log('  chip rows:', out.chipped[t].rows, '| badge:', out.chipped[t].badge, '| inMore:', out.chipped[t].inMore);
}

await browser.close();
server.close();
