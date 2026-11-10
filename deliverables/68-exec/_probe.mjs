// A/B 实测探针（选型台）。
// 用法：node deliverables/68-exec/_probe.mjs <label>
//   label 只用于输出/落盘文件名。默认读工作区里的 prototypes/_selection/。
// 起 http 服务，不用 file://（fetch 会 CORS 失败）。端口 8200+。
import { createServer } from 'node:http';
import { createReadStream, statSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, extname, sep, relative } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = resolve('.');
const PORT = 8241;
const label = process.argv[2] || 'run';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};
const server = createServer((req, res) => {
  try {
    let f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': statSync(f).size, 'cache-control': 'no-store' });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}`;
const URL_SEL = `${BASE}/prototypes/_selection/`;
const URL_WZ = `${BASE}/prototypes/_selection/wizard.html`;

// 页内采集。sortKey 为 null 时不改排序。
const COLLECT = (sortKey) => {
  const q = (s) => document.querySelector(s);
  const rc = (e) => { const b = e.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1), w: +b.width.toFixed(1) }; };
  const out = {};
  if (sortKey) {
    const sel = q('#sort');
    if (sel && sel.value !== sortKey) { sel.value = sortKey; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  scrollTo(0, 0);
  const rows = [...document.querySelectorAll('.ledger .row')];
  const vh = innerHeight;
  const boxes = rows.map(rc);
  out.sort = q('#sort') ? q('#sort').value : null;
  out.rowCount = rows.length;
  out.firstRowId = rows.length ? (rows[0].querySelector('.no')?.textContent || '').trim() : null;
  out.firstRowTop = boxes.length ? boxes[0].top : null;
  out.firstRowH = boxes.length ? boxes[0].h : null;
  out.firstRowBottom = boxes.length ? boxes[0].bottom : null;
  out.completeCards = boxes.filter((b) => b.top >= -0.5 && b.bottom <= vh + 0.5).length;
  out.partialCards = boxes.filter((b) => b.top < vh && b.bottom > vh).length;
  out.overX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  out.docH = document.documentElement.scrollHeight;
  out.vh = vh; out.vw = innerWidth;
  const h1 = q('h1');
  out.h1 = h1 ? { px: +parseFloat(getComputedStyle(h1).fontSize).toFixed(2), vw: +(parseFloat(getComputedStyle(h1).fontSize) / innerWidth * 100).toFixed(2), lines: Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight)), rect: rc(h1) } : null;
  out.mast = q('.mast') ? rc(q('.mast')) : null;
  out.rail = q('.rail') ? { ...rc(q('.rail')), position: getComputedStyle(q('.rail')).position, clientH: q('.rail').clientHeight, scrollH: q('.rail').scrollHeight } : null;
  out.detailHead = q('.detail-head') ? { position: getComputedStyle(q('.detail-head')).position } : null;
  out.detail = q('.detail') ? { position: getComputedStyle(q('.detail')).position, hidden: q('.detail').hidden } : null;
  out.bar = q('.bar') ? { ...rc(q('.bar')), position: getComputedStyle(q('.bar')).position } : null;
  out.sortSel = q('.sort') ? getComputedStyle(q('.bar')).display : null;
  // 页内 <13px 的实际渲染文本块（只报，不判）
  const tiny = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length) continue;
    const t = (el.textContent || '').trim(); if (!t) continue;
    const c = getComputedStyle(el); const s = parseFloat(c.fontSize);
    if (s && s < 13) tiny.push({ el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''), px: s, chars: t.length, text: t.slice(0, 24) });
  }
  out.renderedTinyText = tiny;
  return out;
};

const WZ_COLLECT = () => {
  const q = (s) => document.querySelector(s);
  const lab = q('.mast-kicker') || q('.mast-label') || q('.mast-id > p');
  const cs = lab ? getComputedStyle(lab) : null;
  return {
    labelClass: lab ? lab.className : null,
    labelText: lab ? lab.textContent.trim() : null,
    fontSize: cs ? cs.fontSize : null,
    textTransform: cs ? cs.textTransform : null,
    letterSpacing: cs ? cs.letterSpacing : null,
    color: cs ? cs.color : null,
    h1px: q('h1') ? parseFloat(getComputedStyle(q('h1')).fontSize) : null,
    overX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

const SIGNAL = () => {
  const q = (s) => document.querySelector(s);
  const lab = q('.mast-kicker') || q('.mast-label');
  const cs = lab ? getComputedStyle(lab) : null;
  return {
    labelClass: lab ? lab.className : null,
    labelText: lab ? lab.textContent.trim() : null,
    fontSize: cs ? cs.fontSize : null,
    textTransform: cs ? cs.textTransform : null,
    letterSpacing: cs ? cs.letterSpacing : null,
    rect: lab ? (() => { const b = lab.getBoundingClientRect(); return { top: +b.top.toFixed(1), h: +b.height.toFixed(1) }; })() : null,
  };
};

const browser = await Browser.launch({ width: 1440, height: 900 });
const data = { label, at: new Date().toISOString(), url: URL_SEL, runs: {} };

// 1440 / 390 基准
for (const vp of [{ k: '1440', w: 1440, h: 900, mobile: false, dsf: 1 }, { k: '390', w: 390, h: 844, mobile: true, dsf: 2 }, { k: '768', w: 768, h: 1024, mobile: false, dsf: 1 }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: vp.dsf, mobile: vp.mobile });
  await p.goto(URL_SEL, { settleMs: 1800 });
  await p.eval(`document.fonts.ready.then(() => true)`);
  const base = await p.eval(COLLECT, null);
  const five = {};
  for (const s of ['n', 'fr', 'thr', 'gate', 'built']) five[s] = await p.eval(COLLECT, s);
  // 回到默认排序再取信号色块
  await p.eval(COLLECT, 'n');
  const sig = await p.eval(SIGNAL);
  data.runs[vp.k] = { base, five, signal: sig, consoleErrors: p.consoleErrors.slice() };
  await p.close();
}

// 向导页
{
  const p = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await p.goto(URL_WZ, { settleMs: 1200 });
  data.runs.wizard1440 = await p.eval(WZ_COLLECT);
  await p.setViewport({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(URL_WZ, { settleMs: 1200 });
  data.runs.wizard390 = await p.eval(WZ_COLLECT);
  await p.close();
}

await browser.close();
server.close();

writeFileSync(join('deliverables', '68-exec', `probe-${label}.json`), JSON.stringify(data, null, 1));

const f = (n) => (n == null ? '—' : String(n));
for (const k of ['1440', '768', '390']) {
  const r = data.runs[k];
  console.log(`\n===== ${k} =====  sort=${f(r.base.sort)} rows=${r.base.rowCount}`);
  console.log(`  首卡 ${f(r.base.firstRowId)} top=${f(r.base.firstRowTop)} h=${f(r.base.firstRowH)} bottom=${f(r.base.firstRowBottom)} 完整=${r.base.completeCards} partial=${r.base.partialCards} ovX=${r.base.overX} docH=${r.base.docH}`);
  console.log(`  h1=${f(r.base.h1?.px)}px (${f(r.base.h1?.vw)}vw, ${r.base.h1?.lines} 行) mast=${f(r.base.mast?.h)} rail=${f(r.base.rail?.h)}(${r.base.rail?.position}) bar=${f(r.base.bar?.h)}(${r.base.bar?.position}) detailHead=${r.base.detailHead?.position}`);
  console.log(`  渲染中 <13px 文本块 = ${r.base.renderedTinyText.length}`);
  for (const s of ['n', 'fr', 'thr', 'gate', 'built']) {
    const x = r.five[s];
    console.log(`    排序 ${s.padEnd(5)} 首卡 ${f(x.firstRowId)} top=${f(x.firstRowTop)} h=${f(x.firstRowH)} bottom=${f(x.firstRowBottom)} 完整=${x.completeCards} ovX=${x.overX}`);
  }
  console.log(`  label: class="${r.signal.labelClass}" fs=${r.signal.fontSize} tt=${r.signal.textTransform} ls=${r.signal.letterSpacing} h=${r.signal.rect?.h}`);
}
console.log(`\nwizard1440: ${JSON.stringify(data.runs.wizard1440)}`);
console.log(`wizard390 : ${JSON.stringify(data.runs.wizard390)}`);
console.log(`\nwritten deliverables/68-exec/probe-${label}.json`);
