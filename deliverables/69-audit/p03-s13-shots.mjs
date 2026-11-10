// 只读审计探针：为 S13 拍照 + 量每一屏的内容构成
// 用法：node p03-s13-shots.mjs
import { createServer } from 'node:http';
import { createReadStream, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = resolve('D:/Web/style/prototypes/S13-blind-debossed-dispatch');
const OUT = resolve('D:/Web/style/deliverables/69-audit/shots');
mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.txt': 'text/plain; charset=utf-8' };

const PORT = 8713;
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
const url = `http://127.0.0.1:${PORT}/index.html`;

const browser = await Browser.launch({ width: 1440, height: 900 });
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
await page.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
await page.goto(url, { timeoutMs: 30000, settleMs: 600 });
await page.eval('document.fonts.ready.then(() => true)');
await sleep(1500);

// 每一屏按 inspect.mjs:538 的同一采样网格算填充率，并额外报告"这块地上有什么"
const GRID = `(() => {
  const W = innerWidth, H = innerHeight;
  const opaque = (c) => c && c !== 'transparent' && !/rgba\\([^)]*,\\s*0\\)$/.test(c);
  const pageBg = [document.body, document.documentElement].map((e) => getComputedStyle(e).backgroundColor).find(opaque) || 'rgb(255,255,255)';
  const textRects = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const rg = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim() || !n.parentElement) continue;
    const pcs = getComputedStyle(n.parentElement); if (pcs.visibility === 'hidden' || +pcs.opacity < 0.2) continue;
    rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.bottom > 0 && r.top < H && r.width > 1) textRects.push(r);
  }
  let filled = 0, samples = 0; const kinds = { text: 0, media: 0, ground: 0, bare: 0 };
  for (let gx = 0; gx < 24; gx++) for (let gy = 0; gy < 15; gy++) {
    const x = (gx + 0.5) * (W / 24), y = (gy + 0.5) * (H / 15); samples++;
    if (textRects.some((r) => x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 4 && y <= r.bottom + 4)) { filled++; kinds.text++; continue; }
    let el = document.elementFromPoint(x, y); let hit = null;
    for (let i = 0; el && i < 6 && el !== document.body && el !== document.documentElement; i++, el = el.parentElement) {
      if (/^(IMG|VIDEO|CANVAS|PICTURE|svg|IFRAME)$/.test(el.tagName) || el.closest('svg')) { hit = 'media'; break; }
      const cs = getComputedStyle(el);
      if (cs.backgroundImage !== 'none') { hit = 'media'; break; }
      const bg = cs.backgroundColor; if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { if (bg !== pageBg) hit = 'ground'; break; }
    }
    if (hit === 'media') { filled++; kinds.media++; } else if (hit === 'ground') { filled++; kinds.ground++; } else kinds.bare++;
  }
  return { filled: Math.round((filled / samples) * 100) / 100, screens: Math.round(samples), kinds, y: Math.round(scrollY), pageBg };
})()`;

// 每个顶层 section 的几何，用来把"空屏"对上具体章节
const SECTIONS = `(() => [...document.querySelectorAll('body > *, main > *, .dossier > *')].map((el) => {
  const r = el.getBoundingClientRect();
  return { sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.') : ''), top: Math.round(r.top + scrollY), h: Math.round(r.height), area: Math.round(r.width * r.height) };
}).filter((o) => o.h > 40))()`;

await page.eval('window.scrollTo({top:0,behavior:"instant"})');
await sleep(400);
const sections = await page.eval(SECTIONS);

const rows = [];
for (let i = 0; i <= 5; i++) {
  await page.eval(`window.scrollTo({top:${i * 900},behavior:'instant'})`);
  await sleep(700);
  const g = await page.eval(GRID);
  // 该屏内顶部的文字（谁在这块地上）
  const txt = await page.eval(`(() => [...document.querySelectorAll('h1,h2,h3,p,li,dt,dd,figcaption')].map((el)=>{const r=el.getBoundingClientRect(); if(r.bottom<0||r.top>innerHeight||r.height===0) return null; const cs=getComputedStyle(el); return {t:(el.innerText||'').replace(/\\s+/g,' ').trim().slice(0,40), top:Math.round(r.top), size:parseFloat(cs.fontSize)};}).filter(Boolean).slice(0,7))()`);
  rows.push({ screen: i + 1, scrollY: g.y, filled: g.filled, kinds: g.kinds, text: txt });
  await page.screenshot({ path: join(OUT, `S13-screen-${String(i + 1).padStart(2, '0')}.png`) });
}

// 3 倍放大：单条条款的盲压凹槽 + .depth 的 DM Mono 实测值
await page.eval('window.scrollTo({top:0,behavior:"instant"})');
await sleep(300);
await page.setViewport({ width: 1440, height: 900, mobile: false, dsf: 3 });
await sleep(600);
await page.screenshot({ path: join(OUT, 'S13-clause-3x.png'), clip: { x: 0, y: 0, width: 1440, height: 620, scale: 1 } });
await page.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
await sleep(400);

// 量 mono 的实际挂载点：哪些元素、几处、多少字符、各说什么
const mono = await page.eval(`(() => {
  const isMono = (ff) => /mono|DM Mono|Plex Mono/i.test(ff);
  const out = [];
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (!isMono(cs.fontFamily)) continue;
    let direct = ''; for (const n of el.childNodes) if (n.nodeType === 3) direct += n.nodeValue;
    if (!direct.trim()) continue;
    out.push({ tag: el.tagName.toLowerCase(), cls: el.className, text: direct.replace(/\\s+/g,' ').trim().slice(0,40), chars: direct.trim().length, inCode: !!el.closest('pre, code, kbd, samp, textarea') });
  }
  return out;
})()`);

const out = { url, sections, rows, mono };
writeFileSync('D:/Web/style/deliverables/69-audit/s13-probe.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify({ sections, rows: rows.map((r) => ({ screen: r.screen, filled: r.filled, kinds: r.kinds })), monoCount: mono.length, mono: mono }, null, 1));

await browser.close();
server.close();
