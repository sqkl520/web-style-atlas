// S13 几何独立核实：栏宽 / 正文实测宽 / 每屏填充率 / 空白带在哪
import { Browser, serve, openPage, settle } from './lib-exec.mjs';

const srv = await serve();
const browser = await Browser.launch({ width: 1440, height: 900 });
const page = await openPage(browser, { width: 1440, height: 900 });
await page.goto(srv.url('prototypes/S13-blind-debossed-dispatch/index.html'), { timeoutMs: 30000, settleMs: 900 });
await settle(page, 2000);

const geo = await page.eval(`(() => {
  const R = (el) => { const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), right: +r.right.toFixed(2) }; };
  const q = (s) => document.querySelector(s);
  const dossier = q('.dossier');
  const cs = getComputedStyle(dossier);
  const cols = cs.gridTemplateColumns.split(' ').map(Number);
  const gap = parseFloat(cs.columnGap);
  const out = {
    viewport: { w: innerWidth, h: innerHeight },
    dossier: { ...R(dossier), cols: cols.length, colW: cols[0], gap, template: cs.gridTemplateColumns },
    computedSum16: cols.length === 16 ? +(cols.reduce((a, b) => a + b, 0) + gap * 15).toFixed(2) : null,
    series: {},
  };
  for (const sel of ['.clauses', '.clause', '.clause__body', '.clause__head', '.signature', '.annex', '.annex__table', '.levels', '.levels__lead', '.levels__note', '.plates', '.plates__lead', '.plates__grid', '.log', '.log__empty', '.colophon', '.colophon__line', '.pressline']) {
    const el = q(sel);
    if (!el) { out.series[sel] = null; continue; }
    const r = R(el);
    const s = getComputedStyle(el);
    out.series[sel] = { ...r, maxWidth: s.maxWidth, fontSize: s.fontSize, ml: s.marginLeft, mr: s.marginRight };
  }
  // 11 栏的宽度（clauses 的 grid-column 1/span 11）
  out.clauses11 = +(cols.slice(0, 11).reduce((a, b) => a + b, 0) + gap * 10).toFixed(2);
  // 每屏：哪些块落在这一屏里
  const H = innerHeight;
  const blocks = [...document.querySelectorAll('main > *, main section, footer')]
    .map((el) => ({ sel: el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0], ...R(el) }))
    .filter((b) => b.h > 20);
  out.screens = [];
  const pageH = document.documentElement.scrollHeight;
  const n = Math.ceil(pageH / H);
  for (let i = 0; i < n; i++) {
    const top = i * H, bot = top + H;
    out.screens.push({
      i: i + 1,
      top, bot,
      blocks: blocks.filter((b) => b.y < bot && b.y + b.h > top).map((b) => b.sel + '@' + Math.round(b.y) + '+' + Math.round(b.h)),
    });
  }
  out.pageH = pageH;
  out.screensN = n;
  return out;
})()`);

console.log(JSON.stringify(geo, null, 1));

// 独立算每屏填充率（复刻 frame() 的 24×15 采样）
const filled = {};
for (let i = 0; i < geo.screensN; i++) {
  const y = i * 900;
  await page.eval(`window.scrollTo({top:${y},behavior:'instant'})`);
  await new Promise((r) => setTimeout(r, 260));
  filled[i + 1] = await page.eval(`(() => {
    const W = innerWidth, H = innerHeight;
    const opaque = (c) => c && c !== 'transparent' && !/rgba\\([^)]*,\\s*0\\)$/.test(c);
    const pageBg = [document.body, document.documentElement].map(e => getComputedStyle(e).backgroundColor).find(opaque) || 'rgb(255,255,255)';
    const textRects = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const rg = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.nodeValue.trim() || !n.parentElement) continue;
      const pcs = getComputedStyle(n.parentElement); if (pcs.visibility === 'hidden' || +pcs.opacity < 0.2) continue;
      rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.bottom > 0 && r.top < H && r.width > 1) textRects.push(r);
    }
    let f = 0, s = 0; const bare = [];
    for (let gx = 0; gx < 24; gx++) for (let gy = 0; gy < 15; gy++) {
      const x = (gx + 0.5) * (W / 24), y = (gy + 0.5) * (H / 15); s++;
      if (textRects.some(r => x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 4 && y <= r.bottom + 4)) { f++; continue; }
      let el = document.elementFromPoint(x, y); let hit = false;
      for (let k = 0; el && k < 6 && el !== document.body && el !== document.documentElement; k++, el = el.parentElement) {
        if (/^(IMG|VIDEO|CANVAS|PICTURE|svg|IFRAME)$/.test(el.tagName) || el.closest('svg')) { hit = true; break; }
        const cs2 = getComputedStyle(el);
        if (cs2.backgroundImage !== 'none') { hit = true; break; }
        const bg = cs2.backgroundColor; if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { if (bg !== pageBg) hit = true; break; }
      }
      if (hit) f++; else bare.push([Math.round(x), Math.round(y)]);
    }
    // 空白采样点的 x 分布
    const xs = bare.map(b => b[0]);
    return { filled: Math.round((f / s) * 100) / 100, bareN: bare.length, bareX: xs.length ? { min: Math.min(...xs), max: Math.max(...xs) } : null };
  })()`);
}
console.log('\n填充率（复刻 frame()）:', JSON.stringify(filled, null, 1));

await browser.close();
srv.server.close();
