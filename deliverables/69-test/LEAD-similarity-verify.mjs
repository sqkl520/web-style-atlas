// 核实两个异常信号：(1) 字号相似度≈0 是不是真的 (2) S28 色板 0 是不是真的
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, u);
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(8571, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });

// ---- 信号 1：字号分布（用「字符数」而不是「元素面积」加权，更准）----
console.log('=== 信号 1：按字符数加权的字号分布 ===');
for (const [id, label] of [['S20', 'S20'], ['S21', 'S21'], ['S28', 'S28']]) {
  const dirs = readdirSync(join(ROOT, 'prototypes')).filter(d => d.startsWith(id + '-'));
  for (const [tag, url] of [
    ['原型', `http://127.0.0.1:8571/prototypes/${dirs[0]}/index.html`],
    ['实现', `http://127.0.0.1:8571/deliverables/69-test/${id}/index.html`],
  ]) {
    await page.goto(url, { settleMs: 2000 });
    const o = await page.eval(`(() => {
      const bySize = {};
      let total = 0;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = n.nodeValue; if (!t || !t.trim()) continue;
        const el = n.parentElement; if (!el) continue;
        const tag = el.tagName.toLowerCase();
        if (/^(script|style)$/.test(tag)) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const chars = t.trim().length;
        const fs = Math.round(parseFloat(cs.fontSize));
        bySize[fs] = (bySize[fs]||0) + chars;
        total += chars;
      }
      const out = {};
      for (const [k,v] of Object.entries(bySize)) out[k] = +(v/total*100).toFixed(1);
      return { dist: out, total, sizesRange: [Math.min(...Object.keys(bySize).map(Number)), Math.max(...Object.keys(bySize).map(Number))] };
    })()`);
    console.log(`  ${label} ${tag}: 字号范围 ${o.sizesRange[0]}–${o.sizesRange[1]}px  总字符 ${o.total}`);
    console.log(`        ${JSON.stringify(Object.entries(o.dist).sort((a,b)=>b[1]-a[1]).slice(0,6))}`);
  }
}

// ---- 信号 2：S28 的色板占比（按元素面积，排除图片）----
console.log('\n\n=== 信号 2：S28 色板占比（元素面积，排除 img/video/背景图）===');
const dirs28 = readdirSync(join(ROOT, 'prototypes')).filter(d => d.startsWith('S28-'));
for (const [tag, url] of [
  ['原型', `http://127.0.0.1:8571/prototypes/${dirs28[0]}/index.html`],
  ['实现', `http://127.0.0.1:8571/deliverables/69-test/S28/index.html`],
]) {
  await page.goto(url, { settleMs: 2200 });
  const o = await page.eval(`(() => {
    const toHex = (s) => { const m = s && s.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/); if (!m) return null; const h=n=>(+n).toString(16).padStart(2,'0'); return ('#'+h(m[1])+h(m[2])+h(m[3])).toUpperCase(); };
    const area = {}; let total = 0;
    for (const el of document.querySelectorAll('body, body *')) {
      if (el.tagName === 'IMG' || el.tagName === 'VIDEO' || el.tagName === 'svg' || el.closest('svg')) continue;
      const cs = getComputedStyle(el);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') continue;   // 背景图跳过
      const bg = cs.backgroundColor;
      if (!bg || /rgba\\(0, 0, 0, 0\\)|transparent/.test(bg)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const a = r.width * r.height;
      const h = toHex(bg); if (!h) continue;
      area[h] = (area[h]||0) + a; total += a;
    }
    const pct = {};
    for (const [k,v] of Object.entries(area)) pct[k] = +(v/total*100).toFixed(1);
    return { pct: Object.entries(pct).sort((a,b)=>b[1]-a[1]).slice(0,6), total: Math.round(total) };
  })()`);
  console.log(`  ${tag}: ${JSON.stringify(o.pct)}  (总面积 ${o.total})`);
}

// ---- 信号 3：提示词里有没有字号规格 ----
console.log('\n\n=== 信号 3：提示词有没有给字号 ===');
const p20 = readFileSync(join(ROOT, 'deliverables/69-plan/dump/S20.txt'), 'utf8');
const p28 = readFileSync(join(ROOT, 'deliverables/69-plan/dump/S28.txt'), 'utf8');
for (const [id, p] of [['S20', p20], ['S28', p28]]) {
  const hasSize = /字号|font-size|px 的?字|磅/i.test(p);
  const pxMentions = (p.match(/(\d+(?:\.\d+)?)px/g) || []);
  console.log(`  ${id}: 提到「字号/font-size」= ${hasSize}；全文 px 值 ${pxMentions.length} 个: ${JSON.stringify([...new Set(pxMentions)].slice(0, 12))}`);
}

// ---- 信号 4：S28 提示词的配色行 ----
console.log('\n=== 信号 4：S28 提示词的配色与面积说明 ===');
const ci = p28.indexOf('配色');
console.log(p28.slice(ci, ci + 300));

await browser.close();
server.close();
